// 由於 Web Worker 限制，改用 importScripts 載入依賴
// 注意：此處假設構建工具會將 firebase 庫放在可存取路徑
declare var importScripts: (...urls: string[]) => void;
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js');

// 讀取設定檔 (透過 postMessage 傳入或硬編碼，此處改為由主執行緒傳入)
let db: any;

self.onmessage = async (event) => {
  const { type, config, collectionPath, docId, data } = event.data;

  if (type === 'init') {
    const app = (self as any).firebase.initializeApp(config);
    db = (self as any).firebase.firestore(app);
    // 處理 named database
    if (config.firestoreDatabaseId) {
      db = (self as any).firebase.firestore(app, config.firestoreDatabaseId);
    }
    return;
  }

  try {
    const docRef = db.collection(collectionPath).doc(docId);
    
    // 處理 timestamp 轉換
    const processedData = { ...data };
    if (processedData.timestamp === 'SERVER_TIMESTAMP') {
      processedData.timestamp = (self as any).firebase.firestore.Timestamp.now();
    }

    if (type === 'set') {
      await docRef.set(processedData, { merge: true });
    } else if (type === 'update') {
      await docRef.update(processedData);
    }
  } catch (error) {
    console.error('Firestore worker error:', error);
    self.postMessage({ type: 'error', error: error instanceof Error ? error.message : String(error) });
  }
};
