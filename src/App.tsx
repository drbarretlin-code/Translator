import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Globe2, AlertCircle, Loader2, Languages, Settings, Key, ArrowRightLeft, Volume2, VolumeX, MessageSquare, MessageSquareOff, Square as StopIcon, Moon, Sun, Trash2, Share2, Check, Lock, Eye, EyeOff, X } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { cn } from './lib/utils';

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
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [uiLang, setUiLang] = useState(() => localStorage.getItem('ui_lang') || 'zh-TW');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [headerTitle1, setHeaderTitle1] = useState(() => localStorage.getItem('header_title_1') || 'TUC');
  const [headerTitle2, setHeaderTitle2] = useState(() => localStorage.getItem('header_title_2') || 'AI Smart Interpreter');
  
  // 輸出模式控制
  const [isAudioOutputEnabled, setIsAudioOutputEnabled] = useState(() => localStorage.getItem('audio_output') !== 'false');
  const [isTextOutputEnabled, setIsTextOutputEnabled] = useState(() => localStorage.getItem('text_output') !== 'false');
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  // Live API Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<any>(null);
  const isLiveRef = useRef<boolean>(false);
  
  const localLangRef = useRef<string>(localLang);
  const clientLangRef = useRef<string>(clientLang);
  const transcriptsRef = useRef<Transcript[]>([]);
  const isAudioOutputEnabledRef = useRef<boolean>(isAudioOutputEnabled);
  const isTextOutputEnabledRef = useRef<boolean>(isTextOutputEnabled);

  // 同步 state 到 ref，供事件回呼使用
  useEffect(() => {
    transcriptsRef.current = transcripts;
  }, [transcripts]);

  useEffect(() => {
    isAudioOutputEnabledRef.current = isAudioOutputEnabled;
    localStorage.setItem('audio_output', isAudioOutputEnabled.toString());
  }, [isAudioOutputEnabled]);

  useEffect(() => {
    isTextOutputEnabledRef.current = isTextOutputEnabled;
    localStorage.setItem('text_output', isTextOutputEnabled.toString());
  }, [isTextOutputEnabled]);

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

  const stopLiveSession = () => {
    isLiveRef.current = false;
    setIsRecording(false);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then((session: any) => {
        if (session && typeof session.close === 'function') {
          session.close();
        }
      }).catch(() => {});
      sessionPromiseRef.current = null;
    }
    nextPlayTimeRef.current = 0;
  };

  const startLiveSession = async () => {
    if (!userApiKey) {
      setErrorMsg('請先在管理者設定中配置您的 Gemini API 金鑰。');
      setShowAdminSettings(true);
      return;
    }

    setIsRecording(true);
    isLiveRef.current = true;
    setErrorMsg(null);

    try {
      // Use default sample rate to ensure compatibility across all devices (especially Android)
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      await audioCtx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1, // 強制單聲道，讓麥克風陣列更專注於人聲
        } 
      });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: userApiKey });

      const localName = LANGUAGES.find(l => l.id === localLang)?.name || localLang;
      const clientName = LANGUAGES.find(l => l.id === clientLang)?.name || clientLang;

      const systemInstruction = `You are a real-time bilingual translator. The user will speak in either ${localName} or ${clientName}.
1. Listen carefully to the user.
2. Identify the language they are speaking.
3. Translate what they said into the OTHER language (${localName} or ${clientName}).
4. If the target language is Chinese, ALWAYS use Traditional Chinese (繁體中文).
5. Speak the translation out loud.
6. Do not add any conversational filler, greetings, or explanations. ONLY output the translation.`;

      sessionPromiseRef.current = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            try {
              if (!audioContextRef.current || !mediaStreamRef.current) return;
              
              const audioCtx = audioContextRef.current;
              const stream = mediaStreamRef.current;

              const source = audioCtx.createMediaStreamSource(stream);
              
              // 建立增益節點 (GainNode) 來放大音量，強化不戴耳機時的收音效果
              const gainNode = audioCtx.createGain();
              gainNode.gain.value = 2.5; // 放大 2.5 倍音量
              
              const processor = audioCtx.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

              // 連接：麥克風 -> 增益節點 -> 處理節點 -> 輸出 (虛擬)
              source.connect(gainNode);
              gainNode.connect(processor);
              processor.connect(audioCtx.destination);

              processor.onaudioprocess = (e) => {
                if (!isLiveRef.current) return;
                const inputData = e.inputBuffer.getChannelData(0);
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

                sessionPromiseRef.current?.then((session: any) => {
                  session.sendRealtimeInput({
                    audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
                  });
                });
              };
            } catch (err) {
              console.error("Audio processing error:", err);
              setErrorMsg("音訊處理發生錯誤");
              stopLiveSession();
            }
          },
          onmessage: (message: any) => {
            // 1. 處理使用者的語音轉文字 (inputTranscription)
            const inTranscript = message.serverContent?.inputTranscription;
            if (inTranscript?.text) {
              setTranscripts(prev => {
                const last = prev[prev.length - 1];
                if (last && !last.isFinal) {
                  return prev.map((t, i) => i === prev.length - 1 ? { ...t, original: inTranscript.text } : t);
                } else {
                  return [...prev, {
                    id: Date.now().toString(),
                    original: inTranscript.text,
                    translated: "",
                    isFinal: false,
                    isTranslating: true,
                    sourceLang: "Auto",
                    targetLang: "Auto"
                  }];
                }
              });
            }

            // 2. 處理模型回傳的音訊與文字 (modelTurn)
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              let textContent = "";
              for (const part of parts) {
                if (part.text && isTextOutputEnabledRef.current) {
                  textContent += part.text;
                }
                if (part.inlineData?.data && isAudioOutputEnabledRef.current) {
                  playAudioChunk(part.inlineData.data);
                }
              }

              if (textContent) {
                setTranscripts(prev => {
                  const last = prev[prev.length - 1];
                  if (last) {
                    return prev.map((t, i) => i === prev.length - 1 ? { ...t, translated: t.translated + textContent, isTranslating: false } : t);
                  }
                  return prev;
                });
              }
            }

            // 3. 處理模型的語音轉文字 (outputTranscription - 作為備用)
            const outTranscript = message.serverContent?.outputTranscription;
            if (outTranscript?.text && isTextOutputEnabledRef.current) {
              setTranscripts(prev => {
                const last = prev[prev.length - 1];
                if (last) {
                  return prev.map((t, i) => i === prev.length - 1 ? { ...t, translated: outTranscript.text, isTranslating: false } : t);
                }
                return prev;
              });
            }

            if (message.serverContent?.turnComplete) {
              setTranscripts(prev => {
                const last = prev[prev.length - 1];
                if (last && !last.isFinal) {
                  return prev.map((t, i) => i === prev.length - 1 ? { ...t, isFinal: true, isTranslating: false } : t);
                }
                return prev;
              });
            }

            if (message.serverContent?.interrupted) {
              nextPlayTimeRef.current = 0;
            }
          },
          onclose: () => {
            stopLiveSession();
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            setErrorMsg("連線發生錯誤");
            stopLiveSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }
          },
          systemInstruction: systemInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        }
      });
    } catch (err: any) {
      console.error("Failed to start Live API:", err);
      setErrorMsg(err.message || "啟動失敗");
      stopLiveSession();
    }
  };

  // 切換錄音狀態
  const toggleRecording = async () => {
    if (isRecording) {
      stopLiveSession();
    } else {
      startLiveSession();
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
                    className="w-full pl-7 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:opacity-60 appearance-none dark:text-slate-200"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={`local-${lang.id}`} value={lang.id}>{lang.name}</option>
                    ))}
                  </select>
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
            <button
              onClick={() => {
                if (isAudioOutputEnabled && !isTextOutputEnabled) return; // 防止兩個都關閉
                setIsAudioOutputEnabled(!isAudioOutputEnabled);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border",
                isAudioOutputEnabled 
                  ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30" 
                  : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100"
              )}
              title={getUiText('audioOutput')}
            >
              {isAudioOutputEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              {getUiText('audioOutput')}
            </button>
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
              <button
                onClick={handleShare}
                disabled={transcripts.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {shareSuccess ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
                {getUiText('share')}
              </button>
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={transcripts.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {getUiText('clear')}
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
                              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>AI 聆聽與翻譯中...</span>
                              </div>
                            )}
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
      </main>
    </div>
  );
}
