import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/ai/suggest", async (req, res) => {
    try {
      const { currentHabits, categories } = req.body;
      
      const prompt = `Based on these existing habits: ${JSON.stringify(currentHabits)} 
      and these categories: ${JSON.stringify(categories)}, 
      suggest 3 unique new habits that would complement this routine. 
      For each habit, provide a name, a category (from the list), and a brief description why it fits.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["name", "category", "description"]
            }
          }
        }
      });

      res.json(JSON.parse(response.text || "[]"));
    } catch (error) {
      console.error("AI Suggestion Error:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  app.post("/api/ai/advice", async (req, res) => {
    try {
      const { habits, streakInfo } = req.body;
      
      const prompt = `You are a mindful habit coach. Based on these habits: ${JSON.stringify(habits)} 
      and these current streaks: ${JSON.stringify(streakInfo)}, 
      provide one concise piece of motivational advice (max 2 sentences) and one suggestion for a small improvement.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              advice: { type: Type.STRING },
              suggestion: { type: Type.STRING }
            },
            required: ["advice", "suggestion"]
          }
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
      console.error("AI Advice Error:", error);
      res.status(500).json({ error: "Failed to generate advice" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
