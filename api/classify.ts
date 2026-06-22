import { GoogleGenAI } from "@google/genai";

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

    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.json({ personaId: "assistant" });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });

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
        } else {
          const errText = await groqRes.text();
          console.warn(`Groq classification error (status ${groqRes.status}): ${errText}`);
        }
      } catch (groqErr) {
        console.error("Groq classification failed, falling back to Gemini:", groqErr);
      }
    }

    if (!answer) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: classificationPrompt }] }],
        config: {
          temperature: 0.1,
          maxOutputTokens: 10,
        }
      });
      answer = (response.text || "").trim().toLowerCase();
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
}
