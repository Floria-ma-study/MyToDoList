/**
 * Firestore 多人協作待辦事項資料模組 (Collaborative Todos Firestore Service)
 */

import { db, isFirebaseConfigured } from "./firebase-config.js";
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

/**
 * 監聽指定看板/房間的即時待辦事項列表
 * @param {string} roomId 看板識別碼 (預設為 'general')
 * @param {Function} onUpdate (todos) => void
 * @param {Function} onError (error) => void
 * @returns {Function} 取消監聽的函式
 */
export function subscribeTodos(roomId = "general", onUpdate, onError) {
  if (!db || !isFirebaseConfigured()) {
    console.warn("Firestore 尚未初始化或未設定 API Key");
    onUpdate([]);
    return () => {};
  }

  try {
    const todosRef = collection(db, "rooms", roomId, "todos");
    const q = query(todosRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((docSnapshot) => {
        items.push({
          id: docSnapshot.id,
          ...docSnapshot.data()
        });
      });
      onUpdate(items);
    }, (error) => {
      console.error("Firestore 監聽失敗:", error);
      if (onError) onError(error);
    });

    return unsubscribe;
  } catch (err) {
    console.error("建立待辦事項監聽時發生錯誤:", err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * 新增一筆待辦事項
 */
export async function createTodo(roomId = "general", todoData, user) {
  if (!db) throw new Error("Firestore 尚未初始化");
  if (!user) throw new Error("必須先登入 Google 帳號才能新增待辦事項");

  const todosRef = collection(db, "rooms", roomId, "todos");
  
  const payload = {
    title: (todoData.title || "").trim(),
    description: (todoData.description || "").trim(),
    priority: todoData.priority || "medium", // high, medium, low
    category: todoData.category || "一般",
    dueDate: todoData.dueDate || null,
    completed: false,
    completedAt: null,
    assignedTo: todoData.assignedTo || {
      uid: user.uid,
      name: user.displayName || user.email.split("@")[0],
      email: user.email,
      photoURL: user.photoURL || ""
    },
    createdBy: {
      uid: user.uid,
      name: user.displayName || user.email.split("@")[0],
      email: user.email,
      photoURL: user.photoURL || ""
    },
    updatedBy: {
      uid: user.uid,
      name: user.displayName || user.email.split("@")[0],
      email: user.email,
      photoURL: user.photoURL || ""
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(todosRef, payload);
  return { id: docRef.id, ...payload };
}

/**
 * 切換待辦事項完成狀態
 */
export async function toggleTodoStatus(roomId = "general", todoId, currentCompleted, user) {
  if (!db) throw new Error("Firestore 尚未初始化");
  const todoRef = doc(db, "rooms", roomId, "todos", todoId);

  await updateDoc(todoRef, {
    completed: !currentCompleted,
    completedAt: !currentCompleted ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
    updatedBy: user ? {
      uid: user.uid,
      name: user.displayName || user.email.split("@")[0],
      email: user.email,
      photoURL: user.photoURL || ""
    } : null
  });
}

/**
 * 更新待辦事項內容
 */
export async function updateTodo(roomId = "general", todoId, updateData, user) {
  if (!db) throw new Error("Firestore 尚未初始化");
  const todoRef = doc(db, "rooms", roomId, "todos", todoId);

  const payload = {
    ...updateData,
    updatedAt: serverTimestamp(),
    updatedBy: user ? {
      uid: user.uid,
      name: user.displayName || user.email.split("@")[0],
      email: user.email,
      photoURL: user.photoURL || ""
    } : null
  };

  await updateDoc(todoRef, payload);
}

/**
 * 刪除待辦事項
 */
export async function deleteTodo(roomId = "general", todoId) {
  if (!db) throw new Error("Firestore 尚未初始化");
  const todoRef = doc(db, "rooms", roomId, "todos", todoId);
  await deleteDoc(todoRef);
}

/**
 * 批量清除所有已完成的待辦事項
 */
export async function clearCompletedTodos(roomId = "general", completedIds = []) {
  if (!db || completedIds.length === 0) return;
  const promises = completedIds.map(id => {
    const todoRef = doc(db, "rooms", roomId, "todos", id);
    return deleteDoc(todoRef);
  });
  await Promise.all(promises);
}

/**
 * 更新使用者在當前協作看板的線上狀態 (Presence)
 */
export async function updatePresence(roomId = "general", user) {
  if (!db || !user || !isFirebaseConfigured()) return;
  try {
    const presenceRef = doc(db, "rooms", roomId, "presence", user.uid);
    await setDoc(presenceRef, {
      uid: user.uid,
      name: user.displayName || user.email.split("@")[0],
      email: user.email,
      photoURL: user.photoURL || "",
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.debug("Presence 更新略過:", e);
  }
}

/**
 * 監聽當前協作看板的線上成員列表
 */
export function subscribePresence(roomId = "general", onUpdate) {
  if (!db || !isFirebaseConfigured()) {
    onUpdate([]);
    return () => {};
  }
  try {
    const presenceCol = collection(db, "rooms", roomId, "presence");
    return onSnapshot(presenceCol, (snapshot) => {
      const users = [];
      snapshot.forEach(docSnap => {
        users.push(docSnap.data());
      });
      onUpdate(users);
    }, (err) => {
      console.debug("Presence 監聽略過:", err);
    });
  } catch (e) {
    return () => {};
  }
}
