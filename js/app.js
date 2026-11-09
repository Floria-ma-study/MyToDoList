/**
 * MyToDoList 主應用程式邏輯 (Application Controller)
 */

import { 
  getActiveFirebaseConfig, 
  isFirebaseConfigured, 
  saveFirebaseConfig, 
  resetFirebaseConfig 
} from "./firebase-config.js";
import { 
  loginWithGoogle, 
  logoutUser, 
  subscribeAuthState, 
  getCurrentUser 
} from "./auth.js";
import { 
  subscribeTodos, 
  createTodo, 
  toggleTodoStatus, 
  updateTodo, 
  deleteTodo, 
  clearCompletedTodos,
  updatePresence,
  subscribePresence
} from "./todos.js";

// 全域狀態 (Application State)
const state = {
  currentUser: null,
  currentRoom: "general",
  todos: [],
  filterStatus: "all", // all, active, completed, my-tasks
  filterPriority: "all", // all, high, medium, low
  searchQuery: "",
  sortBy: "newest", // newest, dueDate, priority
  unsubscribeTodos: null,
  unsubscribePresence: null,
  presenceUsers: []
};

// DOM 元素快取 (DOM Elements)
const elements = {
  // 導覽與狀態
  currentRoomDisplay: document.getElementById("currentRoomDisplay"),
  btnSwitchRoom: document.getElementById("btnSwitchRoom"),
  btnShareRoom: document.getElementById("btnShareRoom"),
  btnOpenConfig: document.getElementById("btnOpenConfig"),
  configIndicatorDot: document.getElementById("configIndicatorDot"),
  configIndicatorText: document.getElementById("configIndicatorText"),
  configWarningBanner: document.getElementById("configWarningBanner"),
  btnBannerOpenConfig: document.getElementById("btnBannerOpenConfig"),
  
  // 認證區塊
  btnLogin: document.getElementById("btnLogin"),
  btnHeroLogin: document.getElementById("btnHeroLogin"),
  userProfile: document.getElementById("userProfile"),
  userMenuBtn: document.getElementById("userMenuBtn"),
  userDropdown: document.getElementById("userDropdown"),
  userName: document.getElementById("userName"),
  userAvatar: document.getElementById("userAvatar"),
  userMenuName: document.getElementById("userMenuName"),
  userMenuEmail: document.getElementById("userMenuEmail"),
  btnLogout: document.getElementById("btnLogout"),
  guestWelcomeCard: document.getElementById("guestWelcomeCard"),
  
  // 統計
  statTotalCount: document.getElementById("statTotalCount"),
  statActiveCount: document.getElementById("statActiveCount"),
  statCompletedCount: document.getElementById("statCompletedCount"),
  statCompletionRate: document.getElementById("statCompletionRate"),
  statProgressBar: document.getElementById("statProgressBar"),

  // 新增待辦
  addTodoForm: document.getElementById("addTodoForm"),
  todoTitleInput: document.getElementById("todoTitleInput"),
  todoPrioritySelect: document.getElementById("todoPrioritySelect"),
  todoCategorySelect: document.getElementById("todoCategorySelect"),
  todoDueDateInput: document.getElementById("todoDueDateInput"),

  // 篩選與工具
  filterTabs: document.querySelectorAll(".filter-tab"),
  searchInput: document.getElementById("searchInput"),
  priorityFilterSelect: document.getElementById("priorityFilterSelect"),
  sortSelect: document.getElementById("sortSelect"),
  btnClearCompleted: document.getElementById("btnClearCompleted"),
  todoList: document.getElementById("todoList"),

  // 編輯彈窗
  editTodoModal: document.getElementById("editTodoModal"),
  editTodoForm: document.getElementById("editTodoForm"),
  editTodoId: document.getElementById("editTodoId"),
  editTodoTitle: document.getElementById("editTodoTitle"),
  editTodoDesc: document.getElementById("editTodoDesc"),
  editTodoPriority: document.getElementById("editTodoPriority"),
  editTodoCategory: document.getElementById("editTodoCategory"),
  editTodoDueDate: document.getElementById("editTodoDueDate"),
  btnCloseEditModal: document.getElementById("btnCloseEditModal"),
  btnCancelEdit: document.getElementById("btnCancelEdit"),

  // Firebase 設定彈窗
  configModal: document.getElementById("configModal"),
  btnCloseConfigModal: document.getElementById("btnCloseConfigModal"),
  btnCancelConfig: document.getElementById("btnCancelConfig"),
  configForm: document.getElementById("configForm"),
  cfgPasteInput: document.getElementById("cfgPasteInput"),
  btnParseConfig: document.getElementById("btnParseConfig"),
  cfgApiKey: document.getElementById("cfgApiKey"),
  cfgAuthDomain: document.getElementById("cfgAuthDomain"),
  cfgProjectId: document.getElementById("cfgProjectId"),
  cfgStorageBucket: document.getElementById("cfgStorageBucket"),
  cfgAppId: document.getElementById("cfgAppId"),
  btnResetConfig: document.getElementById("btnResetConfig"),

  // 房間切換彈窗
  roomModal: document.getElementById("roomModal"),
  roomNameInput: document.getElementById("roomNameInput"),
  btnCloseRoomModal: document.getElementById("btnCloseRoomModal"),
  btnCancelRoom: document.getElementById("btnCancelRoom"),
  btnConfirmRoom: document.getElementById("btnConfirmRoom"),
  quickRoomBtns: document.querySelectorAll(".quick-room-btn"),

  // Toast
  toastContainer: document.getElementById("toastContainer")
};

// ======================== 初始化 (Initialization) ========================

function init() {
  initRoomFromUrl();
  updateConfigStatusBadge();
  setupEventListeners();
  
  // 監聽 Firebase 登入狀態
  subscribeAuthState((user) => {
    state.currentUser = user;
    handleAuthStateChange(user);
  });
}

/**
 * 從網址查詢參數讀取房間 ID (如 ?room=my-team)
 */
function initRoomFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get("room");
  if (roomParam && roomParam.trim()) {
    state.currentRoom = roomParam.trim().toLowerCase();
  }
  updateRoomHeader();
}

function updateRoomHeader() {
  if (elements.currentRoomDisplay) {
    elements.currentRoomDisplay.textContent = state.currentRoom === "general" 
      ? "全體共享看板 (general)" 
      : `看板: ${state.currentRoom}`;
  }
}

/**
 * 檢查與更新 Firebase 設定徽章狀態
 */
function updateConfigStatusBadge() {
  const configured = isFirebaseConfigured();
  if (configured) {
    elements.configIndicatorDot.className = "w-2 h-2 rounded-full bg-emerald-500 online-pulse";
    elements.configIndicatorText.textContent = "Firebase 已連線";
    elements.configWarningBanner.classList.add("hidden");
  } else {
    elements.configIndicatorDot.className = "w-2 h-2 rounded-full bg-amber-500";
    elements.configIndicatorText.textContent = "需設定 API Key";
    elements.configWarningBanner.classList.remove("hidden");
  }
}

// ======================== 身份驗證與使用者狀態 (Auth State) ========================

function handleAuthStateChange(user) {
  if (user) {
    // 已登入
    elements.btnLogin.classList.add("hidden");
    elements.guestWelcomeCard.classList.add("hidden");
    elements.userProfile.classList.remove("hidden");

    const displayName = user.displayName || user.email.split("@")[0];
    elements.userName.textContent = displayName;
    elements.userMenuName.textContent = displayName;
    elements.userMenuEmail.textContent = user.email;
    
    if (user.photoURL) {
      elements.userAvatar.src = user.photoURL;
    } else {
      elements.userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff`;
    }

    // 啟動在線狀態與待辦監聽
    updatePresence(state.currentRoom, user);
    startTodosListener();
    startPresenceListener();
    showToast(`歡迎回來，${displayName}！`, "success");
  } else {
    // 尚未登入
    elements.btnLogin.classList.remove("hidden");
    elements.guestWelcomeCard.classList.remove("hidden");
    elements.userProfile.classList.add("hidden");

    // 停止即時監聽
    if (state.unsubscribeTodos) {
      state.unsubscribeTodos();
      state.unsubscribeTodos = null;
    }
    if (state.unsubscribePresence) {
      state.unsubscribePresence();
      state.unsubscribePresence = null;
    }

    state.todos = [];
    renderTodoList();
    updateStatistics();
  }
}

// ======================== 待辦事項資料同步與渲染 (Todos Sync & Render) ========================

function startTodosListener() {
  if (state.unsubscribeTodos) {
    state.unsubscribeTodos();
  }

  // 顯示載入中
  elements.todoList.innerHTML = `
    <div class="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
      <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500"></i>
      <p class="text-sm font-medium">正在載入「${state.currentRoom}」協作看板資料...</p>
    </div>
  `;
  lucide.createIcons();

  state.unsubscribeTodos = subscribeTodos(
    state.currentRoom, 
    (items) => {
      state.todos = items;
      renderTodoList();
      updateStatistics();
    }, 
    (error) => {
      console.error("載入待辦事項失敗:", error);
      let errMsg = "無法載入即時資料，請確認 Firestore 權限規則或網路連線。";
      if (error && error.code === "permission-denied") {
        errMsg = "Firestore 權限遭拒：請確認 Firestore 安全性規則已允許讀取與寫入。";
      }
      showToast(errMsg, "error");
      elements.todoList.innerHTML = `
        <div class="text-center py-12 bg-white rounded-2xl border border-red-200 p-6 text-red-600">
          <i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2 text-red-500"></i>
          <p class="text-sm font-bold">${errMsg}</p>
          <p class="text-xs text-slate-500 mt-2">專案 ID: my-to-do-list-912a6</p>
        </div>
      `;
      lucide.createIcons();
    }
  );
}

function startPresenceListener() {
  if (state.unsubscribePresence) {
    state.unsubscribePresence();
  }
  state.unsubscribePresence = subscribePresence(state.currentRoom, (users) => {
    state.presenceUsers = users;
  });
}

/**
 * 根據篩選條件與搜尋進行前端過濾與排序
 */
function getFilteredTodos() {
  return state.todos.filter((item) => {
    // 狀態篩選
    if (state.filterStatus === "active" && item.completed) return false;
    if (state.filterStatus === "completed" && !item.completed) return false;
    if (state.filterStatus === "my-tasks") {
      const currentUid = state.currentUser ? state.currentUser.uid : "";
      const isAssigned = item.assignedTo && item.assignedTo.uid === currentUid;
      const isCreated = item.createdBy && item.createdBy.uid === currentUid;
      if (!isAssigned && !isCreated) return false;
    }

    // 優先級篩選
    if (state.filterPriority !== "all" && item.priority !== state.filterPriority) {
      return false;
    }

    // 搜尋關鍵字
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchTitle = (item.title || "").toLowerCase().includes(q);
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      const matchCat = (item.category || "").toLowerCase().includes(q);
      const matchAssignee = item.assignedTo && (item.assignedTo.name || "").toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat && !matchAssignee) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    if (state.sortBy === "dueDate") {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (state.sortBy === "priority") {
      const pWeights = { high: 3, medium: 2, low: 1 };
      return (pWeights[b.priority] || 2) - (pWeights[a.priority] || 2);
    }
    // 預設最新建立 newest
    const aTime = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  });
}

/**
 * 渲染待辦事項列表
 */
function renderTodoList() {
  if (!state.currentUser) {
    elements.todoList.innerHTML = `
      <div class="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-soft">
        <div class="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <i data-lucide="lock" class="w-8 h-8"></i>
        </div>
        <h3 class="text-base font-bold text-slate-800 mb-1">請登入 Google 帳號以檢視與管理協作清單</h3>
        <p class="text-xs text-slate-500 max-w-md mx-auto mb-5">
          所有任務皆儲存在 Firebase 雲端資料庫，隨時隨地與隊友同步更新。
        </p>
        <button id="btnEmptyLogin" class="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-md transition">
          <i data-lucide="log-in" class="w-4 h-4"></i>
          <span>立即使用 Google 登入</span>
        </button>
      </div>
    `;
    const btnEmptyLogin = document.getElementById("btnEmptyLogin");
    if (btnEmptyLogin) {
      btnEmptyLogin.addEventListener("click", handleGoogleLogin);
    }
    lucide.createIcons();
    return;
  }

  const filtered = getFilteredTodos();

  if (filtered.length === 0) {
    const isFiltered = state.searchQuery || state.filterStatus !== "all" || state.filterPriority !== "all";
    elements.todoList.innerHTML = `
      <div class="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-soft">
        <div class="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <i data-lucide="${isFiltered ? 'search-x' : 'inbox'}" class="w-7 h-7"></i>
        </div>
        <h3 class="text-sm font-bold text-slate-700 mb-1">
          ${isFiltered ? "沒有符合篩選條件的任務" : "目前看板尚無待辦事項"}
        </h3>
        <p class="text-xs text-slate-400">
          ${isFiltered ? "請嘗試清除搜尋或變更狀態篩選" : "在上方輸入框輸入事項並按下 Enter 即可新增！"}
        </p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  // 渲染任務卡片
  elements.todoList.innerHTML = filtered.map((todo) => {
    const isCompleted = Boolean(todo.completed);
    
    // 優先級顏色標籤
    let priorityBadge = "";
    if (todo.priority === "high") {
      priorityBadge = `<span class="badge-priority-high text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center space-x-1"><span>🔴 高優先</span></span>`;
    } else if (todo.priority === "low") {
      priorityBadge = `<span class="badge-priority-low text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center space-x-1"><span>🟢 低優先</span></span>`;
    } else {
      priorityBadge = `<span class="badge-priority-medium text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center space-x-1"><span>🟡 中優先</span></span>`;
    }

    // 截止日期格式化
    let dueBadge = "";
    if (todo.dueDate) {
      const todayStr = new Date().toISOString().split("T")[0];
      const isOverdue = !isCompleted && todo.dueDate < todayStr;
      const isToday = !isCompleted && todo.dueDate === todayStr;
      
      const dueClass = isOverdue 
        ? "text-red-600 bg-red-50 border-red-200 font-bold" 
        : (isToday ? "text-amber-600 bg-amber-50 border-amber-200 font-semibold" : "text-slate-500 bg-slate-50 border-slate-200");
      
      dueBadge = `
        <span class="inline-flex items-center space-x-1 border px-2 py-0.5 rounded-md text-[11px] ${dueClass}">
          <i data-lucide="calendar" class="w-3 h-3"></i>
          <span>${todo.dueDate} ${isOverdue ? "(逾期)" : (isToday ? "(今天到期)" : "")}</span>
        </span>
      `;
    }

    // 協作者資訊
    const creatorName = todo.createdBy ? todo.createdBy.name : "未知使用者";
    const creatorAvatar = todo.createdBy && todo.createdBy.photoURL 
      ? todo.createdBy.photoURL 
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(creatorName)}&size=32`;

    return `
      <div class="todo-card group bg-white rounded-xl border border-slate-200/90 hover:border-indigo-300 p-3.5 sm:p-4 transition shadow-soft ${isCompleted ? 'opacity-70 bg-slate-50/70' : ''}" data-id="${todo.id}">
        <div class="flex items-start space-x-3">
          
          <!-- 完成核取方塊 -->
          <button type="button" class="btn-toggle-todo mt-0.5 flex-shrink-0 w-5 h-5 rounded-lg border-2 ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-500 bg-white'} flex items-center justify-center transition active:scale-90" data-id="${todo.id}" data-completed="${isCompleted}">
            ${isCompleted ? '<i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>' : ''}
          </button>

          <!-- 任務主要內容 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <h4 class="task-title text-sm font-semibold text-slate-800 leading-snug break-words ${isCompleted ? 'completed text-slate-400' : ''}">
                ${escapeHtml(todo.title)}
              </h4>
              
              <!-- 動作操作按鈕 (編輯、刪除) -->
              <div class="flex items-center space-x-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                <button type="button" class="btn-edit-todo p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition" title="編輯任務" data-id="${todo.id}">
                  <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                </button>
                <button type="button" class="btn-delete-todo p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition" title="刪除任務" data-id="${todo.id}">
                  <i data-lucide="trash" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>

            <!-- 詳細描述 (若有) -->
            ${todo.description ? `
              <p class="text-xs text-slate-500 mt-1 leading-relaxed whitespace-pre-line ${isCompleted ? 'line-through text-slate-300' : ''}">
                ${escapeHtml(todo.description)}
              </p>
            ` : ''}

            <!-- 標籤與協作資訊條 -->
            <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2.5 pt-1 text-slate-400 text-xs">
              ${priorityBadge}
              
              <span class="bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium px-2 py-0.5 rounded-md">
                ${escapeHtml(todo.category || '一般')}
              </span>

              ${dueBadge}

              <!-- 協作建立者頭像 -->
              <div class="ml-auto flex items-center space-x-1.5 text-[11px] text-slate-400 pl-2">
                <img src="${creatorAvatar}" alt="${escapeHtml(creatorName)}" class="w-4 h-4 rounded-full object-cover">
                <span class="truncate max-w-[120px]">${escapeHtml(creatorName)}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  }).join("");

  lucide.createIcons();
  attachTodoItemEvents();
}

/**
 * 綁定單一待辦卡片的事件 (完成切換、編輯、刪除)
 */
function attachTodoItemEvents() {
  // 切換完成
  document.querySelectorAll(".btn-toggle-todo").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const completed = btn.dataset.completed === "true";
      try {
        await toggleTodoStatus(state.currentRoom, id, completed, state.currentUser);
      } catch (err) {
        showToast("切換狀態失敗: " + err.message, "error");
      }
    });
  });

  // 編輯
  document.querySelectorAll(".btn-edit-todo").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      openEditModal(id);
    });
  });

  // 刪除
  document.querySelectorAll(".btn-delete-todo").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (confirm("確定要刪除這項協作任務嗎？此動作將同步至所有成員。")) {
        try {
          await deleteTodo(state.currentRoom, id);
          showToast("任務已刪除", "info");
        } catch (err) {
          showToast("刪除失敗: " + err.message, "error");
        }
      }
    });
  });
}

/**
 * 更新頂端統計數據卡片
 */
function updateStatistics() {
  const total = state.todos.length;
  const completed = state.todos.filter(t => t.completed).length;
  const active = total - completed;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  elements.statTotalCount.textContent = total;
  elements.statActiveCount.textContent = active;
  elements.statCompletedCount.textContent = completed;
  elements.statCompletionRate.textContent = `${rate}%`;
  elements.statProgressBar.style.width = `${rate}%`;
}

// ======================== 表單與事件監聽 (Event Handlers) ========================

function setupEventListeners() {
  // Google 登入按鈕
  elements.btnLogin.addEventListener("click", handleGoogleLogin);
  elements.btnHeroLogin.addEventListener("click", handleGoogleLogin);

  // 使用者選單下拉切換
  elements.userMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    elements.userDropdown.classList.toggle("hidden");
  });
  document.addEventListener("click", () => {
    elements.userDropdown.classList.add("hidden");
  });

  // 登出按鈕
  elements.btnLogout.addEventListener("click", async () => {
    try {
      await logoutUser();
      showToast("已成功登出", "info");
    } catch (e) {
      showToast("登出失敗: " + e.message, "error");
    }
  });

  // 新增待辦表單送出
  elements.addTodoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.currentUser) {
      showToast("請先使用 Google 帳號登入才能新增待辦！", "error");
      handleGoogleLogin();
      return;
    }

    const title = elements.todoTitleInput.value.trim();
    if (!title) return;

    const payload = {
      title: title,
      priority: elements.todoPrioritySelect.value,
      category: elements.todoCategorySelect.value,
      dueDate: elements.todoDueDateInput.value || null
    };

    try {
      await createTodo(state.currentRoom, payload, state.currentUser);
      elements.todoTitleInput.value = "";
      elements.todoDueDateInput.value = "";
      showToast("任務已即時新增至雲端！", "success");
    } catch (err) {
      showToast("新增失敗: " + err.message, "error");
    }
  });

  // 篩選頁籤切換
  elements.filterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      elements.filterTabs.forEach(t => {
        t.classList.remove("active", "bg-white", "text-indigo-700", "shadow-sm");
        t.classList.add("text-slate-600");
      });
      tab.classList.add("active", "bg-white", "text-indigo-700", "shadow-sm");
      tab.classList.remove("text-slate-600");
      
      state.filterStatus = tab.dataset.filter;
      renderTodoList();
    });
  });

  // 優先級篩選
  elements.priorityFilterSelect.addEventListener("change", (e) => {
    state.filterPriority = e.target.value;
    renderTodoList();
  });

  // 排序變更
  elements.sortSelect.addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    renderTodoList();
  });

  // 搜尋即時過濾
  elements.searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.trim();
    renderTodoList();
  });

  // 清除已完成任務
  elements.btnClearCompleted.addEventListener("click", async () => {
    const completedItems = state.todos.filter(t => t.completed);
    if (completedItems.length === 0) {
      showToast("目前沒有已完成的事項", "info");
      return;
    }
    if (confirm(`確定要清除這 ${completedItems.length} 項已完成的任務嗎？`)) {
      try {
        await clearCompletedTodos(state.currentRoom, completedItems.map(t => t.id));
        showToast("已批量清除完成任務", "success");
      } catch (err) {
        showToast("清除失敗: " + err.message, "error");
      }
    }
  });

  // 分享看板按鈕
  elements.btnShareRoom.addEventListener("click", () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(state.currentRoom)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast(`協作連結已複製！發送給夥伴即可共同編輯。`, "success");
      }).catch(() => {
        prompt("請複製此協作網址分享給好友：", shareUrl);
      });
    } else {
      prompt("請複製此協作網址分享給好友：", shareUrl);
    }
  });

  // 切換看板彈窗
  elements.btnSwitchRoom.addEventListener("click", () => {
    elements.roomNameInput.value = state.currentRoom;
    elements.roomModal.classList.remove("hidden");
  });
  elements.btnCloseRoomModal.addEventListener("click", () => elements.roomModal.classList.add("hidden"));
  elements.btnCancelRoom.addEventListener("click", () => elements.roomModal.classList.add("hidden"));
  elements.btnConfirmRoom.addEventListener("click", handleSwitchRoom);
  elements.quickRoomBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      elements.roomNameInput.value = btn.dataset.room;
      handleSwitchRoom();
    });
  });

  // 編輯任務彈窗
  elements.btnCloseEditModal.addEventListener("click", closeEditModal);
  elements.btnCancelEdit.addEventListener("click", closeEditModal);
  elements.editTodoForm.addEventListener("submit", handleSaveEdit);

  // Firebase 設定彈窗
  elements.btnOpenConfig.addEventListener("click", openConfigModal);
  elements.btnBannerOpenConfig.addEventListener("click", openConfigModal);
  elements.btnCloseConfigModal.addEventListener("click", closeConfigModal);
  elements.btnCancelConfig.addEventListener("click", closeConfigModal);
  elements.configForm.addEventListener("submit", handleSaveConfig);
  elements.btnResetConfig.addEventListener("click", handleResetConfig);
  elements.btnParseConfig.addEventListener("click", handleParsePastedConfig);
}

// ======================== Google 登入處理 (Google Login) ========================

async function handleGoogleLogin() {
  try {
    await loginWithGoogle();
  } catch (error) {
    alert(error.message);
  }
}

// ======================== 看板切換處理 (Room Switcher) ========================

function handleSwitchRoom() {
  const newRoom = (elements.roomNameInput.value || "general").trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
  if (!newRoom) return;

  state.currentRoom = newRoom;
  updateRoomHeader();
  elements.roomModal.classList.add("hidden");

  // 更新網址 Query String (不重新整理頁面)
  const newUrl = `${window.location.pathname}?room=${encodeURIComponent(newRoom)}`;
  window.history.pushState({ room: newRoom }, "", newUrl);

  // 重新啟動監聽
  if (state.currentUser) {
    updatePresence(newRoom, state.currentUser);
    startTodosListener();
    startPresenceListener();
    showToast(`已切換至「${newRoom}」協作看板`, "info");
  }
}

// ======================== 編輯任務處理 (Edit Modal) ========================

function openEditModal(todoId) {
  const todo = state.todos.find(t => t.id === todoId);
  if (!todo) return;

  elements.editTodoId.value = todo.id;
  elements.editTodoTitle.value = todo.title || "";
  elements.editTodoDesc.value = todo.description || "";
  elements.editTodoPriority.value = todo.priority || "medium";
  elements.editTodoCategory.value = todo.category || "工作";
  elements.editTodoDueDate.value = todo.dueDate || "";

  elements.editTodoModal.classList.remove("hidden");
  elements.editTodoTitle.focus();
}

function closeEditModal() {
  elements.editTodoModal.classList.add("hidden");
}

async function handleSaveEdit(e) {
  e.preventDefault();
  const id = elements.editTodoId.value;
  if (!id) return;

  const payload = {
    title: elements.editTodoTitle.value.trim(),
    description: elements.editTodoDesc.value.trim(),
    priority: elements.editTodoPriority.value,
    category: elements.editTodoCategory.value,
    dueDate: elements.editTodoDueDate.value || null
  };

  try {
    await updateTodo(state.currentRoom, id, payload, state.currentUser);
    closeEditModal();
    showToast("任務內容已更新並同步！", "success");
  } catch (err) {
    showToast("更新失敗: " + err.message, "error");
  }
}

// ======================== Firebase 設定精靈處理 (Firebase Config Modal) ========================

function openConfigModal() {
  const currentCfg = getActiveFirebaseConfig();
  elements.cfgApiKey.value = currentCfg.apiKey && currentCfg.apiKey !== "YOUR_FIREBASE_API_KEY" ? currentCfg.apiKey : "";
  elements.cfgAuthDomain.value = currentCfg.authDomain || "my-to-do-list-912a6.firebaseapp.com";
  elements.cfgProjectId.value = "my-to-do-list-912a6";
  elements.cfgStorageBucket.value = currentCfg.storageBucket || "my-to-do-list-912a6.firebasestorage.app";
  elements.cfgAppId.value = currentCfg.appId || "";
  elements.configModal.classList.remove("hidden");
}

function closeConfigModal() {
  elements.configModal.classList.add("hidden");
}

function handleParsePastedConfig() {
  const raw = elements.cfgPasteInput.value;
  if (!raw || !raw.trim()) {
    showToast("請先貼上 Firebase 設定程式碼", "error");
    return;
  }

  // 嘗試使用正規表示法解析
  try {
    const apiKeyMatch = raw.match(/apiKey\s*:\s*["']([^"']+)["']/);
    const authDomainMatch = raw.match(/authDomain\s*:\s*["']([^"']+)["']/);
    const storageBucketMatch = raw.match(/storageBucket\s*:\s*["']([^"']+)["']/);
    const appIdMatch = raw.match(/appId\s*:\s*["']([^"']+)["']/);

    let parsedAny = false;
    if (apiKeyMatch) {
      elements.cfgApiKey.value = apiKeyMatch[1];
      parsedAny = true;
    }
    if (authDomainMatch) {
      elements.cfgAuthDomain.value = authDomainMatch[1];
      parsedAny = true;
    }
    if (storageBucketMatch) {
      elements.cfgStorageBucket.value = storageBucketMatch[1];
      parsedAny = true;
    }
    if (appIdMatch) {
      elements.cfgAppId.value = appIdMatch[1];
      parsedAny = true;
    }

    if (parsedAny) {
      showToast("成功解析設定！請點擊下方「儲存並重新連線」", "success");
    } else {
      showToast("無法自動解析，請手動複製 API Key 填入", "error");
    }
  } catch (err) {
    showToast("解析失敗，請手動填寫欄位", "error");
  }
}

function handleSaveConfig(e) {
  e.preventDefault();
  const apiKey = elements.cfgApiKey.value.trim();
  if (!apiKey) {
    showToast("API Key 為必填項目！", "error");
    return;
  }

  const newConfig = {
    apiKey: apiKey,
    authDomain: elements.cfgAuthDomain.value.trim() || "my-to-do-list-912a6.firebaseapp.com",
    projectId: "my-to-do-list-912a6",
    storageBucket: elements.cfgStorageBucket.value.trim() || "my-to-do-list-912a6.firebasestorage.app",
    appId: elements.cfgAppId.value.trim() || ""
  };

  saveFirebaseConfig(newConfig);
  showToast("Firebase 設定已儲存，正在重新載入應用程式...", "success");
  setTimeout(() => {
    window.location.reload();
  }, 800);
}

function handleResetConfig() {
  if (confirm("確定要重設自訂設定為預設值嗎？")) {
    resetFirebaseConfig();
    showToast("設定已重設，正在重新載入...", "info");
    setTimeout(() => {
      window.location.reload();
    }, 800);
  }
}

// ======================== 工具函式 (Helper Utilities) ========================

/**
 * 簡易 Toast 提示訊息
 */
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  const bgColors = {
    success: "bg-slate-900 text-white border-slate-700",
    error: "bg-red-600 text-white border-red-500",
    info: "bg-indigo-600 text-white border-indigo-500"
  };
  const iconNames = {
    success: "check-circle",
    error: "alert-circle",
    info: "info"
  };

  toast.className = `toast-slide-in pointer-events-auto flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl border ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    <i data-lucide="${iconNames[type] || 'info'}" class="w-4 h-4 flex-shrink-0"></i>
    <span>${escapeHtml(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 啟動應用程式
init();
