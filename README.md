# CloudCanvas

CloudCanvas 是一個多人即時協作的無限畫布，支援節點編輯、圖片上傳、Google 登入、分享連結與即時游標同步。

- 線上使用：[cloud-canvas-6ry.pages.dev](https://cloud-canvas-6ry.pages.dev/)
- 原始碼：[github.com/garconbenjamin/cloud-canvas](https://github.com/garconbenjamin/cloud-canvas)

## 使用教學

### 1. 建立或開啟畫布

1. 開啟 [CloudCanvas](https://cloud-canvas-6ry.pages.dev/)。
2. 點選「新增畫布」建立新的畫布。
3. 也可以在首頁貼上分享代碼或完整分享連結，開啟已存在的畫布。
4. 不存在的畫布無法直接建立，請使用有效的分享連結或代碼。

### 2. 編輯畫布

使用畫布下方工具列可以新增矩形、圓形、文字、便利貼、圖片與箭頭。

- 點擊物件後可以選取、移動、調整大小與旋轉。
- 按住 `Shift` 可以選取多個物件。
- 使用滑鼠滾輪縮放畫布。
- 按住空白鍵並拖曳可以平移畫布。
- 使用左側圖層面板可以搜尋、選取、隱藏或鎖定物件。
- 右側屬性面板可以修改物件的顏色、文字、尺寸與其他設定。

### 3. 分享與多人協作

1. 開啟畫布後，點選右上角「分享」。
2. 系統會複製分享連結到剪貼簿。
3. 將連結傳給其他協作者即可開啟同一個畫布。
4. 對方的游標、選取物件與節點變更會即時顯示在畫面上。
5. 畫布名稱旁的小燈號代表同步狀態：綠色表示已連線、黃色表示連線中、灰色表示離線。

### 4. 登入與圖片

- 點選右上角帳號按鈕，可以使用 Google 登入或切換協作者身份。
- 登入後可查看建立者資訊，節點也會保留建立者與最後編輯者。
- 使用圖片工具或將圖片拖曳到畫布即可上傳圖片。

## 本地開發

需求：Node.js 18+、pnpm 9+

```bash
pnpm install
pnpm dev
```

開發伺服器啟動後，前往終端機顯示的本機網址即可使用。這個模式包含前端、API 與 WebSocket 即時同步服務。

常用指令：

```bash
pnpm build          # 建置前端
pnpm lint           # TypeScript 檢查
pnpm lint:eslint   # ESLint 檢查
pnpm format:check  # Prettier 格式檢查
```

## 部署

CloudCanvas 使用 Cloudflare Pages 提供前端與 API，使用 Durable Objects Worker 提供 WebSocket 即時同步，並使用 D1 保存畫布資料、R2 儲存圖片。

完整部署設定請參考 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## 專案進度檢查表

- [x] 公開 GitHub Repository 與 Cloudflare Pages 部署
- [x] 線上網址可以正常開啟並顯示應用程式
- [x] 新增矩形、圓形、文字、便利貼、圖片與箭頭
- [x] 選取、拖曳、調整大小、旋轉與刪除物件
- [x] 圖層搜尋、隱藏與鎖定
- [x] D1 畫布資料持久化，重新整理後保留內容
- [x] 多人同時開啟同一個畫布
- [x] 節點變更即時同步
- [x] 對方游標、選取物件與拖曳狀態即時同步
- [x] WebSocket 斷線後自動重新連線
- [x] Header 顯示同步連線狀態
- [x] Google OAuth 登入與協作者身份顯示
- [x] 節點建立者與最後編輯者資訊
- [x] R2 圖片上傳與持久化
- [x] 分享連結與分享代碼
- [x] 無效畫布路由防護，避免直接建立不存在的畫布
