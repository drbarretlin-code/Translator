import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const PORT = 3000;

  // Simple in-memory cache fallback
  const translationCache = new Map<string, string>();

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    
    socket.on("translate", async (data) => {
      const { text, targetLang, apiKey, transcriptId } = data;
      
      const cacheKey = `translation:${targetLang}:${text}`;
      
      if (translationCache.has(cacheKey)) {
        console.log("In-memory cache hit for:", text);
        socket.emit("translation chunk", { chunk: translationCache.get(cacheKey), transcriptId });
        socket.emit("translation end", { transcriptId });
        return;
      }

      const translateWithModel = async (modelName: string) => {
        const ai = new GoogleGenAI({ apiKey });
        return await ai.models.generateContentStream({
          model: modelName,
          contents: `Translate the following text to ${targetLang}. Output ONLY the translated text, do not include any explanations, notes, or multiple options: "${text}"`
        });
      };

      try {
        let fullTranslation = "";
        const resultStream = await translateWithModel("gemini-2.5-flash");
        for await (const chunk of resultStream) {
          const textChunk = chunk.text;
          if (textChunk) {
            fullTranslation += textChunk;
            socket.emit("translation chunk", { chunk: textChunk, transcriptId });
          }
        }
        
        translationCache.set(cacheKey, fullTranslation);
        
        socket.emit("translation end", { transcriptId });
      } catch (error) {
        console.error("Translation error (flash):", error);
        try {
          let fullTranslation = "";
          const resultStream = await translateWithModel("gemini-2.5-pro");
          for await (const chunk of resultStream) {
            const textChunk = chunk.text;
            if (textChunk) {
              fullTranslation += textChunk;
              socket.emit("translation chunk", { chunk: textChunk });
            }
          }
          
          translationCache.set(cacheKey, fullTranslation);
          
          socket.emit("translation end");
        } catch (fallbackError) {
          console.error("Translation error (pro):", fallbackError);
          socket.emit("translation error", { error: "Translation failed" });
        }
      }
    });

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room: ${roomId}`);
    });

    socket.on("yjs-update", ({ roomId, update }) => {
      // Broadcast Yjs updates to all other clients in the same room
      socket.to(roomId).emit("yjs-update", update);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
