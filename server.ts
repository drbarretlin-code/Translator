import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import dotenv from "dotenv";

// 載入環境變數並覆蓋現有的 (以確保拿到最新的 API Key)
dotenv.config({ override: true });

// 延遲初始化 Gemini API 客戶端
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("API Key from env:", apiKey ? apiKey.substring(0, 5) + "..." : "undefined");
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error(`請在 AI Studio 的 Secrets 面板中設定有效的 GEMINI_API_KEY。`);
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  // 初始化 Socket.io，允許跨域請求
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });
  
  const PORT = 3000;

  // 處理 Socket.io 連線
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // 監聽來自前端的翻譯請求
    socket.on("translate_request", async (data) => {
      const { text, sourceLang, targetLang, id, history } = data;
      
      try {
        const ai = getAIClient();
        
        // 呼叫 Gemini Flash 模型以達到即時極速翻譯
        const systemInstruction = `Version: v1.2
Role: 專業多國語言即時精準口譯專家
Description: 具備豐富跨國會議、高階商業談判與外交場合經驗的頂級口譯員。能即時、精確且流暢地在多國語言之間進行雙向轉換。
Core_Rules:
  1_Absolute_Accuracy: 
    - 翻譯必須忠於原意。
  2_Context_and_Culture: 
    - 翻譯時需考量目標語言的文化習慣，將生硬的直譯轉化為符合當地母語人士表達習慣的自然用語。
  3_Contextual_Correction (Critical):
    - 語音辨識（STT）常有同音異字或辨識錯誤。請務必參考提供的「[Context History] 對話歷史上下文」。
    - 若發現當前輸入的語句與上下文語意完全沒有連貫性，或出現明顯的語音辨識錯誤，請自動依據上下文邏輯與目標語言國家的習慣用語，推斷並「修正」原意後，再進行翻譯。
  4_Direct_Output: 
    - 模擬即時口譯的極高效率，直接輸出翻譯結果。
    - 絕對禁止加入任何解釋、註解、括號說明（如 [註：...]）或對話機器人的過渡語。只能輸出純粹的翻譯結果。
Workflow:
  Step_1_Context_Analysis: 閱讀對話歷史，理解當前對話情境。
  Step_2_Error_Correction: 檢查當前輸入句是否有語音辨識錯誤，若有則依上下文修正。
  Step_3_Translation: 執行精準翻譯，並確保符合目標語言的邏輯。
  Step_4_Output: 直接給出翻譯結果，不帶任何其他文字。
Constraints_and_Edge_Cases:
  - 遇到無法直譯的內容時，直接使用目標語言中最通用的表達方式，絕對不允許加上任何括號或註解說明。
  - 若輸入句子因省略主詞或上下文而產生嚴重歧義，請預設採用最常見的通用/商務情境進行翻譯。`;

        let prompt = `[Target Language: ${targetLang}]\n\n`;
        if (history && history.length > 0) {
          prompt += `[Context History]\n`;
          history.forEach((h: any, index: number) => {
            prompt += `Previous Sentence ${index + 1}: ${h.original}\n`;
          });
          prompt += `\n`;
        }
        prompt += `[Current Speech to Translate]\n${text}`;

        const responseStream = await ai.models.generateContentStream({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.3, // 較低的溫度以確保翻譯的準確性與一致性
          }
        });
        
        let fullTranslation = "";
        for await (const chunk of responseStream) {
          const chunkText = chunk.text || "";
          fullTranslation += chunkText;
          socket.emit("translate_stream", {
            id,
            translated: fullTranslation
          });
        }
        
        // 將最終翻譯結果推播回前端
        socket.emit("translate_response", {
          id,
          original: text,
          translated: fullTranslation,
          status: "success"
        });
      } catch (error: any) {
        console.error("Translation API error:", error);
        
        // 判斷是否為 API Key 錯誤
        let errorMessage = "API 連線逾時或發生錯誤，請稍後再試。";
        if (error.message && error.message.includes("API key not valid")) {
          const apiKey = process.env.GEMINI_API_KEY;
          errorMessage = `API 金鑰無效，請檢查您的 GEMINI_API_KEY 設定。 (Current value: ${apiKey})`;
        } else if (error.message) {
          errorMessage = error.message;
        }

        // 發生錯誤時回傳錯誤訊息給前端
        socket.emit("translate_error", {
          id,
          error: errorMessage,
          status: "error"
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // API 路由 (健康檢查)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 整合 Vite 中介軟體 (開發環境) 或提供靜態檔案 (生產環境)
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

  // 啟動伺服器，必須綁定 0.0.0.0 與 Port 3000
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
