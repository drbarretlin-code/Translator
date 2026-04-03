import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Globe2, AlertCircle, Loader2, Languages, Settings, Key } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { cn } from './lib/utils';

// 定義支援的語言與腔調清單
const LANGUAGES = [
  { id: 'en-US', name: '美國英語 (US English)' },
  { id: 'en-GB', name: '英國英語 (UK English)' },
  { id: 'ja-JP', name: '日語 (Japanese)' },
  { id: 'fr-FR', name: '法語 (French)' },
  { id: 'th-TH', name: '泰語 (Thai)' },
  { id: 'vi-VN', name: '越南語 (Vietnamese)' },
  { id: 'id-ID', name: '印尼語 (Indonesian)' },
  { id: 'ms-MY', name: '馬來西亞語 (Malaysian)' },
  { id: 'zh-TW', name: '繁體中文 (Traditional Chinese)' },
];

// 定義對話紀錄的資料結構
interface Transcript {
  id: string;
  original: string;
  translated: string;
  isFinal: boolean;
  isTranslating: boolean;
  sourceLang: string;
  targetLang: string;
  error?: string;
}

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [targetLang, setTargetLang] = useState('th-TH');
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  // 用於處理合理延遲與緩衝記憶區的 Refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCommittedLengthRef = useRef<number>(0);
  const currentSessionTextRef = useRef<string>('');
  const currentTranscriptIdRef = useRef<string>('');
  const flushBufferRef = useRef<() => void>(() => {});
  
  const isRecordingRef = useRef<boolean>(false);
  const targetLangRef = useRef<string>(targetLang);
  const transcriptsRef = useRef<Transcript[]>([]);

  // 同步 state 到 ref，供事件回呼使用
  useEffect(() => {
    transcriptsRef.current = transcripts;
  }, [transcripts]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    targetLangRef.current = targetLang;
  }, [targetLang]);

  useEffect(() => {
    localStorage.setItem('gemini_api_key', userApiKey);
  }, [userApiKey]);

  // 自動滾動到最新對話
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // 執行翻譯 (直接在前端呼叫 Gemini API)
  const translateText = async (id: string, text: string, tgtLang: string) => {
    const tgtLangName = LANGUAGES.find(l => l.id === tgtLang)?.name || tgtLang;
    
    // 確保將狀態設為 isFinal: true，否則 UI 會一直卡在「等待語音結束...」隱藏錯誤訊息
    setTranscripts(prev => prev.map(t => 
      t.id === id ? { ...t, isTranslating: true, isFinal: true, targetLang: tgtLangName } : t
    ));

    try {
      if (!userApiKey) {
        throw new Error("請先在上方設定您的 Gemini API 金鑰。");
      }
      
      const ai = new GoogleGenAI({ apiKey: userApiKey });
      
      // 取得最近 3 筆已完成的對話作為上下文歷史
      const history = transcriptsRef.current
        .filter(t => t.isFinal && t.translated && t.id !== id)
        .slice(-3)
        .map(t => `Previous Sentence: ${t.original}`);

      const systemInstruction = `Version: v1.4
Role: 專業多國語言即時精準口譯專家
Description: 具備豐富跨國會議、高階商業談判與外交場合經驗的頂級口譯員。能即時、精確且流暢地在多國語言之間進行雙向轉換。
Core_Rules:
  1_Absolute_Accuracy: 翻譯必須忠於原意。
  2_Context_and_Culture: 翻譯時需考量目標語言的文化習慣，將生硬的直譯轉化為符合當地母語人士表達習慣的自然用語。
  3_Contextual_Correction (Critical): 語音辨識（STT）常有同音異字或辨識錯誤。請務必參考提供的「[Context History] 對話歷史上下文」。若發現當前輸入的語句與上下文語意完全沒有連貫性，或出現明顯的語音辨識錯誤，請自動依據上下文邏輯與目標語言國家的習慣用語，推斷並「修正」原意後，再進行翻譯。
  4_Humanization_and_Fluency (Critical): 說話者的語速、音量變化或口音可能導致輸入的句子破碎或結構不完整。請發揮人類口譯員的專業，自動腦補、平滑化這些破碎的語句，使其在目標語言中聽起來自然、連貫且符合人類說話的抑揚頓挫。
  5_Direct_Output: 模擬即時口譯的極高效率，直接輸出翻譯結果。絕對禁止加入任何解釋、註解、括號說明（如 [註：...]）或對話機器人的過渡語。只能輸出純粹的翻譯結果。`;

      let prompt = `[Target Language: ${tgtLangName}]\n\n`;
      if (history.length > 0) {
        prompt += `[Context History]\n${history.join('\n')}\n\n`;
      }
      prompt += `[Current Speech to Translate]\n${text}`;

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.3,
        }
      });

      let fullTranslation = "";
      for await (const chunk of responseStream) {
        fullTranslation += chunk.text || "";
        setTranscripts(prev => prev.map(t => 
          t.id === id ? { ...t, translated: fullTranslation } : t
        ));
      }

      setTranscripts(prev => prev.map(t => 
        t.id === id ? { ...t, isTranslating: false } : t
      ));

    } catch (error: any) {
      console.error("Translation error:", error);
      let errorMessage = "翻譯失敗，請檢查網路狀態或 API 金鑰。";
      if (error.message && error.message.includes("API key not valid")) {
        errorMessage = "API 金鑰無效，請檢查您的 GEMINI_API_KEY 設定。";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setTranscripts(prev => prev.map(t => 
        t.id === id ? { ...t, error: errorMessage, isTranslating: false } : t
      ));
    }
  };

  // 初始化 Web Speech API (STT)
  function initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setErrorMsg('您的瀏覽器不支援語音辨識功能，請使用最新版的 Chrome 或 Edge 瀏覽器。');
      return false;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; 
    recognition.interimResults = true; 

    const flushBuffer = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      const sessionText = currentSessionTextRef.current;
      if (sessionCommittedLengthRef.current > sessionText.length) {
        sessionCommittedLengthRef.current = sessionText.length;
      }
      const textToSend = sessionText.substring(sessionCommittedLengthRef.current).trim();
      if (currentTranscriptIdRef.current && textToSend) {
         translateText(currentTranscriptIdRef.current, textToSend, targetLangRef.current);
         sessionCommittedLengthRef.current = sessionText.length;
         currentTranscriptIdRef.current = '';
      }
    };
    flushBufferRef.current = flushBuffer;

    recognition.onstart = () => {
      setErrorMsg(null);
      sessionCommittedLengthRef.current = 0;
      currentSessionTextRef.current = '';
    };

    recognition.onresult = (event: any) => {
      let sessionFinals = '';
      let sessionInterims = '';

      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          sessionFinals += event.results[i][0].transcript;
        } else {
          sessionInterims += event.results[i][0].transcript;
        }
      }

      const sessionText = sessionFinals + sessionInterims;
      currentSessionTextRef.current = sessionText;
      
      // Safeguard: if interim result shrinks, ensure we don't get out of bounds
      if (sessionCommittedLengthRef.current > sessionText.length) {
        sessionCommittedLengthRef.current = sessionText.length;
      }
      
      const uncommittedText = sessionText.substring(sessionCommittedLengthRef.current);

      if (!uncommittedText.trim() && !currentTranscriptIdRef.current) return;

      if (!currentTranscriptIdRef.current) {
        currentTranscriptIdRef.current = 'temp-' + Date.now().toString();
        setTranscripts(prev => [
          ...prev,
          {
            id: currentTranscriptIdRef.current,
            original: uncommittedText,
            translated: '',
            isFinal: false,
            isTranslating: false,
            sourceLang: 'Auto',
            targetLang: targetLangRef.current
          }
        ]);
      } else {
        const idToUpdate = currentTranscriptIdRef.current;
        setTranscripts(prev => prev.map(t =>
          t.id === idToUpdate ? { ...t, original: uncommittedText } : t
        ));
      }

      // 清除之前的計時器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 1. 立即送出已確定的完整句子 (isFinal)，無需等待延遲
      if (sessionFinals.length > sessionCommittedLengthRef.current) {
        const textToSend = sessionFinals.substring(sessionCommittedLengthRef.current).trim();
        if (textToSend) {
          translateText(currentTranscriptIdRef.current, textToSend, targetLangRef.current);
          sessionCommittedLengthRef.current = sessionFinals.length;
          currentTranscriptIdRef.current = ''; // 重置 ID，讓下一句話產生新的對話框
        }
      }

      // 2. 針對尚未確定的片段 (interim)，給予極短的延遲後送出
      const remainingUncommitted = sessionText.substring(sessionCommittedLengthRef.current);
      if (remainingUncommitted.trim()) {
        debounceTimerRef.current = setTimeout(() => {
          flushBuffer();
        }, 500);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        setErrorMsg('麥克風權限遭拒，請在瀏覽器設定中允許麥克風存取權限。');
        setIsRecording(false);
      } else if (event.error === 'network') {
        setErrorMsg('網路連線異常，無法進行語音辨識。');
        setIsRecording(false);
      } else if (event.error === 'no-speech') {
        // 忽略 no-speech，讓它繼續錄音
        console.log('No speech detected, continuing...');
      } else if (event.error === 'audio-capture') {
        setErrorMsg('找不到麥克風設備，請確認麥克風已正確連接。');
        setIsRecording(false);
      } else if (event.error === 'aborted') {
        // 忽略 aborted，這通常是因為使用者手動停止，或是瀏覽器自動中斷
        console.log('Speech recognition aborted.');
      } else {
        setErrorMsg(`語音辨識發生錯誤: ${event.error}`);
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      flushBuffer();
      // 如果仍處於錄音狀態，自動重啟 (處理 Web Speech API 自動斷開的問題)
      if (isRecordingRef.current) {
        setTimeout(() => {
          try {
            // 重新初始化一個新的 recognition 實例，避免舊實例卡死
            const isSupported = initSpeechRecognition();
            if (isSupported && recognitionRef.current) {
              recognitionRef.current.start();
            }
          } catch (e) {
            console.error('Restart recognition error:', e);
          }
        }, 200); // 稍微增加重啟延遲，避免過度頻繁觸發
      }
    };

    recognitionRef.current = recognition;
    return true;
  }

  // 切換錄音狀態
  const toggleRecording = async () => {
    if (isRecording) {
      // 停止錄音
      setIsRecording(false);
      flushBufferRef.current();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      if (!userApiKey) {
        setErrorMsg('請先在上方設定您的 Gemini API 金鑰。');
        setShowSettings(true);
        return;
      }

      // 開始錄音前，先明確請求麥克風權限 (解決 iframe 內權限問題)
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error("Microphone permission denied:", err);
        setErrorMsg('麥克風權限遭拒，請允許麥克風存取權限。');
        return;
      }

      // 開始錄音
      setErrorMsg(null); // 清除先前的錯誤
      setIsRecording(true);
      
      const isSupported = initSpeechRecognition();
      if (isSupported && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e: any) {
          console.error("Failed to start recognition:", e);
          setErrorMsg(`無法啟動麥克風: ${e.message || '未知錯誤'}`);
          setIsRecording(false);
        }
      }
    }
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm z-10 flex-shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Globe2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">AI 智慧口譯專家</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              title="設定 API 金鑰"
            >
              <Settings className="w-5 h-5 text-slate-600" />
            </button>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              系統就緒
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 overflow-hidden">
        
        {/* API Key 設定區塊 */}
        {showSettings && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex-shrink-0 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-800">API 金鑰設定</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              請輸入您的 Gemini API 金鑰。此金鑰僅會儲存在您的瀏覽器本地端，不會上傳至任何伺服器。
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
              >
                完成
              </button>
            </div>
          </div>
        )}

        {/* 控制面板：目標語言選擇與錄音按鈕 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col items-center justify-center flex-shrink-0">
          <div className="text-center mb-3">
            <h2 className="text-lg font-semibold text-slate-800">自動語種辨識與翻譯</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full max-w-md mx-auto">
            <div className="w-full sm:w-1/2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">目標語言</label>
              <div className="relative">
                <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  disabled={isRecording}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed appearance-none"
                >
                  {LANGUAGES.map(lang => (
                    <option key={`tgt-${lang.id}`} value={lang.id}>{lang.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="w-full sm:w-1/2 flex items-end h-full">
              <button
                onClick={toggleRecording}
                className={cn(
                  "flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-300 shadow-sm w-full h-[42px]",
                  isRecording
                    ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 animate-pulse" 
                    : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md border border-transparent"
                )}
              >
                {isRecording ? (
                  <><Square className="w-4 h-4 fill-current" /> 停止錄音</>
                ) : (
                  <><Mic className="w-4 h-4" /> 開始說話</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 錯誤訊息提示 */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 flex-shrink-0 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{errorMsg}</p>
          </div>
        )}

        {/* 翻譯對話框 (可滾動區域) */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
          <div className="bg-slate-50 border-b border-slate-100 px-4 sm:px-5 py-3 flex justify-between items-center flex-shrink-0">
            <h2 className="text-sm font-medium text-slate-600">對話紀錄</h2>
            {isRecording && (
              <div className="flex items-center gap-2 text-xs text-red-500 font-medium animate-pulse">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                正在聆聽...
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {transcripts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                  <Languages className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm">點擊上方按鈕開始對話</p>
              </div>
            ) : (
              transcripts.map((t) => {
                return (
                  <div 
                    key={t.id} 
                    className={cn(
                      "flex flex-col gap-2 transition-all duration-300",
                      !t.isFinal && "opacity-60"
                    )}
                  >
                    {/* 原文 */}
                    <div className="flex items-start gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-1">
                        <Mic className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="rounded-2xl px-4 py-3 text-[15px] leading-relaxed max-w-[85%] bg-slate-100 text-slate-700 rounded-tl-none">
                        {t.original}
                      </div>
                    </div>
                    
                    {/* 翻譯文 */}
                    {t.isFinal ? (
                      <div className="flex items-start gap-3 justify-end">
                        <div className={cn(
                          "rounded-2xl px-4 py-3 text-[15px] leading-relaxed max-w-[85%] shadow-sm",
                          t.error 
                            ? "bg-red-50 text-red-600 border border-red-100" 
                            : "bg-blue-600 text-white rounded-tr-none"
                        )}>
                          {t.error ? (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              <span>{t.error}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span>{t.translated}</span>
                              {t.isTranslating && (
                                t.translated ? (
                                  <span className="w-1.5 h-4 bg-white/70 animate-pulse inline-block ml-1 align-middle"></span>
                                ) : (
                                  <div className="flex items-center gap-2 text-white/80">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">翻譯中...</span>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                          <Globe2 className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 justify-end">
                         <div className="flex items-center gap-2 text-slate-400 text-sm px-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>等待語音結束...</span>
                         </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </main>
    </div>
  );
}
