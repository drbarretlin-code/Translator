import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const baseDict = {
  'title1': 'TUC',
  'title2': 'AI Smart Interpreter',
  'local': 'Local',
  'client': 'Client',
  'systemReady': 'System Ready',
  'adminSettings': 'Admin Settings',
  'darkMode_on': 'Switch to Light Mode',
  'darkMode_off': 'Switch to Dark Mode',
  'audioOutput': 'Audio Output',
  'textTranscript': 'Text Transcript',
  'speaking': 'Speaking',
  'stop': 'Stop',
  'share_success': 'Shared',
  'share': 'Share',
  'clear': 'Clear',
  'confirmClear': 'Confirm Clear',
  'clearTitle': 'Clear Transcript',
  'clearDesc': 'Are you sure you want to clear all transcripts? This action cannot be undone.',
  'cancel': 'Cancel',
  'uiInterface': 'UI Interface',
  'adminAdvancedSettings': 'Admin Advanced Settings',
  'headerTitle1Setting': 'Header Title 1 Setting',
  'headerTitle2Setting': 'Header Title 2 Setting',
  'responsivenessSetting': 'Responsiveness Setting',
  'apiKeySetting': 'API Key Setting',
  'apiTierSetting': 'API Tier Setting',
  'voiceTypeSetting': 'Voice Type Setting',
  'roomTitle': 'Multilingual meeting room',
  'roomDesc': 'Create a dedicated room to share translation results in real time.',
  'displayNameLabel': 'Your Display Name (Optional)',
  'projectNameLabel': 'Project Name (Optional)',
  'apiKeyLabel': 'API Key',
  'createRoomBtn': 'Create New Room',
  'activeConnections': 'Total Active Connections: ',
  'roomLabel': 'Room: ',
  'copyUrl': 'Copy Invite URL',
  'showQrCode': 'Show QR Code',
  'leaveRoom': 'Leave Room',
  'totalConnections': 'Total Site Connections',
  'welcome': 'Welcome',
  'enterSpeakerId': 'Please enter your speaker ID, which will be used as your label in the transcript.',
  'confirmAndEnter': 'Confirm and Enter',
  'lang_zh_TW': 'Traditional Chinese',
  'lang_zh_CN': 'Simplified Chinese',
  'lang_en_US': 'English (US)',
  'lang_th_TH': 'Thai',
  'lang_ja_JP': 'Japanese',
  'lang_vi_VN': 'Vietnamese',
  'lang_fil_PH': 'Filipino',
  'lang_id_ID': 'Indonesian',
  'lang_ms_MY': 'Malay',
  'lang_en_GB': 'English (GB)',
  'lang_ko_KR': 'Korean',
  'lang_fr_FR': 'French',
  'lang_de_DE': 'German',
  'lang_es_ES': 'Spanish',
  'lang_it_IT': 'Italian',
  'lang_ru_RU': 'Russian',
  'lang_pt_BR': 'Portuguese (Brazil)',
  'lang_pt_PT': 'Portuguese (Portugal)',
  'lang_ar_SA': 'Arabic',
  'lang_hi_IN': 'Hindi',
  'lang_bn_BD': 'Bengali',
  'lang_tr_TR': 'Turkish',
  'lang_nl_NL': 'Dutch',
  'lang_pl_PL': 'Polish',
  'lang_uk_UA': 'Ukrainian',
  'lang_cs_CZ': 'Czech',
  'lang_el_GR': 'Greek',
  'lang_he_IL': 'Hebrew',
  'lang_sv_SE': 'Swedish',
  'lang_da_DK': 'Danish',
  'lang_fi_FI': 'Finnish',
  'lang_no_NO': 'Norwegian',
  'lang_hu_HU': 'Hungarian',
  'lang_ro_RO': 'Romanian',
  'lang_sk_SK': 'Slovak'
};

const languages = [
  { id: 'zh-TW', name: 'Traditional Chinese' },
  { id: 'zh-CN', name: 'Simplified Chinese' },
  { id: 'en-US', name: 'English (US)' },
  { id: 'th-TH', name: 'Thai' },
  { id: 'ja-JP', name: 'Japanese' },
  { id: 'vi-VN', name: 'Vietnamese' },
  { id: 'fil-PH', name: 'Filipino' },
  { id: 'id-ID', name: 'Indonesian' },
  { id: 'ms-MY', name: 'Malay' },
  { id: 'en-GB', name: 'English (GB)' },
  { id: 'ko-KR', name: 'Korean' },
  { id: 'fr-FR', name: 'French' },
  { id: 'de-DE', name: 'German' },
  { id: 'es-ES', name: 'Spanish' },
  { id: 'it-IT', name: 'Italian' },
  { id: 'ru-RU', name: 'Russian' },
  { id: 'pt-BR', name: 'Portuguese (Brazil)' },
  { id: 'pt-PT', name: 'Portuguese (Portugal)' },
  { id: 'ar-SA', name: 'Arabic' },
  { id: 'hi-IN', name: 'Hindi' },
  { id: 'bn-BD', name: 'Bengali' },
  { id: 'tr-TR', name: 'Turkish' },
  { id: 'nl-NL', name: 'Dutch' },
  { id: 'pl-PL', name: 'Polish' },
  { id: 'uk-UA', name: 'Ukrainian' },
  { id: 'cs-CZ', name: 'Czech' },
  { id: 'el-GR', name: 'Greek' },
  { id: 'he-IL', name: 'Hebrew' },
  { id: 'sv-SE', name: 'Swedish' },
  { id: 'da-DK', name: 'Danish' },
  { id: 'fi-FI', name: 'Finnish' },
  { id: 'no-NO', name: 'Norwegian' },
  { id: 'hu-HU', name: 'Hungarian' },
  { id: 'ro-RO', name: 'Romanian' },
  { id: 'sk-SK', name: 'Slovak' }
];

async function generate() {
  const resultDict = {};
  
  // Parallelize requests to speed up
  const promises = languages.map(async (lang) => {
    console.log(`Translating to ${lang.name}...`);
    if (lang.id === 'en-US' || lang.id === 'en-GB') {
      resultDict[lang.id] = { ...baseDict };
      return;
    }
    
    const prompt = `Translate the following JSON object values to ${lang.name}. Keep the keys exactly the same. Return ONLY valid JSON, no markdown formatting, no backticks.
    
${JSON.stringify(baseDict, null, 2)}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      });
      
      const text = response.text;
      resultDict[lang.id] = JSON.parse(text);
      console.log(`Finished ${lang.name}`);
    } catch (e) {
      console.error(`Failed for ${lang.name}:`, e);
      resultDict[lang.id] = { ...baseDict }; // fallback to English
    }
  });

  await Promise.all(promises);
  
  const fileContent = `export const translations: Record<string, Record<string, string>> = ${JSON.stringify(resultDict, null, 2)};\n`;
  fs.writeFileSync('./src/translations.ts', fileContent);
  console.log('Done!');
}

generate();
