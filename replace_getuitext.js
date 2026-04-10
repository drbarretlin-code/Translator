import fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf-8');

const startStr = '  // 介面翻譯\n  const getUiText = (key: string) => {';
const endStr = '    return translations[uiLang]?.[key] || translations[\'zh-TW\'][key] || key;\n  };';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr) + endStr.length;

if (startIndex !== -1 && endIndex !== -1) {
  const newFunc = `  // 介面翻譯
  const getUiText = (key: string) => {
    let actualKey = key;
    if (key === 'darkMode') {
      actualKey = isDarkMode ? 'darkMode_on' : 'darkMode_off';
    } else if (key === 'share') {
      actualKey = shareSuccess ? 'share_success' : 'share';
    }
    
    return translations[uiLang]?.[actualKey] || translations['en-US']?.[actualKey] || key;
  };`;
  
  content = content.substring(0, startIndex) + newFunc + content.substring(endIndex);
  fs.writeFileSync('./src/App.tsx', content);
  console.log('Replaced getUiText successfully');
} else {
  console.log('Could not find getUiText block');
}
