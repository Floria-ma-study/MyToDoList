/**
 * Firebase Google 登入與身份認證模組 (Google Authentication Module)
 */

import { 
  auth, 
  isFirebaseConfigured 
} from "./firebase-config.js";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

const googleProvider = new GoogleAuthProvider();
// 要求使用者的基本公開資料與電子郵件
googleProvider.addScope("profile");
googleProvider.addScope("email");
googleProvider.setCustomParameters({
  prompt: "select_account"
});

/**
 * 監聽登入狀態改變
 * @param {Function} callback 接收 (user) => void
 * @returns {Function} 取消監聽函式
 */
export function subscribeAuthState(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

/**
 * 使用 Google 帳號進行彈跳視窗登入
 */
export async function loginWithGoogle() {
  if (!isFirebaseConfigured()) {
    throw new Error("尚未設定 Firebase API Key。請先點選右上角「Firebase 設定」填入 API Key！");
  }

  if (!auth) {
    throw new Error("Firebase 認證模組尚未正確初始化，請檢查設定。");
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google 登入失敗:", error);
    let friendlyMessage = "Google 登入失敗，請稍後再試。";
    
    if (error.code === "auth/popup-closed-by-user") {
      friendlyMessage = "登入視窗已關閉。";
    } else if (error.code === "auth/unauthorized-domain") {
      friendlyMessage = "目前的網址 (如 localhost) 尚未加入 Firebase 的授權網域 (Authorized Domains)！請至 Firebase Console > Authentication > Settings 加入。";
    } else if (error.code === "auth/operation-not-allowed") {
      friendlyMessage = "Firebase 專案尚未啟用 Google 登入方式！請至 Firebase Console > Authentication > Sign-in method 啟用 Google。";
    } else if (error.code === "auth/api-key-not-valid" || error.code === "auth/invalid-api-key") {
      friendlyMessage = "Firebase API Key 無效，請檢查您的專案設定並重新輸入正確的 API Key。";
    } else if (error.message) {
      friendlyMessage = `${friendlyMessage} (${error.message})`;
    }
    
    const customErr = new Error(friendlyMessage);
    customErr.originalError = error;
    throw customErr;
  }
}

/**
 * 登出當前使用者
 */
export async function logoutUser() {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("登出失敗:", error);
    throw error;
  }
}

/**
 * 取得當前已登入的使用者資訊
 */
export function getCurrentUser() {
  return auth ? auth.currentUser : null;
}
