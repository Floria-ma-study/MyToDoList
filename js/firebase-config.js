/**
 * Firebase 設定與初始化模組 (Firebase Configuration & Initialization)
 * 專案 ID: my-to-do-list-912a6
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// 預設專案設定模板 (專案 my-to-do-list-912a6)
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyC88ZGO-uDbzfhnWUVE_msHEUtEsiazG9k",
  authDomain: "my-to-do-list-912a6.firebaseapp.com",
  projectId: "my-to-do-list-912a6",
  storageBucket: "my-to-do-list-912a6.firebasestorage.app",
  messagingSenderId: "697344117893",
  appId: "1:697344117893:web:96ca5174ef3e50a3f5adec"
};

const STORAGE_KEY = "mytodolist_firebase_config_override";

/**
 * 取得當前有效的 Firebase 設定 (優先使用瀏覽器 localStorage 暫存的設定)
 */
export function getActiveFirebaseConfig() {
  try {
    const localSaved = localStorage.getItem(STORAGE_KEY);
    if (localSaved) {
      const parsed = JSON.parse(localSaved);
      if (parsed && parsed.projectId && parsed.apiKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("無法從 localStorage 讀取 Firebase 設定:", e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

/**
 * 檢查當前 Firebase 設定是否已填寫有效的 API Key
 */
export function isFirebaseConfigured() {
  const config = getActiveFirebaseConfig();
  return Boolean(
    config.apiKey && 
    config.apiKey !== "YOUR_FIREBASE_API_KEY" && 
    config.projectId === "my-to-do-list-912a6"
  );
}

/**
 * 儲存新的 Firebase 設定至 localStorage 並重新整理
 */
export function saveFirebaseConfig(newConfig) {
  if (!newConfig || !newConfig.apiKey) {
    throw new Error("API Key 為必填項目");
  }
  const cleanConfig = {
    apiKey: newConfig.apiKey.trim(),
    authDomain: newConfig.authDomain ? newConfig.authDomain.trim() : "my-to-do-list-912a6.firebaseapp.com",
    projectId: newConfig.projectId ? newConfig.projectId.trim() : "my-to-do-list-912a6",
    storageBucket: newConfig.storageBucket ? newConfig.storageBucket.trim() : "my-to-do-list-912a6.firebasestorage.app",
    messagingSenderId: newConfig.messagingSenderId ? newConfig.messagingSenderId.trim() : "",
    appId: newConfig.appId ? newConfig.appId.trim() : ""
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanConfig));
  return cleanConfig;
}

/**
 * 清除已儲存的自訂設定
 */
export function resetFirebaseConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

// 實例化 Firebase App
let app = null;
let auth = null;
let db = null;
let initError = null;

try {
  const currentConfig = getActiveFirebaseConfig();
  if (getApps().length === 0) {
    app = initializeApp(currentConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase 初始化失敗:", error);
  initError = error;
}

export { app, auth, db, initError };
