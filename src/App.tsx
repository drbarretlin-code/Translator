import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Globe2, AlertCircle, Loader2, Languages, Settings, Key, ArrowRightLeft, Volume2, Square as StopIcon, Moon, Sun, Trash2, Share2, Check, Lock, Eye, EyeOff, X } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { cn } from './lib/utils';

// 定義支援的語言與腔調清單
const LANGUAGES = [
  { id: 'en-US', name: '美語 (美國)' },
  { id: 'en-GB', name: '英語 (英國)' },
  { id: 'ja-JP', name: '日語 (日本)' },
  { id: 'fr-FR', name: '法語 (Français)' },
  { id: 'th-TH', name: '泰語 (ไทย)' },
  { id: 'vi-VN', name: '越南語 (Tiếng Việt)' },
  { id: 'id-ID', name: '印尼語 (Bahasa Indonesia)' },
  { id: 'ms-MY', name: '馬來西亞語 (Bahasa Melayu)' },
  { id: 'zh-TW', name: '繁中 (台灣)' },
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
  detectedLang?: string;
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
  const [playingTTSId, setPlayingTTSId] = useState<string | null>(null);
  const [loadingTTSId, setLoadingTTSId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [uiLang, setUiLang] = useState(() => localStorage.getItem('ui_lang') || 'zh-TW');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [silenceThreshold, setSilenceThreshold] = useState(() => Number(localStorage.getItem('silence_threshold')) || 650);
  const [headerTitle1, setHeaderTitle1] = useState(() => localStorage.getItem('header_title_1') || 'TUC');
  const [headerTitle2, setHeaderTitle2] = useState(() => localStorage.getItem('header_title_2') || 'AI Smart Interpreter');
  
  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
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

  useEffect(() => {
    localStorage.setItem('silence_threshold', silenceThreshold.toString());
  }, [silenceThreshold]);

  useEffect(() => {
    localStorage.setItem('header_title_1', headerTitle1);
  }, [headerTitle1]);

  useEffect(() => {
    localStorage.setItem('header_title_2', headerTitle2);
  }, [headerTitle2]);

  useEffect(() => {
    localStorage.setItem('ui_lang', uiLang);
  }, [uiLang]);

  // 暗色模式切換
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // 介面翻譯
  const getUiText = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      'zh-TW': {
        'title1': headerTitle1,
        'title2': headerTitle2,
        'local': 'Local (本地端)',
        'client': 'Client (客戶端)',
        'systemReady': '系統就緒',
        'adminSettings': '管理者設定',
        'darkMode': isDarkMode ? '切換至亮色模式' : '切換至暗色模式',
      },
      'en-US': {
        'title1': headerTitle1,
        'title2': headerTitle2,
        'local': 'Local',
        'client': 'Client',
        'systemReady': 'System Ready',
        'adminSettings': 'Admin Settings',
        'darkMode': isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      },
      'ja-JP': {
        'title1': headerTitle1,
        'title2': headerTitle2,
        'local': 'ローカル',
        'client': 'クライアント',
        'systemReady': 'システム準備完了',
        'adminSettings': '管理者設定',
        'darkMode': isDarkMode ? 'ライトモードへ' : 'ダークモードへ',
      },
      'en-GB': {
        'title1': headerTitle1,
        'title2': headerTitle2,
        'local': 'Local',
        'client': 'Client',
        'systemReady': 'System Ready',
        'adminSettings': 'Admin Settings',
        'darkMode': isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      },
      'fr-FR': {
        'title1': headerTitle1,
        'title2': headerTitle2,
        'local': 'Local',
        'client': 'Client',
        'systemReady': 'Système prêt',
        'adminSettings': 'Paramètres admin',
        'darkMode': isDarkMode ? 'Mode clair' : 'Mode sombre',
      },
      'th-TH': {
        'title1': headerTitle1,
        'title2': headerTitle2,
        'local': 'ท้องถิ่น',
        'client': 'ลูกค้า',
        'systemReady': 'ระบบพร้อม',
        'adminSettings': 'การตั้งค่าผู้ดูแลระบบ',
        'darkMode': isDarkMode ? 'โหมดสว่าง' : 'โหมดมืด',
      },
      'vi-VN': {
        'title1': headerTitle1,
        'title2': headerTitle2,
        'local': 'Địa phương',
        'client': 'Khách hàng',
        'systemReady': 'Hệ thống sẵn sàng',
        'adminSettings': 'Cài đặt quản trị',
        'darkMode': isDarkMode ? 'Chế độ sáng' : 'Chế độ tối',
      },
      'id-ID': {
        'title1': headerTitle1,
        'title2': headerTitle2,
        'local': 'Lokal',
        'client': 'Klien',
        'systemReady': 'Sistem siap',
        'adminSettings': 'Pengaturan admin',
        'darkMode': isDarkMode ? 'Mode terang' : 'Mode gelap',
      },
      'ms-MY': {
        'title1': headerTitle1,
        'title2': headerTitle2,
        'local': 'Tempatan',
        'client': 'Pelanggan',
        'systemReady': 'Sistem sedia',
        'adminSettings': 'Tetapan admin',
        'darkMode': isDarkMode ? 'Mod cerah' : 'Mod gelap',
      }
    };
    return translations[uiLang]?.[key] || translations['zh-TW'][key] || key;
  };

  // 清除對話紀錄
  const handleClear = () => {
    setTranscripts([]);
    setShowClearConfirm(false);
  };

  // 分享對話紀錄
  const handleShare = async () => {
    if (transcripts.length === 0) return;
    
    const text = transcripts.map(t => {
      return `原文：${t.original}\n翻譯：${t.translated}`;
    }).join('\n\n---\n\n');
    
    const shareData = {
      title: '語音翻譯對話紀錄',
      text: text,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } else {
        throw new Error('Web Share API not supported');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        // Fallback to clipboard
        try {
          await navigator.clipboard.writeText(text);
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 2000);
        } catch (copyErr) {
          console.error('Failed to copy', copyErr);
        }
      }
    }
  };

  // 自動滾動到最新對話
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // 預先載入 Web Speech API 語音清單
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // 停止當前播放的語音
  const stopAudio = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {}
      audioSourceRef.current = null;
    }
    setPlayingTTSId(null);
    setLoadingTTSId(null);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // 備用：瀏覽器內建語音合成 (Web Speech API)
  const fallbackSpeakText = (id: string, text: string, targetLang: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    utterance.rate = 0.85; // 放慢語速，讓發音更清晰
    utterance.pitch = 1.05; // 稍微提高音調
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const baseLang = targetLang.split('-')[0];
      const matchedVoices = voices.filter(v => v.lang.toLowerCase().startsWith(baseLang.toLowerCase()));
      
      if (matchedVoices.length > 0) {
        // 優先挑選高品質語音
        const bestVoice = matchedVoices.find(v => 
          v.name.includes('Google') || 
          v.name.includes('Premium') || 
          v.name.includes('Enhanced') || 
          v.name.includes('Siri') ||
          v.name.includes('Microsoft')
        ) || matchedVoices[0];
        
        utterance.voice = bestVoice;
      }
    }
    
    utterance.onend = () => {
      setPlayingTTSId(null);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  // 語音朗讀功能 (優先使用 Gemini TTS 獲得極致音質)
  const speakText = async (id: string, text: string, targetLang: string) => {
    // 如果正在播放同一個，則停止
    if (playingTTSId === id || loadingTTSId === id) {
      stopAudio();
      return;
    }

    stopAudio();

    if (!userApiKey) {
      // 如果沒有 API Key，退回使用瀏覽器內建語音
      fallbackSpeakText(id, text, targetLang);
      return;
    }

    try {
      setLoadingTTSId(id);
      const ai = new GoogleGenAI({ apiKey: userApiKey });
      
      // 加上語言提示，確保 AI 用正確的語言發音
      const prompt = `Please read the following text in ${targetLang} naturally and clearly: ${text}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Aoede' }, // Aoede 聲音清晰自然
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioCtx = audioContextRef.current;
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        const binaryString = atob(base64Audio);
        const buffer = new ArrayBuffer(binaryString.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binaryString.length; i++) {
          view[i] = binaryString.charCodeAt(i);
        }
        
        // Gemini TTS 回傳 16-bit PCM
        const int16View = new Int16Array(buffer);
        const pcmData = new Float32Array(int16View.length);
        for (let i = 0; i < int16View.length; i++) {
          pcmData[i] = int16View[i] / 32768;
        }
        
        const audioBuffer = audioCtx.createBuffer(1, pcmData.length, 24000);
        audioBuffer.getChannelData(0).set(pcmData);
        
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        
        source.onended = () => {
          setPlayingTTSId(null);
        };
        
        audioSourceRef.current = source;
        setLoadingTTSId(null);
        setPlayingTTSId(id);
        source.start();
      } else {
        throw new Error("No audio data received");
      }
    } catch (err) {
      console.error("Gemini TTS Error:", err);
      setLoadingTTSId(null);
      // 發生錯誤時，退回使用瀏覽器內建語音
      fallbackSpeakText(id, text, targetLang);
    }
  };

  // 執行翻譯 (直接在前端呼叫 Gemini API)
  const translateText = async (id: string, text: string) => {
    setTranscripts(prev => prev.map(t => 
      t.id === id ? { ...t, isTranslating: true, isFinal: true } : t
    ));

    try {
      if (!userApiKey) {
        throw new Error("請先在上方設定您的 Gemini API 金鑰。");
      }
      
      const ai = new GoogleGenAI({ apiKey: userApiKey });

      const prompt = `You are a bilingual translator. The two languages are ${localLangRef.current} and ${clientLangRef.current}.
Detect the language of the text.
If it is ${localLangRef.current}, translate to ${clientLangRef.current}.
If it is ${clientLangRef.current}, translate to ${localLangRef.current}.
If it's another language, translate to ${localLangRef.current}.
Return EXACTLY in this format: [DetectedLangCode] | [TranslatedText]
Text: ${text}`;

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
        config: {
          temperature: 0.1,
        }
      });

      let fullResponse = "";
      let detectedLang = "";
      let translatedText = "";
      let isParsing = true;

      for await (const chunk of responseStream) {
        fullResponse += chunk.text || "";
        
        if (isParsing) {
          const parts = fullResponse.split('|');
          if (parts.length >= 2) {
            detectedLang = parts[0].trim();
            translatedText = parts.slice(1).join('|').trim();
            isParsing = false;
            
            // Update detected language in UI
            setTranscripts(prev => prev.map(t => 
              t.id === id ? { ...t, detectedLang, translated: translatedText } : t
            ));
          }
        } else {
          translatedText += chunk.text || "";
          setTranscripts(prev => prev.map(t => 
            t.id === id ? { ...t, translated: translatedText } : t
          ));
        }
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
    recognition.lang = localLangRef.current;
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
          }, silenceThreshold); 
        }
      } else {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error('Speech recognition error', event.error);
      }
      
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
        setErrorMsg('請先在管理者設定中配置您的 Gemini API 金鑰。');
        setShowAdminSettings(true);
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
    <div className={cn("h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col overflow-hidden transition-colors duration-300", isDarkMode && "dark")}>
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shadow-sm z-10 flex-shrink-0 transition-colors duration-300">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center min-w-[30px]">
              <span className="text-red-600 dark:text-red-500 font-bold text-xl tracking-wider">{getUiText('title1')}</span>
            </div>
            <h1 className="text-base font-semibold tracking-tight">{getUiText('title2')}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title={getUiText('darkMode')}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
            <button 
              onClick={() => setShowAdminSettings(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title={getUiText('adminSettings')}
            >
              <Lock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <span className="hidden sm:flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {getUiText('systemReady')}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 overflow-hidden relative">
        
        {/* API Key 設定區塊 */}
        {/* 管理者設定彈窗 */}
      {showAdminSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-500" /> 管理者設定
              </h3>
              <button 
                onClick={() => setShowAdminSettings(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                {/* API Key 設定區塊 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-500" /> API 金鑰設定
                  </h4>
                  <input
                    type="password"
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                    placeholder="輸入 Gemini API 金鑰 (僅儲存於本地)"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    設定 Gemini API 金鑰以啟用翻譯功能。
                  </p>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* 介面語言設定 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-green-500" /> 介面語言設定
                  </h4>
                  <select
                    value={uiLang}
                    onChange={(e) => setUiLang(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={`ui-${lang.id}`} value={lang.id}>{lang.name}</option>
                    ))}
                  </select>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* 頂部標題設定 */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Languages className="w-4 h-4 text-purple-500" /> 頂部標題設定
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">標題 1</label>
                      <input
                        type="text"
                        value={headerTitle1}
                        onChange={(e) => setHeaderTitle1(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">標題 2</label>
                      <input
                        type="text"
                        value={headerTitle2}
                        onChange={(e) => setHeaderTitle2(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <button
                  onClick={() => {
                    setShowAdminSettings(false);
                    // 立即生效：如果正在錄音，重新初始化
                    if (isRecording) {
                      initSpeechRecognition();
                    }
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                >
                  儲存並關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 管理者設定彈窗 */}
      {showAdminSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-500" /> 管理者進階設定
                </h3>
                <button 
                  onClick={() => setShowAdminSettings(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* 語音停頓判定時間 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <StopIcon className="w-4 h-4 text-amber-500" /> 語音停頓判定時間 (毫秒)
                  </h4>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="300"
                      max="2000"
                      step="50"
                      value={silenceThreshold}
                      onChange={(e) => setSilenceThreshold(Number(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="w-20 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                      {silenceThreshold}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    當使用者停止說話超過此時間，系統將自動斷句並進行翻譯。預設為 650ms。
                  </p>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* API 金鑰設定 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-500" /> API 金鑰設定
                  </h4>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={userApiKey}
                      onChange={(e) => setUserApiKey(e.target.value)}
                      className="w-full pl-4 pr-24 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                      placeholder="輸入您的 Gemini API Key"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500"
                        title={showApiKey ? "隱藏" : "顯示"}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setUserApiKey('')}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-red-500"
                        title="清除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    設定 Gemini API 金鑰以啟用翻譯功能。
                  </p>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* 介面語言設定 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-green-500" /> 介面語言設定
                  </h4>
                  <select
                    value={uiLang}
                    onChange={(e) => setUiLang(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={`ui-${lang.id}`} value={lang.id}>{lang.name}</option>
                    ))}
                  </select>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* 頂部標題設定 */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Languages className="w-4 h-4 text-purple-500" /> 頂部標題設定
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">標題 1 (預設: TUC)</label>
                      <input
                        type="text"
                        value={headerTitle1}
                        onChange={(e) => setHeaderTitle1(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">標題 2 (預設: AI Smart Interpreter)</label>
                      <input
                        type="text"
                        value={headerTitle2}
                        onChange={(e) => setHeaderTitle2(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <button
                  onClick={() => {
                    setShowAdminSettings(false);
                    // 立即生效：如果正在錄音，重新初始化
                    if (isRecording) {
                      initSpeechRecognition();
                    }
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                >
                  儲存並關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* 控制面板：互譯功能選擇與錄音按鈕 */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-2 sm:p-3 flex flex-row items-center justify-between flex-shrink-0 gap-2 transition-colors duration-300">
          
          {/* 左側國旗 (Local) */}
          <div className="flex items-center justify-center flex-shrink-0">
            <CountryFlag langId={localLang} className="w-8 h-5 sm:w-10 sm:h-7 rounded shadow-sm border border-slate-200 dark:border-slate-700 object-cover" />
          </div>

          <div className="flex flex-row items-center gap-2 w-full max-w-2xl mx-auto">
            <div className="flex-1">
              <div className="relative">
                <Globe2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <select 
                  value={localLang}
                  onChange={(e) => setLocalLang(e.target.value)}
                  disabled={isRecording}
                  className="w-full pl-7 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:opacity-60 appearance-none dark:text-slate-200"
                >
                  {LANGUAGES.map(lang => (
                    <option key={`local-${lang.id}`} value={lang.id}>{lang.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <button 
                onClick={() => {
                  const temp = localLang;
                  setLocalLang(clientLang);
                  setClientLang(temp);
                  if (isRecording) {
                    setTimeout(() => initSpeechRecognition(), 100);
                  }
                }}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                title="切換語言方向"
              >
                <ArrowRightLeft className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <div className="flex-1">
              <div className="relative">
                <Globe2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <select 
                  value={clientLang}
                  onChange={(e) => setClientLang(e.target.value)}
                  disabled={isRecording}
                  className="w-full pl-7 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:opacity-60 appearance-none dark:text-slate-200"
                >
                  {LANGUAGES.map(lang => (
                    <option key={`client-${lang.id}`} value={lang.id}>{lang.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <button
                onClick={toggleRecording}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-300 shadow-sm h-[32px]",
                  isRecording
                    ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 animate-pulse" 
                    : "bg-blue-600 text-white hover:bg-blue-700 border border-transparent"
                )}
              >
                {isRecording ? (
                  <><Square className="w-3.5 h-3.5 fill-current" /> <span className="text-xs">停止</span></>
                ) : (
                  <><Mic className="w-3.5 h-3.5" /> <span className="text-xs">Speaking</span></>
                )}
              </button>
            </div>
          </div>

          {/* 右側國旗 (Client) */}
          <div className="flex items-center justify-center flex-shrink-0">
            <CountryFlag langId={clientLang} className="w-8 h-5 sm:w-10 sm:h-7 rounded shadow-sm border border-slate-200 dark:border-slate-700 object-cover" />
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
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col min-h-0 transition-colors duration-300">
          <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 px-4 sm:px-5 py-3 flex justify-between items-center flex-shrink-0 transition-colors duration-300">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-medium text-slate-600 dark:text-slate-300">對話紀錄</h2>
              {isRecording && (
                <div className="flex items-center gap-2 text-xs text-red-500 font-medium animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  正在聆聽...
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                disabled={transcripts.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {shareSuccess ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
                {shareSuccess ? '分享成功' : '分享'}
              </button>
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={transcripts.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                清除
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {transcripts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-4 min-h-[200px]">
                <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                  <Languages className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm">點擊上方按鈕開始對話</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start content-start">
                {transcripts.map((t) => {
                  return (
                    <div 
                      key={t.id} 
                      className={cn(
                        "flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-2 transition-all duration-300 shadow-sm",
                        !t.isFinal && "opacity-60"
                      )}
                    >
                      {/* 原文 (Local/Client 之一) */}
                      <div className="flex flex-col gap-1.5">
                        <div className="text-[15px] leading-tight text-slate-700 dark:text-slate-200">
                          {t.detectedLang && <span className="text-xs text-slate-400 mr-1.5 font-mono">[{t.detectedLang}]</span>}
                          {t.original}
                        </div>
                      </div>
                      
                      {/* 分隔線 */}
                      <div className="h-px w-full bg-slate-200 dark:bg-slate-700"></div>
                      
                      {/* 翻譯文 (對應的另一端) */}
                      <div className="flex flex-col gap-1.5">
                        {t.isFinal ? (
                          t.error ? (
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-[15px]">
                              <AlertCircle className="w-4 h-4" />
                              <span>{t.error}</span>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-[15px] leading-tight text-blue-700 dark:text-blue-400 font-medium">
                                {t.translated}
                                {t.isTranslating && (
                                  t.translated ? (
                                    <span className="w-1.5 h-4 bg-blue-400/70 animate-pulse inline-block ml-1 align-middle"></span>
                                  ) : (
                                    <div className="flex items-center gap-2 text-blue-500/80">
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      <span className="text-sm">翻譯中...</span>
                                    </div>
                                  )
                                )}
                              </div>
                              {!t.isTranslating && t.translated && (
                                <button 
                                  onClick={() => speakText(t.id, t.translated, clientLang)}
                                  className={cn(
                                    "p-1.5 rounded-full transition-colors flex-shrink-0",
                                    playingTTSId === t.id 
                                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 animate-pulse" 
                                      : "hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                  )}
                                  title={playingTTSId === t.id ? "停止朗讀" : "高音質朗讀翻譯結果"}
                                >
                                  {loadingTTSId === t.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : playingTTSId === t.id ? (
                                    <StopIcon className="w-4 h-4 fill-current" />
                                  ) : (
                                    <Volume2 className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>等待語音結束...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={transcriptEndRef} className="col-span-full" />
              </div>
            )}
          </div>
        </div>

        {/* Clear Confirm Modal */}
        {showClearConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full animate-in zoom-in-95">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">清除對話紀錄</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">確定要清除所有的對話紀錄嗎？此動作無法復原。</p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleClear}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  確定清除
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
