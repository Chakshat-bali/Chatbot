import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set body parser limits to allow base64 images for multimodal chat features
  app.use(express.json({ limit: "15mb" }));

  // API Route for classifying user query into standard PersonaId (assistant, creative, developer, socratic)
  app.post("/api/classify", async (req, res) => {
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

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: classificationPrompt }] }],
        config: {
          temperature: 0.1,
          maxOutputTokens: 10,
        }
      });

      const answer = (response.text || "").trim().toLowerCase();
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
