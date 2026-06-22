import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

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

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8181;

  // Set body parser limits to allow base64 images for multimodal chat features
  app.use(express.json({ limit: "15mb" }));

  // API Route for classifying user query into standard PersonaId (assistant, creative, developer, socratic)
  app.post("/api/classify", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string") {
        return res.json({ personaId: "assistant" });
      }

      const classificationPrompt = `
You are a highly analytical query routing engine for a multi-agent chat workspace.
Given the user's input, classify it into the most relevant agent persona category.

The agent categories are:
1. "assistant" — Aura (Productivity Companion): best for text summarization, professional emails, language translation, checklists, travel or study itineraries, general planning, math, and general questions.
2. "creative" — Muse (Creative Collaborator): best for poems, lyrics, roleplay, creative brainstorming, storytelling, brand naming, sci-fi/fantasy queries, or emotional, metaphorical, or lyrical requests.
3. "developer" — Compiler (Code Wizard): best for software engineering, frontend/backend, formatting JSON, SQL queries, debugging code, explaining algorithms, git commands, script writing, CSS layouts, or general IT inquiries.
4. "socratic" — Athena (Socratic Mentor): best for philosophical contemplation, ethical trade-offs, historical thoughts, logic puzzles, psychology, morals, meaning of life, and open-ended thought experiments.

Your answer must contain ONLY the category key word string: "assistant", "creative", "developer", or "socratic" (plain text, no quotes).
Do NOT include any introduction, explanations, punctuation, markdown blocks, formatting, or extra context.

User Input: "${text.replace(/"/g, '\\"')}"
Output:`;

      let answer = "";
      if (process.env.GROQ_API_KEY) {
        try {
          console.log("Classifying query with Groq...");
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [{ role: "user", content: classificationPrompt }],
              temperature: 0.1,
              max_tokens: 10
            })
          });

          if (groqRes.ok) {
            const data: any = await groqRes.json();
            answer = (data.choices?.[0]?.message?.content || "").trim().toLowerCase();
            console.log("Groq classification result:", answer);
          } else {
            const errText = await groqRes.text();
            console.warn(`Groq classification error (status ${groqRes.status}): ${errText}`);
          }
        } catch (groqErr) {
          console.error("Groq classification failed, falling back to Gemini:", groqErr);
        }
      }

      if (!answer && process.env.GEMINI_API_KEY) {
        try {
          console.log("Falling back to Gemini for classification...");
          const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build",
              }
            }
          });
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: classificationPrompt }] }],
            config: {
              temperature: 0.1,
              maxOutputTokens: 10,
            }
          });
          answer = (response.text || "").trim().toLowerCase();
          console.log("Gemini classification result:", answer);
        } catch (geminiErr) {
          console.error("Gemini classification failed:", geminiErr);
        }
      }

      let personaId = "assistant";
      if (answer.includes("creative")) personaId = "creative";
      else if (answer.includes("developer")) personaId = "developer";
      else if (answer.includes("socratic")) personaId = "socratic";

      return res.json({ personaId });
    } catch (error: any) {
      console.error("Error in /api/classify:", error);
      return res.json({ personaId: "assistant" }); // Fail-safe default
    }
  });

  // API Route for Chat
  app.post("/api/chat", async (req, res) => {
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
  });

  // Serve static assets / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((e) => {
  console.error("Failed to start server", e);
});
