import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import * as Y from 'yjs';
import { Virtuoso } from 'react-virtuoso';
import { Mic, Square, Globe2, AlertCircle, Loader2, Languages, Settings, Key, ArrowRightLeft, Volume2, VolumeX, MessageSquare, MessageSquareOff, Square as StopIcon, Moon, Sun, Trash2, Share2, Check, Lock, Eye, EyeOff, X, Zap, Users, LogIn, LogOut, Copy, QrCode, Info } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import * as OpenCC from 'opencc-js';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from './lib/utils';
import { db, auth, signInWithGoogle, signInAnon } from './firebase';
import { collection, doc, setDoc, onSnapshot, query, orderBy, deleteDoc, updateDoc, serverTimestamp, getDocs, getDoc, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import toast, { Toaster } from 'react-hot-toast';

// 獨立的 TranscriptItem 元件，使用 React.memo 優化渲染
const TranscriptItem = React.memo(({ t }: { t: any }) => (
  <div 
    key={t.id} 
    className={cn(
      "flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-3 transition-all duration-300 shadow-sm",
      !t.isFinal && "opacity-60"
    )}
  >
    {/* ID 與時間標籤 */}
    <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono h-4">
      <span>{t.speakerName || '匿名'}</span>
      <span>{new Date(t.createdAt || t.timestamp?.toMillis() || Date.now()).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
    </div>

    {/* 原文 */}
    <div className="flex flex-col gap-1.5 min-h-[1.5rem]">
      <div className="text-[15px] leading-tight text-slate-700 dark:text-slate-200">
        {t.detectedLang && <span className="text-xs text-slate-400 mr-1.5 font-mono">[{t.detectedLang}]</span>}
        {t.original}
      </div>
      {!t.isFinal && t.original && (
        <div className="text-xs text-slate-400 dark:text-slate-500 italic animate-pulse">
          即時字幕: {t.original}
        </div>
      )}
    </div>
    
    {/* 分隔線 */}
    <div className="h-px w-full bg-slate-200 dark:bg-slate-700 shrink-0"></div>
    
    {/* 翻譯文 */}
    <div className="flex flex-col gap-1.5 min-h-[1.5rem]">
      {t.error ? (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-[15px]">
          <AlertCircle className="w-4 h-4" />
          <span>{t.error}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {t.translated && (
            <div className="text-[15px] leading-tight text-blue-700 dark:text-blue-400 font-medium">
              {t.translated}
            </div>
          )}
          {!t.isFinal && (
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm h-5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  </div>
));

// 初始化簡轉繁轉換器
const s2tConverter = OpenCC.Converter({ from: 'cn', to: 'tw' });

// 定義支援的語言與腔調清單
const LANGUAGES = [
  { id: 'zh-TW', nameKey: 'lang_zh_TW', suffix: '(TW)', name: '繁體中文' },
  { id: 'en-US', nameKey: 'lang_en_US', suffix: '(USA)', name: 'English (US)' },
  { id: 'en-GB', nameKey: 'lang_en_GB', suffix: '(GBR)', name: 'English (GB)' },
  { id: 'ja-JP', nameKey: 'lang_ja_JP', suffix: '(Japan)', name: '日本語' },
  { id: 'fr-FR', nameKey: 'lang_fr_FR', suffix: '(Français)', name: 'Français' },
  { id: 'th-TH', nameKey: 'lang_th_TH', suffix: '(ไทย)', name: 'ไทย' },
  { id: 'vi-VN', nameKey: 'lang_vi_VN', suffix: '(Tiếng Việt)', name: 'Tiếng Việt' },
  { id: 'id-ID', nameKey: 'lang_id_ID', suffix: '(Bahasa Indonesia)', name: 'Bahasa Indonesia' },
  { id: 'ms-MY', nameKey: 'lang_ms_MY', suffix: '(Bahasa Melayu)', name: 'Bahasa Melayu' },
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
  speakerId: string;
  speakerName?: string;
  createdAt: number;
  timestamp?: any;
  isLocal?: boolean;
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

const getDefaultLang = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Asia/Taipei' || tz === 'Asia/Hong_Kong' || tz === 'Asia/Macau') return 'zh-TW';
    if (tz === 'Asia/Tokyo') return 'ja-JP';
    if (tz.startsWith('Europe/Paris')) return 'fr-FR';
    if (tz === 'Asia/Bangkok') return 'th-TH';
    if (tz === 'Asia/Ho_Chi_Minh') return 'vi-VN';
    if (tz === 'Asia/Jakarta') return 'id-ID';
    if (tz === 'Asia/Kuala_Lumpur') return 'ms-MY';
    if (tz === 'Europe/London') return 'en-GB';
    if (tz.startsWith('America/')) return 'en-US';
  } catch (e) {
    console.error(e);
  }
  
  // Fallback to navigator.language
  const lang = navigator.language;
  if (lang.startsWith('zh-TW') || lang.startsWith('zh-HK')) return 'zh-TW';
  if (lang.startsWith('zh')) return 'zh-TW';
  if (lang.startsWith('ja')) return 'ja-JP';
  if (lang.startsWith('fr')) return 'fr-FR';
  if (lang.startsWith('th')) return 'th-TH';
  if (lang.startsWith('vi')) return 'vi-VN';
  if (lang.startsWith('id')) return 'id-ID';
  if (lang.startsWith('ms')) return 'ms-MY';
  if (lang.startsWith('en-GB')) return 'en-GB';
  return 'en-US';
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCreatorId, setRoomCreatorId] = useState<string | null>(null);
  const [activeConnections, setActiveConnections] = useState<number>(0);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showRoomDialog, setShowRoomDialog] = useState(!new URLSearchParams(window.location.search).get('room'));
  const [joinRoomIdInput, setJoinRoomIdInput] = useState(() => new URLSearchParams(window.location.search).get('room') || '');
  const [userName, setUserName] = useState(() => localStorage.getItem('user_name') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyType, setApiKeyType] = useState<'free' | 'paid'>(() => (localStorage.getItem('api_key_type') as 'free' | 'paid') || 'free');
  const [projectName, setProjectName] = useState(() => localStorage.getItem('project_name') || '');
  const [customAlert, setCustomAlert] = useState<{message: string, type: 'alert' | 'confirm', onConfirm?: () => void} | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    const roomIdFromUrl = new URLSearchParams(window.location.search).get('room');
    if (roomIdFromUrl && isAuthReady) {
      handleJoinRoom();
    }
  }, [isAuthReady]);

      const lastMessageTimeRef = useRef<number>(Date.now());

  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(false);
  const [localLang, setLocalLang] = useState(getDefaultLang);
  const [clientLang, setClientLang] = useState('en-US');
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [apiTier, setApiTier] = useState<'free' | 'paid'>(() => (localStorage.getItem('gemini_api_tier') as 'free' | 'paid') || 'free');
  const [voiceType, setVoiceType] = useState<'Men' | 'Women'>(() => (localStorage.getItem('voice_type') as 'Men' | 'Women') || 'Women');
  const [roomApiKey, setRoomApiKey] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const uiLang = React.useMemo(() => getDefaultLang(), []);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboarding_completed'));
  const virtuosoRef = useRef<any>(null);

  const memoizedTranscripts = transcripts;

  // 自動捲動到最新一筆資料
  useEffect(() => {
    if (virtuosoRef.current && transcripts.length > 0) {
      // 使用 setTimeout 確保 DOM 已經更新
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: transcripts.length - 1,
          align: 'end',
          behavior: 'smooth'
        });
      }, 50);
    }
  }, [transcripts]);

  const [shareSuccess, setShareSuccess] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const saveToHistory = async (transcript: any) => {
    if (!auth.currentUser) return;
    try {
      const historyRef = doc(collection(db, `users/${auth.currentUser.uid}/history`, transcript.id || Date.now().toString()));
      await setDoc(historyRef, {
        original: transcript.original,
        translated: transcript.translated,
        isFinal: true,
        sourceLang: transcript.sourceLang || 'Auto',
        targetLang: transcript.targetLang || 'Auto',
        timestamp: serverTimestamp(),
        speakerId: transcript.speakerId || auth.currentUser.uid,
        speakerName: transcript.speakerName || 'User'
      });
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  };

  useEffect(() => {
    const lastTranscript = transcripts[transcripts.length - 1];
    if (lastTranscript && lastTranscript.isFinal && !lastTranscript.savedToHistory) {
      saveToHistory(lastTranscript);
      setTranscripts(prev => prev.map((t, i) => i === prev.length - 1 ? { ...t, savedToHistory: true } : t));
    }
  }, [transcripts]);

  const [headerTitle1, setHeaderTitle1] = useState(() => localStorage.getItem('header_title_1') || 'TUC');
  const [headerTitle2, setHeaderTitle2] = useState(() => localStorage.getItem('header_title_2') || 'AI Smart Interpreter');
  const [responsiveness, setResponsiveness] = useState(() => localStorage.getItem('responsiveness') || 'normal');
  
  // 費用統計相關 state
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isCostUnlocked, setIsCostUnlocked] = useState(false);
  const [costPasswordInput, setCostPasswordInput] = useState('');
  
  // 連線時間限制相關 state
  const [liveSessionDuration, setLiveSessionDuration] = useState(0);
  const [showTimePrompt, setShowTimePrompt] = useState(false);
  
  // 輸出模式控制
  const [isAudioOutputEnabled, setIsAudioOutputEnabled] = useState(() => {
    const mode = localStorage.getItem('audio_output_mode');
    if (mode === 'None') return false;
    return localStorage.getItem('audio_output') !== 'false';
  });
  const [audioOutputMode, setAudioOutputMode] = useState<'None' | 'Myself' | 'ALL' | 'Others'>(() => (localStorage.getItem('audio_output_mode') as 'None' | 'Myself' | 'ALL' | 'Others') || 'None');
  const [isTextOutputEnabled, setIsTextOutputEnabled] = useState(() => localStorage.getItem('text_output') !== 'false');
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  // Live API Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const isLiveRef = useRef<boolean>(false);
  
  const localLangRef = useRef<string>(localLang);
  const clientLangRef = useRef<string>(clientLang);
  const transcriptsRef = useRef<Transcript[]>([]);
  const isAudioOutputEnabledRef = useRef<boolean>(isAudioOutputEnabled);
  const isTextOutputEnabledRef = useRef<boolean>(isTextOutputEnabled);

  // 讀取與更新費用統計
  useEffect(() => {
    const allStats = JSON.parse(localStorage.getItem('api_usage_stats') || '{}');
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const stats = allStats[userApiKey] || { month: currentMonth, seconds: 0 };
    
    if (stats.month !== currentMonth) {
      allStats[userApiKey] = { month: currentMonth, seconds: 0 };
      localStorage.setItem('api_usage_stats', JSON.stringify(allStats));
      setSessionSeconds(0);
    } else {
      setSessionSeconds(stats.seconds || 0);
    }
  }, [userApiKey]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isRecording) {
      startLiveSession();
    }
    
    if (isRecording) {
      interval = setInterval(() => {
        setSessionSeconds(prev => {
          const newVal = prev + 1;
          const currentMonth = new Date().toISOString().slice(0, 7);
          const allStats = JSON.parse(localStorage.getItem('api_usage_stats') || '{}');
          allStats[userApiKey] = { month: currentMonth, seconds: newVal };
          localStorage.setItem('api_usage_stats', JSON.stringify(allStats));
          return newVal;
        });

        setLiveSessionDuration(prev => prev + 1);
      }, 1000);
    } else {
      stopLiveSession();
      setLiveSessionDuration(0);
      setShowTimePrompt(false);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (liveSessionDuration === 3600 || liveSessionDuration === 7200) {
      if (user && roomCreatorId && user.uid === roomCreatorId) {
        setShowTimePrompt(true);
      }
    } else if (liveSessionDuration >= 10800) {
      if (user && roomCreatorId && user.uid === roomCreatorId) {
        stopLiveSession();
        setCustomAlert({ message: "連續使用已達三小時，系統強制斷線。", type: 'alert' });
        setLiveSessionDuration(0);
      }
    }
  }, [liveSessionDuration, user, roomCreatorId]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showTimePrompt) {
      timeout = setTimeout(() => {
        stopLiveSession();
        setShowTimePrompt(false);
        setCustomAlert({ message: "閒置超過3分鐘，系統已自動斷線。", type: 'alert' });
      }, 3 * 60 * 1000); // 3 minutes
    }
    return () => clearTimeout(timeout);
  }, [showTimePrompt]);

  useEffect(() => {
    localStorage.setItem('user_name', userName);
  }, [userName]);

  // Handle page unload for room creator
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 移除自動關閉房間邏輯，避免頁面重新整理時誤觸
      console.log("Page unloading, not closing room automatically.");
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomId, user, roomCreatorId]);

  // 同步 state 到 ref，供事件回呼使用
  useEffect(() => {
    transcriptsRef.current = transcripts;

    // Sync newly finalized transcripts to Firestore
    if (roomId && user) {
      const lastTranscript = transcripts[transcripts.length - 1];
      if (lastTranscript && lastTranscript.isFinal && !lastTranscript.id.startsWith('fs-')) {
        // Mark as synced to avoid duplicate writes
        const transcriptToSave = { ...lastTranscript, id: `fs-${lastTranscript.id}` };
        
        // We need to update local state to mark it as synced, but doing it here might cause infinite loop.
        // Instead, we can just write to Firestore. The snapshot listener will pull it back.
        // To avoid duplicates in UI, our snapshot listener merges based on `isFinal`.
        // Actually, the snapshot listener replaces the local final transcripts.
        // So we just write it once.
        
        const saveToFirestore = async () => {
          try {
            // 更新本地 ID，確保與 Firestore 的同步一致性
            setTranscripts(prev => prev.map(t => t.id === lastTranscript.id ? transcriptToSave : t));
            
            const docRef = doc(db, 'rooms', roomId, 'transcripts', transcriptToSave.id);
            await setDoc(docRef, {
              original: transcriptToSave.original,
              translated: transcriptToSave.translated,
              isFinal: true,
              sourceLang: transcriptToSave.sourceLang,
              targetLang: transcriptToSave.targetLang,
              timestamp: serverTimestamp(),
              speakerId: user.uid,
              ...(userName ? { speakerName: userName } : {})
            }, { merge: true });
            console.log('Transcript saved to Firestore successfully');
          } catch (e) {
            console.error("Failed to save transcript to Firestore", e);
          }
        };
        saveToFirestore();
      }
    }
  }, [transcripts, roomId, user, userName]);

  // Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 保持螢幕喚醒
  const wakeLockRef = useRef<any>(null);
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('Wake Lock active');
        }
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          console.warn('Wake Lock permission denied, skipping.');
        } else {
          console.error('Wake Lock request failed:', err);
        }
      }
    };

    if (isRecording) {
      requestWakeLock();
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [isRecording]);

  // Firebase Connections & Room Sync
  useEffect(() => {
    if (!isAuthReady || !user) return;

    // 1. Maintain connection document
    const connRef = doc(db, 'connections', user.uid);
    const updateConnection = async () => {
      try {
        const connData: any = {
          lastActive: serverTimestamp()
        };
        if (roomId) {
          connData.roomId = roomId;
        }
        await setDoc(connRef, connData);
      } catch (e) {
        console.error("Failed to update connection", e);
      }
    };
    updateConnection();
    const connInterval = setInterval(updateConnection, 30000); // Heartbeat every 30s

    // 2. Listen to active connections
    const qConnections = query(collection(db, 'connections'));
    const unsubConnections = onSnapshot(qConnections, (snapshot) => {
      // Count connections active in the last 2 minutes
      const now = Date.now();
      let count = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.lastActive) {
          const lastActiveMs = data.lastActive.toMillis();
          if (now - lastActiveMs < 120000) {
            count++;
          }
        }
      });
      setActiveConnections(count);
    });

    // 3. Listen to Room Transcripts if roomId exists
    let unsubTranscripts: () => void;
    let unsubRoom: () => void;
    if (roomId) {
      const roomRef = doc(db, 'rooms', roomId);
      unsubRoom = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRoomCreatorId(data.creatorId);
          if (data.apiKey) {
            setRoomApiKey(data.apiKey);
          }
          if (data.apiKeyType) {
            setApiKeyType(data.apiKeyType);
          }
          if (data.projectName) {
            setProjectName(data.projectName);
          }
          if (data.isSpeakingEnabled !== undefined && data.isSpeakingEnabled !== isRecordingRef.current) {
            setIsSpeakingEnabled(data.isSpeakingEnabled);
            setIsRecording(data.isSpeakingEnabled);
          }
          if (data.isClosed === true) {
            setCustomAlert({ 
              message: "房間已由建立者關閉，連線已失效。", 
              type: 'alert',
              onConfirm: () => {
                window.location.href = '/';
              }
            });
            stopLiveSession();
          }
        } else {
          // Room deleted or doesn't exist
          setCustomAlert({ 
            message: "房間已關閉或不存在", 
            type: 'alert',
            onConfirm: () => {
              window.location.href = '/';
            }
          });
          stopLiveSession();
        }
      }, (error) => {
        console.error("Error listening to room:", error);
      });

      const qTranscripts = query(collection(db, 'rooms', roomId, 'transcripts'), orderBy('timestamp', 'asc'));
      unsubTranscripts = onSnapshot(qTranscripts, (snapshot) => {
        console.log("Transcript snapshot received, count:", snapshot.size);
        const firestoreTranscripts: Transcript[] = [];
        snapshot.forEach(doc => {
          console.log("Transcript doc:", doc.id, doc.data());
          firestoreTranscripts.push({ id: doc.id, ...doc.data() } as Transcript);
        });
        
        // 智能合併：Firestore 資料為主，本地非最終狀態為輔
        setTranscripts(prev => {
          const firestoreIds = new Set(firestoreTranscripts.map(t => t.id));
          
          // 1. 更新已存在的 Firestore 資料
          // 2. 保留本地尚未同步的非最終狀態資料
          const localNonFinal = prev.filter(t => !t.isFinal && !firestoreIds.has(t.id));
          
          // 確保排序穩定：Firestore 資料已按 timestamp 排序
          const merged = [...firestoreTranscripts, ...localNonFinal].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
          console.log("Merged transcripts:", merged);
          return merged;
        });
      }, (error) => {
        console.error("Error listening to transcripts:", error);
      });
    }

    return () => {
      clearInterval(connInterval);
      unsubConnections();
      if (unsubTranscripts) unsubTranscripts();
      if (unsubRoom) unsubRoom();
    };
  }, [isAuthReady, user, roomId]);

  const handleCreateRoom = async () => {
    let currentUser = user;
    if (!currentUser) {
      try {
        currentUser = await signInAnon();
      } catch (e) {
        console.warn("Anonymous sign in failed, trying Google", e);
        try {
          currentUser = await signInWithGoogle();
        } catch (err: any) {
          setCustomAlert({ message: "登入失敗，請確認瀏覽器是否阻擋彈出視窗：" + err.message, type: 'alert' });
          return;
        }
      }
    }
    if (!currentUser) return;

    if (activeConnections >= 100) {
      setCustomAlert({ message: "系統警告：目前線上人數已達 100 人上限，無法建立新連線。請稍後再試。", type: 'alert' });
      return;
    }
    
    if (!userApiKey) {
      setCustomAlert({ message: "請輸入您的 API 金鑰，再建立房間。", type: 'alert' });
      return;
    }

    try {
      const newRoomId = Math.random().toString(36).substring(2, 9);
      await setDoc(doc(db, 'rooms', newRoomId), {
        creatorId: currentUser.uid,
        createdAt: serverTimestamp(),
        apiKey: userApiKey,
        apiKeyType: apiKeyType,
        projectName: projectName,
        isSpeakingEnabled: false,
        isClosed: false
      });
      setRoomId(newRoomId);
      setShowRoomDialog(false);
      window.history.replaceState({}, '', `?room=${newRoomId}`);
    } catch (e: any) {
      console.error(e);
      setCustomAlert({ message: "建立房間失敗：" + e.message, type: 'alert' });
    }
  };

  const handleJoinRoom = async () => {
    let currentUser = user;
    if (!currentUser) {
      try {
        currentUser = await signInAnon();
      } catch (e) {
        // Fallback to Google sign in if anonymous auth is disabled
        try {
          currentUser = await signInWithGoogle();
        } catch (err: any) {
          setCustomAlert({ message: "登入失敗，請確認瀏覽器是否阻擋彈出視窗：" + err.message, type: 'alert' });
          return;
        }
      }
    }
    if (!currentUser) return;

    if (activeConnections >= 100) {
      setCustomAlert({ message: "系統警告：目前線上人數已達 100 人上限，無法建立新連線。請稍後再試。", type: 'alert' });
      return;
    }
    if (!joinRoomIdInput.trim()) return;
    
    try {
      const roomSnap = await getDoc(doc(db, 'rooms', joinRoomIdInput.trim()));
      if (roomSnap.exists()) {
        setRoomId(joinRoomIdInput.trim());
        setShowRoomDialog(false);
        window.history.replaceState({}, '', `?room=${joinRoomIdInput.trim()}`);
      } else {
        setCustomAlert({ message: "找不到此房間代碼", type: 'alert' });
      }
    } catch (e: any) {
      console.error(e);
      setCustomAlert({ message: "加入房間失敗：" + e.message, type: 'alert' });
    }
  };

  const handleClearRoomChat = async () => {
    if (!roomId || !user || roomCreatorId !== user.uid) return;
    setCustomAlert({
      message: "確定要清除所有對話紀錄嗎？此操作無法復原。",
      type: 'confirm',
      onConfirm: async () => {
        try {
          const q = query(collection(db, 'rooms', roomId, 'transcripts'));
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          // 修正：明確清空本地狀態
          setTranscripts([]);
        } catch (e) {
          console.error("清除失敗", e);
        }
      }
    });
  };

  const handleShareUrl = () => {
    const url = `https://translator-navy-pi.vercel.app/?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2000);
  };


  useEffect(() => {
    isAudioOutputEnabledRef.current = isAudioOutputEnabled;
    localStorage.setItem('audio_output', isAudioOutputEnabled.toString());
    localStorage.setItem('audio_output_mode', audioOutputMode);
  }, [isAudioOutputEnabled, audioOutputMode]);

  useEffect(() => {
    isTextOutputEnabledRef.current = isTextOutputEnabled;
    localStorage.setItem('text_output', isTextOutputEnabled.toString());
  }, [isTextOutputEnabled]);

  useEffect(() => {
    localStorage.setItem('voice_type', voiceType);
  }, [voiceType]);

  useEffect(() => {
    localLangRef.current = localLang;
  }, [localLang]);

  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  
  const roomIdRef = useRef(roomId);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  // Yjs Foundation
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const yTranscriptsRef = useRef<Y.Array<any>>(ydocRef.current.getArray('transcripts'));

  useEffect(() => {
    // 初始化 Socket.io 連線
    socketRef.current = io({
      path: "/socket.io",
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket'] // 強制使用 websocket 以提升穩定性
    });

    const ydoc = ydocRef.current;

    // Listen for local Yjs updates and broadcast them
    let updateTimeout: NodeJS.Timeout | null = null;
    ydoc.on('update', (update) => {
      if (updateTimeout) return;
      updateTimeout = setTimeout(() => {
        if (roomIdRef.current) {
          socketRef.current?.emit('yjs-update', { roomId: roomIdRef.current, update });
        }
        updateTimeout = null;
      }, 100); // 節流：每 100ms 最多發送一次更新
    });

    socketRef.current.on('yjs-update', (update: ArrayBuffer) => {
      // Apply remote updates to local Yjs document
      Y.applyUpdate(ydoc, new Uint8Array(update));
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketRef.current?.id);
      setIsSocketConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsSocketConnected(false);
    });

    socketRef.current.on('translation chunk', (data) => {
      setTranscripts(prev => {
        const newTranscripts = [...prev];
        const lastIndex = newTranscripts.length - 1;
        if (lastIndex >= 0) {
          newTranscripts[lastIndex] = {
            ...newTranscripts[lastIndex],
            translated: (newTranscripts[lastIndex].translated || "") + data.chunk,
            isTranslating: true
          };
        }
        return newTranscripts;
      });
    });

    socketRef.current.on('translation end', () => {
      setTranscripts(prev => {
        const newTranscripts = [...prev];
        const lastIndex = newTranscripts.length - 1;
        if (lastIndex >= 0) {
          newTranscripts[lastIndex] = {
            ...newTranscripts[lastIndex],
            isTranslating: false
          };
        }
        return newTranscripts;
      });
    });

    socketRef.current.on('translation error', (data) => {
      console.error("Translation error from server:", data.error);
      toast.error(`翻譯失敗: ${data.error}`);
      setErrorMsg(`翻譯失敗: ${data.error}`);
      setTranscripts(prev => {
        const newTranscripts = [...prev];
        const lastIndex = newTranscripts.length - 1;
        if (lastIndex >= 0) {
          newTranscripts[lastIndex] = {
            ...newTranscripts[lastIndex],
            isTranslating: false,
            translated: newTranscripts[lastIndex].translated || "(翻譯失敗)"
          };
        }
        return newTranscripts;
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socketRef.current && roomId && isSocketConnected) {
      socketRef.current.emit('join-room', roomId);
    }
  }, [roomId, isSocketConnected]);

  // 使用 ref 快取驗證狀態，避免重複請求
  const apiKeyValidationCache = useRef<{ [key: string]: { type: 'paid' | 'free', projectName: string } }>({});

  const inferApiKeyInfo = async (key: string) => {
    if (!key) return;

    // 檢查快取
    if (apiKeyValidationCache.current[key]) {
      const cached = apiKeyValidationCache.current[key];
      setApiKeyType(cached.type);
      setProjectName(cached.projectName);
      return;
    }

    try {
      // 使用 fetch 直接呼叫 API 以獲取 Response Headers
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: "test" }] }] })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Key validation failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // 檢查速率限制標頭 (x-ratelimit-limit)
      const rateLimit = response.headers.get('x-ratelimit-limit');
      const limit = rateLimit ? parseInt(rateLimit, 10) : 0;
      
      // 根據速率限制判斷：免費版通常較低 (例如 15 RPM)，付費版較高
      const type = limit > 50 ? 'paid' : 'free';
      const projectName = 'Interpreter';

      const result = { type, projectName };
      apiKeyValidationCache.current[key] = result;
      setApiKeyType(result.type);
      setProjectName(result.projectName);
      console.log(`API Key validated: ${type}, Rate Limit: ${limit}`);
    } catch (e) {
      console.error("API Key validation failed:", e);
      // 驗證失敗時，保持原狀態
    }
  };

  useEffect(() => {
    localStorage.setItem('gemini_api_key', userApiKey);
    localStorage.setItem('api_key_type', apiKeyType);
    localStorage.setItem('project_name', projectName);
    localStorage.setItem('gemini_api_tier', apiTier);
    
    // 使用 debounce 避免頻繁觸發驗證
    const handler = setTimeout(() => {
      inferApiKeyInfo(userApiKey);
    }, 1000);
    
    return () => clearTimeout(handler);
  }, [userApiKey, apiTier]);

  useEffect(() => {
    localStorage.setItem('header_title_1', headerTitle1);
  }, [headerTitle1]);

  useEffect(() => {
    localStorage.setItem('header_title_2', headerTitle2);
  }, [headerTitle2]);

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
        'title1': 'TUC',
        'title2': 'AI Smart Interpreter',
        'local': 'Local (本地端)',
        'client': 'Client (客戶端)',
        'systemReady': '系統就緒',
        'adminSettings': '管理者設定',
        'darkMode': isDarkMode ? '切換至亮色模式' : '切換至暗色模式',
        'audioOutput': '語音輸出',
        'textTranscript': '文字記錄',
        'speaking': '說話中',
        'stop': '停止',
        'share': shareSuccess ? '分享成功' : '分享',
        'clear': '清除',
        'confirmClear': '確定清除',
        'clearTitle': '清除對話記錄',
        'clearDesc': '確定要清除所有的對話記錄嗎？此動作無法復原。',
        'cancel': '取消',
        'lang_zh_TW': '繁體中文',
        'lang_en_US': '美式英語',
        'lang_en_GB': '英式英語',
        'lang_ja_JP': '日語',
        'lang_fr_FR': '法語',
        'lang_th_TH': '泰語',
        'lang_vi_VN': '越南語',
        'lang_id_ID': '印尼語',
        'lang_ms_MY': '馬來語',
      },
      'en-US': {
        'title1': 'TUC',
        'title2': 'AI Smart Interpreter',
        'local': 'Local',
        'client': 'Client',
        'systemReady': 'System Ready',
        'adminSettings': 'Admin Settings',
        'darkMode': isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        'audioOutput': 'Audio Output',
        'textTranscript': 'Text Transcript',
        'speaking': 'Speaking',
        'stop': 'Stop',
        'share': shareSuccess ? 'Shared' : 'Share',
        'clear': 'Clear',
        'confirmClear': 'Confirm Clear',
        'clearTitle': 'Clear Transcript',
        'clearDesc': 'Are you sure you want to clear all transcripts? This action cannot be undone.',
        'cancel': 'Cancel',
        'lang_zh_TW': 'Traditional Chinese',
        'lang_en_US': 'American English',
        'lang_en_GB': 'British English',
        'lang_ja_JP': 'Japanese',
        'lang_fr_FR': 'French',
        'lang_th_TH': 'Thai',
        'lang_vi_VN': 'Vietnamese',
        'lang_id_ID': 'Indonesian',
        'lang_ms_MY': 'Malay',
      },
      'ja-JP': {
        'title1': 'TUC',
        'title2': 'AI Smart Interpreter',
        'local': 'ローカル',
        'client': 'クライアント',
        'systemReady': 'システム準備完了',
        'adminSettings': '管理者設定',
        'darkMode': isDarkMode ? 'ライトモードへ' : 'ダークモードへ',
        'audioOutput': '音声出力',
        'textTranscript': '文字記録',
        'speaking': '話す',
        'stop': '停止',
        'share': shareSuccess ? '共有完了' : '共有',
        'clear': 'クリア',
        'confirmClear': '確定してクリア',
        'clearTitle': '会話履歴をクリア',
        'clearDesc': 'すべての会話履歴をクリアしますか？この操作は取り消せません。',
        'cancel': 'キャンセル',
        'lang_zh_TW': '繁體中文',
        'lang_en_US': 'アメリカ英語',
        'lang_en_GB': 'イギリス英語',
        'lang_ja_JP': '日本語',
        'lang_fr_FR': 'フランス語',
        'lang_th_TH': 'タイ語',
        'lang_vi_VN': 'ベトナム語',
        'lang_id_ID': 'インドネシア語',
        'lang_ms_MY': 'マレー語',
      },
      'en-GB': {
        'title1': 'TUC',
        'title2': 'AI Smart Interpreter',
        'local': 'Local',
        'client': 'Client',
        'systemReady': 'System Ready',
        'adminSettings': 'Admin Settings',
        'darkMode': isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        'audioOutput': 'Audio Output',
        'textTranscript': 'Text Transcript',
        'speaking': 'Speaking',
        'stop': 'Stop',
        'share': shareSuccess ? 'Shared' : 'Share',
        'clear': 'Clear',
        'confirmClear': 'Confirm Clear',
        'clearTitle': 'Clear Transcript',
        'clearDesc': 'Are you sure you want to clear all transcripts? This action cannot be undone.',
        'cancel': 'Cancel',
        'lang_zh_TW': 'Traditional Chinese',
        'lang_en_US': 'American English',
        'lang_en_GB': 'British English',
        'lang_ja_JP': 'Japanese',
        'lang_fr_FR': 'French',
        'lang_th_TH': 'Thai',
        'lang_vi_VN': 'Vietnamese',
        'lang_id_ID': 'Indonesian',
        'lang_ms_MY': 'Malay',
      },
      'fr-FR': {
        'title1': 'TUC',
        'title2': 'AI Smart Interpreter',
        'local': 'Local',
        'client': 'Client',
        'systemReady': 'Système prêt',
        'adminSettings': 'Paramètres admin',
        'darkMode': isDarkMode ? 'Mode clair' : 'Mode sombre',
        'audioOutput': 'Sortie audio',
        'textTranscript': 'Transcription',
        'speaking': 'Parler',
        'stop': 'Arrêter',
        'share': shareSuccess ? 'Partagé' : 'Partager',
        'clear': 'Effacer',
        'confirmClear': 'Confirmer',
        'clearTitle': 'Effacer la transcription',
        'clearDesc': 'Êtes-vous sûr de vouloir effacer toutes les transcriptions ? Cette action est irréversible.',
        'cancel': 'Annuler',
        'lang_zh_TW': 'Chinois traditionnel',
        'lang_en_US': 'Anglais américain',
        'lang_en_GB': 'Anglais britannique',
        'lang_ja_JP': 'Japonais',
        'lang_fr_FR': 'Français',
        'lang_th_TH': 'Thaï',
        'lang_vi_VN': 'Vietnamien',
        'lang_id_ID': 'Indonésien',
        'lang_ms_MY': 'Malais',
      },
      'th-TH': {
        'title1': 'TUC',
        'title2': 'AI Smart Interpreter',
        'local': 'ท้องถิ่น',
        'client': 'ลูกค้า',
        'systemReady': 'ระบบพร้อม',
        'adminSettings': 'การตั้งค่าผู้ดูแลระบบ',
        'darkMode': isDarkMode ? 'โหมดสว่าง' : 'โหมดมืด',
        'audioOutput': 'เอาต์พุตเสียง',
        'textTranscript': 'การถอดความ',
        'speaking': 'กำลังพูด',
        'stop': 'หยุด',
        'share': shareSuccess ? 'แชร์แล้ว' : 'แชร์',
        'clear': 'ล้าง',
        'confirmClear': 'ยืนยันการล้าง',
        'clearTitle': 'ล้างการถอดความ',
        'clearDesc': 'คุณแน่ใจหรือไม่ว่าต้องการล้างการถอดความทั้งหมด? การดำเนินการนี้ไม่สามารถยกเลิกได้',
        'cancel': 'ยกเลิก',
        'lang_zh_TW': 'จีนดั้งเดิม',
        'lang_en_US': 'อังกฤษอเมริกัน',
        'lang_en_GB': 'อังกฤษบริเตน',
        'lang_ja_JP': 'ญี่ปุ่น',
        'lang_fr_FR': 'ฝรั่งเศส',
        'lang_th_TH': 'ไทย',
        'lang_vi_VN': 'เวียดนาม',
        'lang_id_ID': 'อินโดนีเซีย',
        'lang_ms_MY': 'มลายู',
      },
      'vi-VN': {
        'title1': 'TUC',
        'title2': 'AI Smart Interpreter',
        'local': 'Địa phương',
        'client': 'Khách hàng',
        'systemReady': 'Hệ thống sẵn sàng',
        'adminSettings': 'Cài đặt quản trị',
        'darkMode': isDarkMode ? 'Chế độ sáng' : 'Chế độ tối',
        'audioOutput': 'Đầu ra âm thanh',
        'textTranscript': 'Bản ghi văn bản',
        'speaking': 'Đang nói',
        'stop': 'Dừng',
        'share': shareSuccess ? 'Đã chia sẻ' : 'Chia sẻ',
        'clear': 'Xóa',
        'confirmClear': 'Xác nhận xóa',
        'clearTitle': 'Xóa bản ghi',
        'clearDesc': 'Bạn có chắc chắn muốn xóa tất cả bản ghi không? Hành động này không thể hoàn tác.',
        'cancel': 'Hủy',
        'lang_zh_TW': 'Trung Quốc truyền thống',
        'lang_en_US': 'Tiếng Anh Mỹ',
        'lang_en_GB': 'Tiếng Anh Anh',
        'lang_ja_JP': 'Tiếng Nhật',
        'lang_fr_FR': 'Tiếng Pháp',
        'lang_th_TH': 'Tiếng Thái',
        'lang_vi_VN': 'Tiếng Việt',
        'lang_id_ID': 'Tiếng Indonesia',
        'lang_ms_MY': 'Tiếng Mã Lai',
      },
      'id-ID': {
        'title1': 'TUC',
        'title2': 'AI Smart Interpreter',
        'local': 'Lokal',
        'client': 'Klien',
        'systemReady': 'Sistem siap',
        'adminSettings': 'Pengaturan admin',
        'darkMode': isDarkMode ? 'Mode terang' : 'Mode gelap',
        'audioOutput': 'Output audio',
        'textTranscript': 'Transkrip teks',
        'speaking': 'Berbicara',
        'stop': 'Berhenti',
        'share': shareSuccess ? 'Dibagikan' : 'Bagikan',
        'clear': 'Hapus',
        'confirmClear': 'Konfirmasi hapus',
        'clearTitle': 'Hapus transkrip',
        'clearDesc': 'Apakah Anda yakin ingin menghapus semua transkrip? Tindakan ini tidak dapat dibatalkan.',
        'cancel': 'Batal',
        'lang_zh_TW': 'Tionghoa Tradisional',
        'lang_en_US': 'Inggris Amerika',
        'lang_en_GB': 'Inggris Britania',
        'lang_ja_JP': 'Jepang',
        'lang_fr_FR': 'Prancis',
        'lang_th_TH': 'Thai',
        'lang_vi_VN': 'Vietnam',
        'lang_id_ID': 'Indonesia',
        'lang_ms_MY': 'Melayu',
      },
      'ms-MY': {
        'title1': 'TUC',
        'title2': 'AI Smart Interpreter',
        'local': 'Tempatan',
        'client': 'Pelanggan',
        'systemReady': 'Sistem sedia',
        'adminSettings': 'Tetapan admin',
        'darkMode': isDarkMode ? 'Mod cerah' : 'Mod gelap',
        'audioOutput': 'Output audio',
        'textTranscript': 'Transkrip teks',
        'speaking': 'Bercakap',
        'stop': 'Berhenti',
        'share': shareSuccess ? 'Dikongsi' : 'Kongsi',
        'clear': 'Padam',
        'confirmClear': 'Sahkan padam',
        'clearTitle': 'Padam transkrip',
        'clearDesc': 'Adakah anda pasti mahu memadam semua transkrip? Tindakan ini tidak boleh dibatalkan.',
        'cancel': 'Batal',
        'lang_zh_TW': 'Cina Tradisional',
        'lang_en_US': 'Inggeris Amerika',
        'lang_en_GB': 'Inggeris British',
        'lang_ja_JP': 'Jepun',
        'lang_fr_FR': 'Perancis',
        'lang_th_TH': 'Thai',
        'lang_vi_VN': 'Vietnam',
        'lang_id_ID': 'Indonesia',
        'lang_ms_MY': 'Melayu',
      },
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
      const speaker = `[${t.speakerName || '匿名'}] `;
      return `${speaker}原文：${t.original}\n翻譯：${t.translated}`;
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
    transcriptEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [transcripts]);

  // 清除資源
  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, []);

  const playAudioChunk = (base64Audio: string) => {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const audioCtx = playbackContextRef.current;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const binary = atob(base64Audio);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }
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

    const currentTime = audioCtx.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }

    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;
  };

  const stopLiveSession = async () => {
    isLiveRef.current = false;
    setIsRecording(false);

    if (roomId && user && roomCreatorId && user.uid === roomCreatorId) {
      console.log("Room session stopped, but not closing room automatically.");
    }

    // 1. 停止媒體串流
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // 2. 關閉 Live Session
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.error("Error closing session:", e);
      }
      sessionRef.current = null;
    }

    // 3. 徹底釋放 AudioContext 與處理器
    if (processorRef.current) {
      try {
        processorRef.current.port.onmessage = null;
        processorRef.current.port.close();
        processorRef.current.disconnect();
      } catch (e) {
        console.error("Error disconnecting processor:", e);
      }
      processorRef.current = null;
    }

    if (filterRef.current) {
      try {
        filterRef.current.disconnect();
      } catch (e) {
        console.error("Error disconnecting filter:", e);
      }
      filterRef.current = null;
    }

    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (e) {
        console.error("Error disconnecting source:", e);
      }
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state === 'running') {
          await audioContextRef.current.suspend();
        }
      } catch (e) {
        console.error("Error suspending AudioContext:", e);
      }
      // 不設為 null，保留實例以便重連時使用
    }

    if (playbackContextRef.current) {
      try {
        if (playbackContextRef.current.state !== 'closed') {
          await playbackContextRef.current.close();
        }
      } catch (e) {
        console.error("Error closing playbackContext:", e);
      }
      playbackContextRef.current = null;
    }
    
    nextPlayTimeRef.current = 0;
  };

  const startLiveSession = async () => {
    if (isLiveRef.current) return;
    const effectiveApiKey = (user && roomCreatorId && user.uid === roomCreatorId) ? userApiKey : (roomApiKey || userApiKey);
    
    if (!effectiveApiKey) {
      if (user && roomCreatorId && user.uid === roomCreatorId) {
        setErrorMsg('請先在管理者設定中配置您的 API 金鑰。');
        setShowAdminSettings(true);
      } else {
        setErrorMsg('無法取得房間的 API 金鑰，請聯繫建立者。');
      }
      return;
    }

    setIsRecording(true);
    isLiveRef.current = true;
    setErrorMsg(null);
    lastMessageTimeRef.current = Date.now();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("您的瀏覽器不支援麥克風，請嘗試使用 Safari 或 Chrome 瀏覽器開啟此網頁。");
      }

      // 盡量重複使用 AudioContext，避免在 setTimeout 中重新建立導致 suspended 狀態
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      let audioCtx = audioContextRef.current;
      
      if (!audioCtx || audioCtx.state === 'closed') {
        // 設定 sampleRate: 16000 讓瀏覽器原生進行高品質重採樣，避免手動線性內插導致音質下降
        audioCtx = new AudioContextClass({ latencyHint: 'interactive', sampleRate: 16000 });
        audioContextRef.current = audioCtx;
      }
      
      if (audioCtx.state === 'suspended') {
        try {
          await audioCtx.resume();
        } catch (e) {
          console.warn("Could not resume AudioContext:", e);
        }
      }

      let stream;
      try {
        // iOS WebKit 要求 getUserMedia 必須在使用者互動後立即執行
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: { ideal: 44100 },
            channelCount: 1,
          } 
        });
      } catch (err: any) {
        console.error("麥克風存取錯誤:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw new Error("麥克風權限被拒絕。請點擊瀏覽器網址列旁的鎖頭圖示，允許此網站存取您的麥克風。");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          throw new Error("找不到麥克風裝置，請確認您的設備已連接麥克風。");
        } else {
          throw new Error("無法存取麥克風：" + err.message);
        }
      }
      mediaStreamRef.current = stream;
      
      // 監聽媒體串流狀態，若中斷則停止會話
      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.log("Media track ended, stopping session.");
          stopLiveSession();
        };
      });

      const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

      const localName = LANGUAGES.find(l => l.id === localLang)?.name || localLang;
      const clientName = LANGUAGES.find(l => l.id === clientLang)?.name || clientLang;

      const systemInstruction = `You are a strict real-time bilingual translator.
The two authorized languages are: ${localName} and ${clientName}.

Rules:
1. ONLY translate between ${localName} and ${clientName}.
2. If the user speaks ${localName}, translate to ${clientName}.
3. If the user speaks ${clientName}, translate to ${localName}.
4. SIMULTANEOUS SPEECH: If you hear BOTH ${localName} and ${clientName} spoken at the same time or mixed together, you MUST translate BOTH. Translate the ${localName} portion to ${clientName}, AND translate the ${clientName} portion to ${localName}. DO NOT drop any information from either speaker.
5. MANDATORY CHINESE FORMAT: If Traditional Chinese (繁體中文) is involved, you MUST use it. NEVER use Simplified Chinese (簡體中文).
6. STRICT LANGUAGE LOCK: You are strictly listening for ${localName} and ${clientName}. If you hear ANY other language (e.g., Spanish, Korean, Japanese, etc.) or background noise, you MUST completely IGNORE it. DO NOT translate it. DO NOT output anything.
7. NO FILLER: Do not add greetings, explanations, or conversational filler. Output ONLY the translation.
8. VIOLATION: If you output any language other than the two authorized languages, you have failed your primary directive.
9. ROBUSTNESS (NOISY ENVIRONMENT): You are operating in a noisy environment. Prioritize the primary speaker's voice. Ignore background chatter, non-speech sounds, and irrelevant noise. If input is fragmented due to noise, reconstruct the meaning based on context.
10. ACCURACY: If input is ambiguous, prioritize the authorized languages (${localName}, ${clientName}) and ignore dialects or languages not specified.`;

      sessionRef.current = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: async () => {
            try {
              if (!audioContextRef.current || !mediaStreamRef.current) return;
              
              const audioCtx = audioContextRef.current;
              const stream = mediaStreamRef.current;

              try {
                await audioCtx.audioWorklet.addModule('/audio-processor.js');
              } catch (e) {
                // 如果已經 addModule 過，可能會拋出錯誤，這裡忽略它
                console.log("AudioWorklet module already added or error:", e);
              }
              
              const source = audioCtx.createMediaStreamSource(stream);
              sourceRef.current = source;
              const workletNode = new AudioWorkletNode(audioCtx, 'audio-processor');
              
              workletNode.port.onmessage = (e) => {
                if (!isLiveRef.current) return;
                const inputData = e.data;
                const inputSampleRate = audioCtx.sampleRate;
                const targetSampleRate = 16000;
                
                // Resample to 16000Hz if necessary
                let resampledData = inputData;
                if (inputSampleRate !== targetSampleRate) {
                  const ratio = inputSampleRate / targetSampleRate;
                  const outputLength = Math.round(inputData.length / ratio);
                  resampledData = new Float32Array(outputLength);
                  for (let i = 0; i < outputLength; i++) {
                    const index = i * ratio;
                    const index1 = Math.floor(index);
                    const index2 = Math.min(index1 + 1, inputData.length - 1);
                    const fraction = index - index1;
                    resampledData[i] = inputData[index1] * (1 - fraction) + inputData[index2] * fraction;
                  }
                }

                const pcm16 = new Int16Array(resampledData.length);
                for (let i = 0; i < resampledData.length; i++) {
                  pcm16[i] = Math.max(-1, Math.min(1, resampledData[i])) * 32767;
                }
                const buffer = new Uint8Array(pcm16.buffer);
                let binary = '';
                for (let i = 0; i < buffer.byteLength; i++) {
                  binary += String.fromCharCode(buffer[i]);
                }
                const base64 = btoa(binary);

                if (sessionRef.current) {
                  sessionRef.current.sendRealtimeInput({ audio: { mimeType: "audio/pcm;rate=16000", data: base64 } });
                }
              };

              // Add high-pass filter
              const filter = audioCtx.createBiquadFilter();
              filter.type = 'highpass';
              filter.frequency.value = 150;
              filterRef.current = filter;

              source.connect(filter);
              filter.connect(workletNode);
              workletNode.connect(audioCtx.destination);
              processorRef.current = workletNode;
            } catch (err) {
              console.error("Audio processing error:", err);
              setErrorMsg("音訊處理發生錯誤");
              stopLiveSession();
            }
          },
          onmessage: (message: any) => {
            lastMessageTimeRef.current = Date.now();
            // 簡化日誌，避免過多輸出
            if (message.serverContent?.inputTranscription?.text || message.serverContent?.modelTurn?.parts) {
              console.log("Received message content:", JSON.stringify(message.serverContent, null, 2));
            }

            // 轉換文字為繁體中文 (如果設定包含 zh-TW)
            const convertToTwIfNeeded = (text: string) => {
              if (localLang === 'zh-TW' || clientLang === 'zh-TW') {
                return s2tConverter(text);
              }
              return text;
            };

            // 過濾非指定語系的字元 (避免 STT 幻覺產生韓文/日文等)
            const filterUnsupportedScripts = (text: string) => {
              if (!text) return text;
              
              const langs = [localLangRef.current, clientLangRef.current];
              const hasKorean = langs.some(l => l.startsWith('ko'));
              const hasJapanese = langs.some(l => l.startsWith('ja'));
              const hasChinese = langs.some(l => l.startsWith('zh'));
              const hasThai = langs.some(l => l.startsWith('th'));
              
              let filtered = text;
              // 僅在必要時執行替換
              if (!hasKorean) filtered = filtered.replace(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g, '');
              if (!hasJapanese) filtered = filtered.replace(/[\u3040-\u309F\u30A0-\u30FF]/g, '');
              if (!hasThai) filtered = filtered.replace(/[\u0E00-\u0E7F]/g, '');
              if (!hasChinese && !hasJapanese) filtered = filtered.replace(/[\u4E00-\u9FFF]/g, '');
              
              return filtered;
            };

            // 1. 處理使用者的語音轉文字 (inputTranscription)
            // 僅處理使用者輸入，避免將 AI 的輸出誤判為輸入
            const inTranscript = message.serverContent?.inputTranscription;
            if (inTranscript?.text) {
              let cleanedText = filterUnsupportedScripts(inTranscript.text);
              
              // 修正：即使過濾後只剩下標點符號，也應該顯示，避免被誤判為無效內容
              if (!cleanedText && inTranscript.text.trim()) {
                cleanedText = inTranscript.text.trim();
              }
              
              if (cleanedText) {
                const processedText = convertToTwIfNeeded(cleanedText);
                setTranscripts(prev => {
                  const last = prev[prev.length - 1];
                  // inputTranscription 是累積的，所以直接替換
                  if (last && !last.isFinal) {
                    // 如果原本是佔位符，就直接替換掉。如果是累積的，也直接替換，因為 inputTranscription 是累積的
                    return prev.map((t, i) => i === prev.length - 1 ? { ...t, original: processedText } : t);
                  } else {
                    return [...prev, {
                      id: Date.now().toString(),
                      original: processedText,
                      translated: "",
                      isFinal: false,
                      isTranslating: true,
                      sourceLang: "Auto",
                      targetLang: "Auto",
                      createdAt: Date.now(),
                      isLocal: isRecording,
                      ...(userName ? { speakerName: userName } : {})
                    }];
                  }
                });
              }
            }

            // 2. 處理模型回傳的音訊與文字 (modelTurn)
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              let textContent = "";
              for (const part of parts) {
                if (part.text && isTextOutputEnabledRef.current) {
                  textContent += convertToTwIfNeeded(part.text);
                }
                if (part.inlineData?.data && isAudioOutputEnabledRef.current && audioOutputMode !== 'None') {
                  const isSelf = isRecording; 
                  if (audioOutputMode === 'ALL' || (audioOutputMode === 'Myself' && isSelf) || (audioOutputMode === 'Others' && !isSelf)) {
                    playAudioChunk(part.inlineData.data);
                  }
                }
              }

              if (textContent) {
                setTranscripts(prev => {
                  const newTranscripts = [...prev];
                  const lastIndex = newTranscripts.length - 1;
                  
                  // 如果最後一筆是使用者輸入且尚未完成，則將 AI 回應附加到該筆的 translated 欄位
                  if (lastIndex >= 0 && !newTranscripts[lastIndex].isFinal) {
                    newTranscripts[lastIndex] = { 
                      ...newTranscripts[lastIndex], 
                      translated: (newTranscripts[lastIndex].translated || "") + textContent,
                      isTranslating: false 
                    };
                  } else {
                    // 否則，建立一筆新的 AI 回應
                    newTranscripts.push({
                      id: Date.now().toString(),
                      original: "",
                      translated: textContent,
                      isFinal: false,
                      isTranslating: false,
                      sourceLang: "Auto",
                      targetLang: "Auto",
                      createdAt: Date.now(),
                      speakerName: "AI"
                    });
                  }
                  return newTranscripts;
                });
              }
            }

            // 3. 處理模型的語音轉文字 (outputTranscription)
            const outTranscript = message.serverContent?.outputTranscription;
            if (outTranscript?.text && isTextOutputEnabledRef.current) {
              const processedOutText = convertToTwIfNeeded(outTranscript.text);
              setTranscripts(prev => {
                const newTranscripts = [...prev];
                const lastIndex = newTranscripts.length - 1;
                if (lastIndex >= 0) {
                  newTranscripts[lastIndex] = { 
                    ...newTranscripts[lastIndex], 
                    translated: newTranscripts[lastIndex].translated + processedOutText,
                    isTranslating: false 
                  };
                }
                return newTranscripts;
              });
            }

            // 4. 處理對話完成訊號
            if (message.serverContent?.turnComplete) {
              setTranscripts(prev => {
                const last = prev[prev.length - 1];
                if (last && !last.isFinal) {
                  // 修正：只有當 AI 完全沒有輸出翻譯，且原始語音也是空的或佔位符時，才移除該筆紀錄
                  // 避免因為 turnComplete 比翻譯結果早到，而誤刪了使用者剛講完的有效語音
                  if (!last.translated.trim() && (!last.original.trim() || last.original === "(...)")) {
                    return prev.slice(0, -1);
                  }
                  return prev.map((t, i) => i === prev.length - 1 ? { ...t, isFinal: true, isTranslating: false } : t);
                }
                return prev;
              });
            }

            // 5. 處理中斷訊號
            if (message.serverContent?.interrupted) {
              nextPlayTimeRef.current = 0;
              // 立即停止當前播放的音訊
              if (playbackContextRef.current) {
                playbackContextRef.current.close();
                playbackContextRef.current = null;
              }
              // 當被中斷時，標記上一條對話為已完成，防止後續內容錯誤追加
              setTranscripts(prev => {
                const last = prev[prev.length - 1];
                if (last && !last.isFinal) {
                  return prev.map((t, i) => i === prev.length - 1 ? { ...t, isFinal: true, isTranslating: false } : t);
                }
                return prev;
              });
            }
          },
          onclose: () => {
            console.log("Live API connection closed, attempting to reconnect...");
            if (isLiveRef.current) {
              const wasLive = isLiveRef.current;
              stopLiveSession();
              if (wasLive) {
                setTimeout(() => {
                  startLiveSession();
                }, 2000);
              }
            }
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            let errorMessage = "連線發生錯誤";
            if (err.message?.includes("permission") || err.message?.includes("403")) {
              errorMessage = "API 金鑰無效或權限不足 (403 Forbidden)。請檢查您的金鑰設定。";
            } else if (err.message?.includes("429") || err.message?.toLowerCase().includes("quota")) {
              errorMessage = "系統額度已達上限 (Quota Exceeded)。建議您檢查 Google AI Studio 的使用量統計，或考慮升級為付費方案。";
            }
            setErrorMsg(errorMessage);
            setCustomAlert({ message: errorMessage, type: 'alert' });
            
            // 嘗試自動重連
            if (isLiveRef.current) {
              console.log("Live API error, attempting to reconnect in 3 seconds...");
              const wasLive = isLiveRef.current;
              stopLiveSession();
              if (wasLive) {
                setTimeout(() => {
                  startLiveSession();
                }, 3000);
              }
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceType === 'Men' ? "Puck" : "Aoede" } }
          },
          systemInstruction: `${systemInstruction}\n\n[重要指示]：請以「連續翻譯模式」運作。當使用者在翻譯過程中持續說話時，請務必處理並翻譯所有輸入的語句，不得因中斷而遺漏任何語句。請確保翻譯結果與使用者的語音輸入保持同步且完整。`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        }
      });
    } catch (err: any) {
      console.error("Failed to start Live API:", err);
      let errorMessage = err.message || "啟動失敗";
      if (err.name === 'NotAllowedError' || err.message?.toLowerCase().includes('permission denied')) {
        errorMessage = "無法存取麥克風。請允許麥克風權限，或嘗試使用 Safari / Chrome 瀏覽器開啟此網頁。";
      } else if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
        errorMessage = "系統額度已達上限 (Quota Exceeded)。建議您檢查 Google AI Studio 的使用量統計，或考慮升級為付費方案。";
      } else if (err.message?.includes('403')) {
        errorMessage = "API 金鑰無效或權限不足 (403 Forbidden)。請檢查您的金鑰設定。";
      }
      setErrorMsg(errorMessage);
      setCustomAlert({ message: errorMessage, type: 'alert' });
      stopLiveSession();
    }
  };

  // 切換錄音狀態 (本地端控制)
  const toggleRecording = async () => {
    setIsRecording(prev => !prev);
  };

  return (
    <div className={cn("h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col overflow-hidden transition-colors duration-300", isDarkMode && "dark")}>
      <Toaster position="top-center" />
      {/* QR Code Modal */}
      {showQrCode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-4" onClick={() => setShowQrCode(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-8 text-center relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowQrCode(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-100">掃描加入房間</h3>
            <div className="bg-white p-4 rounded-xl inline-block shadow-sm border border-slate-100">
              <QRCodeSVG value={`https://translator-navy-pi.vercel.app/?room=${roomId}`} size={240} level="H" includeMargin={true} />
            </div>
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400 break-all max-w-[280px] mx-auto">
              {`https://translator-navy-pi.vercel.app/?room=${roomId}`}
            </p>
          </div>
        </div>
      )}

      {/* Time Prompt Modal */}
      {showTimePrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 p-6 text-center">
            <h3 className="text-lg font-bold mb-4">系統提示</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">連線已逾1 hr，請問是否繼續</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  stopLiveSession();
                  setShowTimePrompt(false);
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
              >
                Off-line
              </button>
              <button
                onClick={() => setShowTimePrompt(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert/Confirm Dialog */}
      {customAlert && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 p-6 text-center">
            <h3 className="text-lg font-bold mb-4">{customAlert.type === 'confirm' ? '請確認' : '系統提示'}</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">{customAlert.message}</p>
            <div className="flex justify-center gap-3">
              {customAlert.type === 'confirm' && (
                <button
                  onClick={() => setCustomAlert(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
                >
                  取消
                </button>
              )}
              <button
                onClick={() => {
                  if (customAlert.onConfirm) customAlert.onConfirm();
                  setCustomAlert(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Dialog */}
      {showRoomDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2 text-center">Multilingual meeting room</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-8">
                建立專屬房間或加入現有房間，與他人即時共享翻譯結果。
              </p>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    您的顯示名稱 (選填)
                  </label>
                  <input
                    type="text"
                    placeholder="輸入您的名字或 ID"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    API 金鑰
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      placeholder="輸入您的 API 金鑰"
                      value={userApiKey}
                      onChange={(e) => setUserApiKey(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-24"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => setUserApiKey('')}
                        className="p-2 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateRoom}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5" /> 建立新房間
                </button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">或</span>
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    加入現有房間
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="輸入房間代碼"
                      value={joinRoomIdInput}
                      onChange={(e) => setJoinRoomIdInput(e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <button
                      onClick={handleJoinRoom}
                      className="px-6 py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-bold rounded-xl transition-all active:scale-[0.98] flex items-center gap-2"
                    >
                      <LogIn className="w-5 h-5" /> 加入
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 text-center text-xs text-slate-500">
                目前線上總人數：{activeConnections} / 100
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shadow-sm z-10 flex-shrink-0 transition-colors duration-300">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center min-w-[30px]">
              <span className="text-red-600 dark:text-red-500 font-bold text-xl tracking-wider">{getUiText('title1')}</span>
            </div>
            <h1 className="text-base font-semibold tracking-tight">{getUiText('title2')}</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 text-sm text-slate-500 dark:text-slate-400 font-medium overflow-x-auto pb-1 sm:pb-0">
            {roomId && (
              <div className="flex items-center gap-2 mr-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                <span className="text-xs font-medium">房間: {roomId}</span>
                <button 
                  onClick={handleShareUrl}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-blue-600 dark:text-blue-400 ml-2"
                  title="複製邀請網址"
                >
                  {shareSuccess ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setShowQrCode(true)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-blue-600 dark:text-blue-400"
                  title="顯示 QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setRoomId(null);
                    setTranscripts([]);
                    setShowRoomDialog(true);
                    window.history.replaceState({}, '', window.location.pathname);
                  }}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-red-600 dark:text-red-400"
                  title="離開房間"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-1 px-2" title="目前全站連線人數">
              <Users className="w-4 h-4" />
              <span className={cn("text-xs font-mono", activeConnections >= 90 ? "text-red-500" : "")}>
                {activeConnections}/100
              </span>
            </div>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title={getUiText('darkMode')}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
            <button 
              onClick={() => {
                setShowHistory(true);
                const fetchHistory = async () => {
                  if (!auth.currentUser) return;
                  const q = query(collection(db, `users/${auth.currentUser.uid}/history`), orderBy('timestamp', 'desc'));
                  const querySnapshot = await getDocs(q);
                  setHistory(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                };
                fetchHistory();
              }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title="翻譯歷史"
            >
              <MessageSquare className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            {(!roomId || (user && roomCreatorId && user.uid === roomCreatorId)) && (
              <button 
                onClick={() => setShowAdminSettings(true)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                title={getUiText('adminSettings')}
              >
                <Lock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            )}
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
                {/* Quotas Limitation 面板 */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quotas Limitation</h4>
                    <button
                      onClick={() => {
                        const info = `根據 Google AI Studio 與 Google Cloud 2026 年最新規範，Gemini API 的配額與重置機制整理如下：
配額類別 (Quotas Categories)
RPM (Requests Per Minute)：每分鐘請求次數，限制瞬時併發量。
TPM (Tokens Per Minute)：每分鐘 Token 消耗量，限制資料處理吞吐量。
RPD (Requests Per Day)：每日總請求次數，限制單日總使用規模。
配額限制對比 (以 Gemini 1.5 Flash 為例)
配額類別 Free Tier (免費層級) Tier 1 (Pay-as-you-go)
RPM 15 RPM 300 RPM
TPM 1,000,000 TPM 4,000,000 TPM
RPD 1,500 RPD 無硬性限制 (受預算限制)
重置時間與邏輯
-RPM / TPM (分鐘級)：
--邏輯：採用「令牌桶演算法」(Token Bucket)。這並非固定在每分鐘的第 0 秒重置，而是隨著時間推移持續補充額度。
--恢復：若達到上限，通常需等待數秒至一分鐘即可繼續發送請求。
-RPD (日級)：
--重置時間：每日午夜 00:00 (太平洋時間 PT)。
--換算：台灣時間 (UTC+8) 為每日 15:00 (冬令) 或 16:00 (夏令) 重置。`;
                        const win = window.open('', '_blank', 'width=600,height=600');
                        win?.document.write(`<pre style="white-space: pre-wrap; font-family: sans-serif; padding: 20px;">${info}</pre>`);
                      }}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
                      title="查看配額說明"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                  {(() => {
                    const allStats = JSON.parse(localStorage.getItem('api_usage_stats') || '{}');
                    const stats = allStats[userApiKey] || { rpm: 0, tpm: 0, rpd: 0 };
                    
                    const limits = apiTier === 'paid' 
                      ? { rpm: 300, tpm: 4000000, rpd: Infinity } 
                      : { rpm: 15, tpm: 1000000, rpd: 1500 };
                    
                    const renderQuota = (label: string, used: number, limit: number) => {
                      const percentage = limit === Infinity ? 0 : Math.min((used / limit) * 100, 100);
                      const barColor = percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-blue-600';
                      return (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>{label}</span>
                            <span>{used.toLocaleString()} / {limit === Infinity ? '∞' : limit.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="space-y-3">
                        {renderQuota('RPM', stats.rpm || 0, limits.rpm)}
                        {renderQuota('TPM', stats.tpm || 0, limits.tpm)}
                        {renderQuota('RPD', stats.rpd || 0, limits.rpd)}
                      </div>
                    );
                  })()}
                </div>

                {/* API 金鑰設定 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-500" /> API 金鑰設定
                  </h4>
                  
                  {/* API Tier 選擇 */}
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                    <button
                      onClick={() => setApiTier('free')}
                      className={`flex-1 text-xs py-1.5 rounded-md transition-all ${apiTier === 'free' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Free Tier
                    </button>
                    <button
                      onClick={() => setApiTier('paid')}
                      className={`flex-1 text-xs py-1.5 rounded-md transition-all ${apiTier === 'paid' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Tier 1 (Paid)
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={userApiKey}
                      onChange={(e) => setUserApiKey(e.target.value)}
                      className="w-full pl-4 pr-24 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                      placeholder="輸入您的 API Key"
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
                    設定 API 金鑰以啟用翻譯功能。
                  </p>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* 語音人聲設定 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-blue-500" /> 語音人聲設定
                  </h4>
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                    <button
                      onClick={() => setVoiceType('Men')}
                      className={`flex-1 text-xs py-1.5 rounded-md transition-all ${voiceType === 'Men' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Men
                    </button>
                    <button
                      onClick={() => setVoiceType('Women')}
                      className={`flex-1 text-xs py-1.5 rounded-md transition-all ${voiceType === 'Women' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Women
                    </button>
                  </div>
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

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* API 費用與配額統計 (隱藏區塊) */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-red-500" /> API 費用與配額統計 (需解鎖)
                  </h4>
                  {!isCostUnlocked ? (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="輸入解鎖密碼"
                        value={costPasswordInput}
                        onChange={(e) => setCostPasswordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (costPasswordInput === '3102') setIsCostUnlocked(true);
                            else setCustomAlert({ message: '密碼錯誤', type: 'alert' });
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                      <button 
                        onClick={() => {
                          if (costPasswordInput === '3102') setIsCostUnlocked(true);
                          else setCustomAlert({ message: '密碼錯誤', type: 'alert' });
                        }}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors"
                      >
                        解鎖
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 text-sm text-slate-700 dark:text-slate-300">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">本月累積連線時間：</span>
                        <span className="font-mono bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded">
                          {Math.floor(sessionSeconds / 60)} 分 {sessionSeconds % 60} 秒
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">本月預估費用 (NTD)：</span>
                        <span className="font-mono bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded">
                          約 ${(sessionSeconds * 0.05).toFixed(2)} 元
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        *此為根據連線時間之粗略估算 (約 0.05 NTD/秒)，實際費用請以 Google Cloud 帳單為準。
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <a 
                          href="https://console.cloud.google.com/billing" 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex-1 text-center px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-lg text-blue-600 dark:text-blue-400 font-medium transition-colors"
                        >
                          查看 Billing (帳單)
                        </a>
                        <a 
                          href="https://console.cloud.google.com/iam-admin/quotas" 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex-1 text-center px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-lg text-blue-600 dark:text-blue-400 font-medium transition-colors"
                        >
                          查看 Quotas (配額)
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-8">
                <button
                  onClick={() => {
                    setShowAdminSettings(false);
                    // 立即生效：如果正在錄音，重新初始化
                    if (isRecording) {
                      stopLiveSession();
                      setTimeout(() => startLiveSession(), 500);
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
        <div className="flex flex-col gap-2">
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
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:opacity-60 appearance-none dark:text-slate-200"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={`local-${lang.id}`} value={lang.id}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <CountryFlag langId={localLang} className="w-4 h-3 rounded-sm shadow-sm border border-slate-200 dark:border-slate-700 object-cover" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRightLeft className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </div>

              <div className="flex-1">
                <div className="relative">
                  <Globe2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <select 
                    value={clientLang}
                    onChange={(e) => setClientLang(e.target.value)}
                    disabled={isRecording}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:opacity-60 appearance-none dark:text-slate-200"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={`client-${lang.id}`} value={lang.id}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <CountryFlag langId={clientLang} className="w-4 h-3 rounded-sm shadow-sm border border-slate-200 dark:border-slate-700 object-cover" />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* 狀態指示器 */}
                {isRecording && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Live</span>
                  </div>
                )}
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
                    <><Square className="w-3.5 h-3.5 fill-current" /> <span className="text-xs">{getUiText('stop')}</span></>
                  ) : (
                    <><Mic className="w-3.5 h-3.5" /> <span className="text-xs">{getUiText('speaking')}</span></>
                  )}
                </button>
              </div>
            </div>

            {/* 右側國旗 (Client) */}
            <div className="flex items-center justify-center flex-shrink-0">
              <CountryFlag langId={clientLang} className="w-8 h-5 sm:w-10 sm:h-7 rounded shadow-sm border border-slate-200 dark:border-slate-700 object-cover" />
            </div>
          </div>

          {/* 輸出模式控制 */}
          <div className="flex items-center justify-end gap-2 px-1">
            <div className="relative">
              <select
                value={audioOutputMode}
                onChange={(e) => {
                  const mode = e.target.value as 'None' | 'Myself' | 'ALL' | 'Others';
                  setAudioOutputMode(mode);
                  setIsAudioOutputEnabled(mode !== 'None');
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border appearance-none cursor-pointer",
                  isAudioOutputEnabled 
                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30" 
                    : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100"
                )}
                title={getUiText('audioOutput')}
              >
                <option value="None">None</option>
                <option value="Myself">Myself</option>
                <option value="ALL">ALL</option>
                <option value="Others">Others</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                {isAudioOutputEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
              </div>
            </div>
            <button
              onClick={() => {
                if (isTextOutputEnabled && !isAudioOutputEnabled) return; // 防止兩個都關閉
                setIsTextOutputEnabled(!isTextOutputEnabled);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border",
                isTextOutputEnabled 
                  ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30" 
                  : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100"
              )}
              title={getUiText('textTranscript')}
            >
              {isTextOutputEnabled ? <MessageSquare className="w-3.5 h-3.5" /> : <MessageSquareOff className="w-3.5 h-3.5" />}
              {getUiText('textTranscript')}
            </button>
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
              <h2 className="text-sm font-medium text-slate-600 dark:text-slate-300">{getUiText('textTranscript')}</h2>
              {isRecording && (
                <div className="flex items-center gap-2 text-xs text-red-500 font-medium animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  正在聆聽...
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(!roomId || (user && roomCreatorId && user.uid === roomCreatorId)) && (
                <>
                  <button
                    onClick={handleShare}
                    disabled={transcripts.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {shareSuccess ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
                    {getUiText('share')}
                  </button>
                  <button
                    onClick={() => {
                      if (roomId) {
                        handleClearRoomChat();
                      } else {
                        setShowClearConfirm(true);
                      }
                    }}
                    disabled={transcripts.length === 0 || (!!roomId && (!user || roomCreatorId !== user?.uid))}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={roomId && (!user || roomCreatorId !== user?.uid) ? "只有房間建立者可以清除紀錄" : ""}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {getUiText('clear')}
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden p-4 sm:p-5">
            {transcripts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-4 min-h-[200px]">
                <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                  <Languages className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm">點擊上方按鈕開始對話</p>
              </div>
            ) : (
              <Virtuoso
                ref={virtuosoRef}
                style={{ height: '100%' }}
                data={memoizedTranscripts}
                itemContent={(index, t) => (
                  <div className="mb-2">
                    <TranscriptItem key={t.id} t={t} />
                  </div>
                )}
                followOutput="smooth"
              />
            )}
          </div>
        </div>

        {/* Onboarding Modal */}
        {showOnboarding && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full animate-in zoom-in-95">
              <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">歡迎使用 AI 即時翻譯</h2>
              <ul className="space-y-3 mb-6 text-sm text-slate-600 dark:text-slate-300">
                <li>1. 選擇您的語言與對方語言。</li>
                <li>2. 點擊錄音按鈕開始即時翻譯。</li>
                <li>3. 語音輸出可以從控制面板調整。</li>
              </ul>
              <button 
                onClick={() => {
                  localStorage.setItem('onboarding_completed', 'true');
                  setShowOnboarding(false);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
              >
                開始使用
              </button>
            </div>
          </div>
        )}

        {/* Clear Confirm Modal */}
        {showClearConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full animate-in zoom-in-95">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{getUiText('clearTitle')}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{getUiText('clearDesc')}</p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {getUiText('cancel')}
                </button>
                <button 
                  onClick={handleClear}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  {getUiText('confirmClear')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Responsiveness Info Modal */}
        {/* Removed */}

        {/* History Modal */}
        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">翻譯歷史</h2>
                <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                {history.length === 0 ? (
                  <p className="text-center text-slate-500 dark:text-slate-400">尚無翻譯歷史</p>
                ) : (
                  history.map(t => (
                    <div key={t.id} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-300">{t.original}</p>
                      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">{t.translated}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{t.timestamp ? new Date(t.timestamp.toMillis()).toLocaleString() : '剛剛'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
