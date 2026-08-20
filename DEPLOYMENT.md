# CloudCanvas 整合部署指南

## 架構概覽

```
┌─────────────────────────────────────────────────────┐
│              cloud-canvas (Cloudflare Pages)         │
├─────────────────────────────────────────────────────┤
│  靜態資源 (dist/)                                    │
│  └── index.html, JS, CSS                            │
├─────────────────────────────────────────────────────┤
│  Pages Functions (functions/)                       │
│  ├── GET  /api/board/:id/nodes                     │
│  ├── POST /api/board/:id/nodes                     │
│  ├── POST /api/board/:id/nodes/batch               │
│  ├── DELETE /api/board/:id/nodes/:nodeId            │
│  ├── POST /api/board/:id/nodes/batch-delete        │
│  ├── POST /api/board/:id/reset                     │
│  ├── POST /api/upload                              │
│  ├── GET  /api/storage/:key                        │
│  └── GET  /api/config                              │
├─────────────────────────────────────────────────────┤
│  Durable Objects Worker (worker-durable-objects/)   │
│  └── WebSocket 即時同步                              │
└─────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
    ┌─────────┐                   ┌─────────┐
    │   D1    │                   │   R2    │
    └─────────┘                   └─────────┘
```

## 部署步驟

### 1. 部署 Durable Objects Worker

```bash
# 登入 Cloudflare
npx wrangler login

# 部署 Worker
npx wrangler deploy

# 記錄 Worker URL (例如: cloud-canvas-sync.your-subdomain.workers.dev)
```

### 2. 設定 Pages 專案

在 Cloudflare Dashboard 中：

1. 進入 Pages 專案 `cloud-canvas` 的設定
2. 在 **Functions** 頁籤中新增綁定：
   - **D1 資料庫**: 名稱 `DB`，選擇 `canvas-d1-prod`
   - **R2 Bucket**: 名稱 `R2_BUCKET`，選擇 `canvas-assets`
3. 在 **Settings > Environment variables** 中新增：
   - `VITE_WS_HOST` = `cloud-canvas-sync.your-subdomain.workers.dev`

### 3. 部署 Pages

```bash
# 建構前端
pnpm build

# 部署到 Pages
npx wrangler pages deploy dist --project-name cloud-canvas
```

### 4. 初始化 D1 資料庫

```bash
# 執行 schema.sql
npx wrangler d1 execute canvas-d1-prod --remote --file=./schema.sql
```

## 本地開發

### 方案 A：使用本地伺服器 (推薦)

```bash
pnpm dev
```

這會啟動 Express 伺服器，包含：
- Vite 開發伺服器 (前端熱更新)
- REST API 端點
- WebSocket 即時同步

### 方案 B：使用 Pages 本地開發

```bash
# 建構前端
pnpm build

# 啟動 Pages 本地開發
pnpm dev:pages
```

注意：Pages 本地開發不支援 WebSocket，需要 Durable Objects Worker。

## 環境變數

| 變數 | 說明 | 本地開發 | 生產環境 |
|------|------|---------|---------|
| `VITE_WS_HOST` | WebSocket 伺服器地址 | 不需要 | 設定為 Worker URL |
| `CLOUDFLARE_R2_ACCOUNT_ID` | R2 帳戶 ID | 選擇性 | 選擇性 |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | R2 存取金鑰 | 選擇性 | 選擇性 |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | R2 秘密金鑰 | 選擇性 | 選擇性 |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | 選擇性 | 選擇性 |

## 部署檢查清單

- [ ] D1 資料庫已建立並執行 schema.sql
- [ ] R2 Bucket 已建立
- [ ] Durable Objects Worker 已部署
- [ ] Pages 專案已綁定 D1、R2、Worker
- [ ] 環境變數已設定
- [ ] 前端已建構並部署

## 故障排除

### WebSocket 無法連線

1. 確認 Durable Objects Worker 已部署
2. 確認 `VITE_WS_HOST` 環境變數已設定
3. 檢查 Worker 日誌：`npx wrangler tail`

### API 請求失敗

1. 確認 Pages Functions 已正確部署
2. 確認 D1、R2 綁定已設定
3. 檢查 Pages 函數日誌：Cloudflare Dashboard > Pages > Functions

### 資料庫錯誤

1. 確認 D1 資料庫已建立
2. 確認 schema.sql 已執行
3. 檢查資料庫表格是否存在
