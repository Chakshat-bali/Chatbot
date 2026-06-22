import { GoogleGenAI } from "@google/genai";

// Helper to convert Gemini payload schema to OpenAI/Groq compatible chat messages schema
function convertGeminiToOpenAI(contents: any[], systemInstruction?: string) {
  const messages: any[] = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  for (const message of contents) {
    const role = message.role === "model" ? "assistant" : "user";
    let content = "";
    if (Array.isArray(message.parts)) {
      content = message.parts
        .map((part: any) => {
          if (part.text) return part.text;
          return "";
        })
        .join("\n")
        .trim();
    } else if (typeof message.parts === "string") {
      content = message.parts;
    }
    messages.push({ role, content });
  }
  return messages;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(401).json({
        error: "Gemini API key is not configured.",
        details: "Please verify that GEMINI_API_KEY is configured under your Settings > Secrets panel."
      });
    }

    const { contents, systemInstruction, enableSearch } = req.body;

    if (!contents || !Array.isArray(contents)) {
      return res.status(400).json({
        error: "Invalid request payload.",
        details: "'contents' is required and must be an array of chat messages following the Gemini API schema."
      });
    }

    // Check if there are any multimodal attachments (like PDFs or images) in the conversation history
    const hasAttachments = contents.some((msg: any) => 
      Array.isArray(msg.parts) && msg.parts.some((part: any) => part.inlineData)
    );

    let responseText = "";
    let routedToGroq = false;

    // Route to Groq only if:
    // 1. GROQ_API_KEY is configured in the environment
    // 2. Google Search grounding is not requested (enableSearch is false)
    // 3. No attachments are present (since Groq free-tier chat APIs don't natively parse PDFs/images)
    if (process.env.GROQ_API_KEY && !enableSearch && !hasAttachments) {
      try {
        console.log("Routing query to Groq (Llama 3.3 70B)...");
        const openaiMessages = convertGeminiToOpenAI(contents, systemInstruction);

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-specdec",
            messages: openaiMessages,
            temperature: 0.7
          })
        });

        if (groqRes.ok) {
          const data: any = await groqRes.json();
          responseText = data.choices?.[0]?.message?.content || "";
          routedToGroq = true;
        } else {
          const errText = await groqRes.text();
          console.warn(`Groq API returned error status ${groqRes.status}: ${errText}. Falling back to Gemini.`);
        }
      } catch (groqErr) {
        console.error("Groq chat generation failed, falling back to Gemini:", groqErr);
      }
    }

    if (!routedToGroq) {
      console.log("Routing query to Gemini 2.5 Flash...");
      // Lazy load the Gemini client with appropriate headers for AI Studio environment
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      // Call Gemini 2.5 Flash - latest developer model supporting Google Search grounding natively
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: systemInstruction || undefined,
          tools: enableSearch ? [{ googleSearch: {} }] : undefined,
        },
      });

      // Extract groundingMetadata if returned by the search tool
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

      return res.json({ 
        text: response.text,
        groundingMetadata: groundingMetadata || null
      });
    }

    return res.json({ 
      text: responseText,
      groundingMetadata: null
    });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return res.status(500).json({
      error: "Failed to generate response with Gemini.",
      details: error.message || String(error),
    });
  }
}
