# MyToDoList - 多人即時協作待辦清單

一個現代化、簡潔高效且支援多人即時協作的 Web 待辦事項清單。連線至您的 Firebase 專案 `my-to-do-list-912a6`，具備 Google 帳號一鍵登入、Cloud Firestore 毫秒級雙向同步、任務指派、優先級分類、截止日提醒及多看板協同等完整功能。

---

## 🌟 核心特色

1. **Google 帳號快速登入**
   - 使用 Firebase Authentication (GoogleAuthProvider)，一鍵安全登入。
   - 自動帶入 Google 個人頭像、顯示名稱與 Email。

2. **多人即時協同運作 (Cloud Firestore)**
   - 採用 Firestore `onSnapshot` 即時監聽機制，團隊中任一人新增、修改、打勾完成或刪除任務，所有成員畫面瞬間同步，免手動重新整理。
   - 記錄每項任務的「建立者」與「最後修改者」。

3. **靈活的協作看板 (Multi-board Rooms)**
   - 預設包含「全體共享看板 (`general`)」。
   - 支援自由建立或切換專屬看板（例如 `work`、`sprint-1`、`family`）。
   - 提供「複製協作連結」功能（如 `?room=sprint-1`），將網址發給夥伴即可立刻進入同一個看板進行協作。

4. **完整任務管理功能**
   - **優先級設定**：高（🔴）、中（🟡）、低（🟢）。
   - **分類標籤**：工作、開發、會議、生活、其他。
   - **截止日期**：逾期與今日到期自動警示標籤。
   - **檢視與篩選**：狀態分頁（全部 / 進行中 / 已完成 / 指派給我）、優先級過濾、關鍵字即時搜尋、智慧排序。
   - **進度統計面板**：即時計算完成率與視覺化進度條。

5. **零相依套件、隨開即用**
   - 採用純 HTML5 + Tailwind CSS + 原生 ES Module (Firebase SDK v11)，無需安裝 Node.js 或打包工具。
   - 內建 Windows 原生 PowerShell HTTP 伺服器，雙擊 `start.bat` 即可啟動。

---

## 🚀 快速啟動方式

由於 Google 登入驗證（OAuth）要求在 HTTP/HTTPS 環境下運作（不能使用 `file:///` 協定）：

### 方式一：Windows 一鍵啟動 (推薦)
1. 在資料夾中找到 **`start.bat`**。
2. **連按兩下 (Double Click) `start.bat`**。
3. 系統將自動啟動本地伺服器並開啟瀏覽器前往 `http://localhost:5000`！

### 方式二：使用 PowerShell 啟動
在資料夾中打開 PowerShell 執行：
```powershell
.\serve.ps1
```

---

## ⚙️ Firebase 專案設定指南 (`my-to-do-list-912a6`)

此應用程式已預設繫結專案 ID `my-to-do-list-912a6`。首次使用請確認以下三項設定：

### 步驟 1：啟用 Google 登入服務
1. 開啟 [Firebase Console - Authentication](https://console.firebase.google.com/project/my-to-do-list-912a6/authentication/providers)。
2. 點選「新增提供者」並選擇 **Google**。
3. 開啟開關，填寫專案支援電子郵件，點擊「儲存」。
4. 切換至「Settings (設定)」分頁，檢查「Authorized domains (已授權網域)」中是否包含 `localhost`（通常預設已包含）。

### 步驟 2：建立 Cloud Firestore 資料庫與規則
1. 開啟 [Firebase Console - Firestore Database](https://console.firebase.google.com/project/my-to-do-list-912a6/firestore)。
2. 若尚未建立，點選「建立資料庫」（選擇離您最近的地點，例如 `asia-east1` 台灣）。
3. 前往「Rules (規則)」分頁，貼入以下規則以允許已登入成員協同讀寫：
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      allow read, write: if request.auth != null;
      match /todos/{todoId} {
        allow read, write: if request.auth != null;
      }
      match /presence/{userId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```
4. 點選「發佈 (Publish)」。

### 步驟 3：填入 Web API Key
1. 前往 [Firebase Console - 專案設定 (一般)](https://console.firebase.google.com/project/my-to-do-list-912a6/settings/general)。
2. 向下滑動至「您的應用程式」，找到或建立 Web 應用程式（`</>` 圖示）。
3. 複製其中的 `apiKey`。
4. **填入方式（二選一）：**
   - **方式 A（免改代碼）**：啟動網頁後，點選畫面右上角「**Firebase 設定**」，直接貼上 API Key（或貼上整段設定），點選「儲存並重新連線」！
   - **方式 B（持久化設定）**：編輯 `js/firebase-config.js`，將 `apiKey: "YOUR_FIREBASE_API_KEY"` 替換為您的金鑰。

---

## 📁 檔案結構說明

```
MyToDoList/
├── index.html              # 應用程式主頁面 (響應式 UI、互動元件與彈窗)
├── css/
│   └── styles.css          # 自訂樣式、微動畫、狀態色彩
├── js/
│   ├── firebase-config.js  # Firebase 初始化、專案設定與 localStorage 快取管理
│   ├── auth.js             # Google 登入、登出與狀態監聽
│   ├── todos.js            # Firestore CRUD 操作、即時監聽與狀態廣播
│   └── app.js              # 核心控制器、視圖渲染、篩選搜尋與事件處理
├── serve.ps1               # 輕量級 PowerShell 原生靜態 HTTP 伺服器
├── start.bat               # Windows 雙擊啟動捷徑
├── firestore.rules         # 預設 Firestore 安全性規則
├── firebase.json           # Firebase Hosting 部署設定檔
├── .firebaserc             # 預設 Firebase 專案定義檔
└── README.md               # 專案詳細說明文檔
```
