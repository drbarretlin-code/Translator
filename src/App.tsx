import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Globe2, AlertCircle, Loader2, Languages, Settings, Key, ArrowRightLeft } from 'lucide-react';
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

const CountryFlag = ({ langId, className }: { langId: string, className?: string }) => {
  switch (langId) {
    case 'en-US':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#fff"/>
          <rect width="60" height="3.07" y="0" fill="#B22234"/>
          <rect width="60" height="3.07" y="6.15" fill="#B22234"/>
          <rect width="60" height="3.07" y="12.3" fill="#B22234"/>
          <rect width="60" height="3.07" y="18.46" fill="#B22234"/>
          <rect width="60" height="3.07" y="24.61" fill="#B22234"/>
          <rect width="60" height="3.07" y="30.76" fill="#B22234"/>
          <rect width="60" height="3.07" y="36.92" fill="#B22234"/>
          <rect width="24" height="21.53" fill="#3C3B6E"/>
          <circle cx="4" cy="4" r="1" fill="#fff"/><circle cx="12" cy="4" r="1" fill="#fff"/><circle cx="20" cy="4" r="1" fill="#fff"/>
          <circle cx="8" cy="8" r="1" fill="#fff"/><circle cx="16" cy="8" r="1" fill="#fff"/>
          <circle cx="4" cy="12" r="1" fill="#fff"/><circle cx="12" cy="12" r="1" fill="#fff"/><circle cx="20" cy="12" r="1" fill="#fff"/>
          <circle cx="8" cy="16" r="1" fill="#fff"/><circle cx="16" cy="16" r="1" fill="#fff"/>
        </svg>
      );
    case 'en-GB':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#012169"/>
          <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="6"/>
          <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="2"/>
          <path d="M30,0 L30,40 M0,20 L60,20" stroke="#fff" strokeWidth="10"/>
          <path d="M30,0 L30,40 M0,20 L60,20" stroke="#C8102E" strokeWidth="6"/>
        </svg>
      );
    case 'ja-JP':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#fff"/>
          <circle cx="30" cy="20" r="12" fill="#BC002D"/>
        </svg>
      );
    case 'fr-FR':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="20" height="40" fill="#002395"/>
          <rect x="20" width="20" height="40" fill="#fff"/>
          <rect x="40" width="20" height="40" fill="#ED2939"/>
        </svg>
      );
    case 'th-TH':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#A51931"/>
          <rect y="6.66" width="60" height="26.66" fill="#F4F5F8"/>
          <rect y="13.33" width="60" height="13.33" fill="#2D2A4A"/>
        </svg>
      );
    case 'vi-VN':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#DA251D"/>
          <polygon points="30,8 33.5,18.5 44,18.5 35.5,25 38.5,35 30,29 21.5,35 24.5,25 16,18.5 26.5,18.5" fill="#FFFF00"/>
        </svg>
      );
    case 'id-ID':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="20" fill="#FF0000"/>
          <rect y="20" width="60" height="20" fill="#FFFFFF"/>
        </svg>
      );
    case 'ms-MY':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#fff"/>
          <rect y="0" width="60" height="2.85" fill="#CC0000"/>
          <rect y="5.71" width="60" height="2.85" fill="#CC0000"/>
          <rect y="11.42" width="60" height="2.85" fill="#CC0000"/>
          <rect y="17.14" width="60" height="2.85" fill="#CC0000"/>
          <rect y="22.85" width="60" height="2.85" fill="#CC0000"/>
          <rect y="28.57" width="60" height="2.85" fill="#CC0000"/>
          <rect y="34.28" width="60" height="2.85" fill="#CC0000"/>
          <rect width="30" height="22.85" fill="#000066"/>
          <circle cx="15" cy="11.42" r="7" fill="#FFCC00"/>
          <circle cx="17" cy="11.42" r="6" fill="#000066"/>
          <polygon points="20,11.42 16,13 17,17 14,14 10,15 12,11.42 10,8 14,9 17,6 16,10" fill="#FFCC00"/>
        </svg>
      );
    case 'zh-TW':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#FE0000"/>
          <rect width="30" height="20" fill="#000095"/>
          <circle cx="15" cy="10" r="5" fill="#fff"/>
          <path d="M15,2 L16,6 L20,4 L18,8 L22,10 L18,12 L20,16 L16,14 L15,18 L14,14 L10,16 L12,12 L8,10 L12,8 L10,4 L14,6 Z" fill="#fff"/>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="40" fill="#E2E8F0"/>
          <circle cx="30" cy="20" r="10" fill="#94A3B8"/>
        </svg>
      );
  }
};

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [localLang, setLocalLang] = useState('zh-TW');
  const [clientLang, setClientLang] = useState('en-US');
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
  const localLangRef = useRef<string>(localLang);
  const clientLangRef = useRef<string>(clientLang);
  const transcriptsRef = useRef<Transcript[]>([]);

  // 同步 state 到 ref，供事件回呼使用
  useEffect(() => {
    transcriptsRef.current = transcripts;
  }, [transcripts]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    localLangRef.current = localLang;
  }, [localLang]);

  useEffect(() => {
    clientLangRef.current = clientLang;
  }, [clientLang]);

  useEffect(() => {
    localStorage.setItem('gemini_api_key', userApiKey);
  }, [userApiKey]);

  // 自動滾動到最新對話
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // 執行翻譯 (直接在前端呼叫 Gemini API)
  const translateText = async (id: string, text: string) => {
    const localLangName = LANGUAGES.find(l => l.id === localLangRef.current)?.name || localLangRef.current;
    const clientLangName = LANGUAGES.find(l => l.id === clientLangRef.current)?.name || clientLangRef.current;
    
    // 確保將狀態設為 isFinal: true，否則 UI 會一直卡在「等待語音結束...」隱藏錯誤訊息
    setTranscripts(prev => prev.map(t => 
      t.id === id ? { ...t, isTranslating: true, isFinal: true, targetLang: `${localLangName} ↔ ${clientLangName}` } : t
    ));

    try {
      if (!userApiKey) {
        throw new Error("請先在上方設定您的 Gemini API 金鑰。");
      }
      
      const ai = new GoogleGenAI({ apiKey: userApiKey });

      // 極度精簡的 System Prompt，捨棄歷史上下文，追求極致的 TTFT (Time To First Token)
      const systemInstruction = `Translate the input. If it is ${localLangName}, translate to ${clientLangName}. If it is ${clientLangName}, translate to ${localLangName}. Output ONLY the translation.`;

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.1-flash-lite-preview", // 使用最輕量、最快速的模型
        contents: text,
        config: {
          systemInstruction,
          temperature: 0.1, // 降低隨機性，加快生成速度
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
        debounceTimerRef.current = null;
      }
      const sessionText = currentSessionTextRef.current;
      if (sessionCommittedLengthRef.current > sessionText.length) {
        sessionCommittedLengthRef.current = sessionText.length;
      }
      const textToSend = sessionText.substring(sessionCommittedLengthRef.current).trim();
      
      if (textToSend) {
        let idToUse = currentTranscriptIdRef.current;
        if (!idToUse) {
          idToUse = 'temp-' + Date.now().toString();
          setTranscripts(prev => [
            ...prev,
            {
              id: idToUse,
              original: textToSend,
              translated: '',
              isFinal: false,
              isTranslating: false,
              sourceLang: 'Auto',
              targetLang: 'Auto'
            }
          ]);
        }
        
        translateText(idToUse, textToSend);
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
      // 判斷文字是否真的有改變
      const textChanged = sessionText !== currentSessionTextRef.current;
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
            targetLang: 'Auto'
          }
        ]);
      } else if (textChanged) {
        // 只有當文字改變時才更新 UI，避免不必要的重新渲染
        const idToUpdate = currentTranscriptIdRef.current;
        setTranscripts(prev => prev.map(t =>
          t.id === idToUpdate ? { ...t, original: uncommittedText } : t
        ));
      }

      // 1. 立即送出已確定的完整句子 (isFinal)，無需等待延遲
      if (sessionFinals.length > sessionCommittedLengthRef.current) {
        const textToSend = sessionFinals.substring(sessionCommittedLengthRef.current).trim();
        if (textToSend) {
          translateText(currentTranscriptIdRef.current, textToSend);
          sessionCommittedLengthRef.current = sessionFinals.length;
          currentTranscriptIdRef.current = ''; // 重置 ID，讓下一句話產生新的對話框
        }
      }

      // 2. 針對尚未確定的片段 (interim)，給予極短的延遲後送出
      const remainingUncommitted = sessionText.substring(sessionCommittedLengthRef.current);
      if (remainingUncommitted.trim()) {
        // 只有當文字真正改變時，或計時器未啟動時，才重置/啟動計時器。
        // 避免瀏覽器狂發相同的 interim 結果導致計時器不斷被重置，進而造成最後一句話延遲。
        if (textChanged || !debounceTimerRef.current) {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = setTimeout(() => {
            flushBuffer();
          }, 150); // 極限縮短至 150ms，創造幾乎同步的即時感
        }
      } else {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
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

        {/* 控制面板：互譯功能選擇與錄音按鈕 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-row items-center justify-between flex-shrink-0 gap-4">
          
          {/* 左側國旗 (Local) */}
          <div className="hidden md:flex items-center justify-center flex-shrink-0">
            <CountryFlag langId={localLang} className="w-16 h-11 rounded-md shadow-sm border border-slate-200 object-cover" />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full max-w-2xl mx-auto">
            <div className="w-full sm:w-1/3">
              <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Local (本地端)</label>
              <div className="relative">
                <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  value={localLang}
                  onChange={(e) => setLocalLang(e.target.value)}
                  disabled={isRecording}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed appearance-none"
                >
                  {LANGUAGES.map(lang => (
                    <option key={`local-${lang.id}`} value={lang.id}>{lang.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="hidden sm:flex items-center justify-center mt-5">
              <ArrowRightLeft className="w-5 h-5 text-slate-400" />
            </div>

            <div className="w-full sm:w-1/3">
              <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Client (客戶端)</label>
              <div className="relative">
                <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  value={clientLang}
                  onChange={(e) => setClientLang(e.target.value)}
                  disabled={isRecording}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed appearance-none"
                >
                  {LANGUAGES.map(lang => (
                    <option key={`client-${lang.id}`} value={lang.id}>{lang.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="w-full sm:w-1/3 flex items-end h-full">
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

          {/* 右側國旗 (Client) */}
          <div className="hidden md:flex items-center justify-center flex-shrink-0">
            <CountryFlag langId={clientLang} className="w-16 h-11 rounded-md shadow-sm border border-slate-200 object-cover" />
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
