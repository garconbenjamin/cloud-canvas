# CloudCanvas 部署

這份文件只保留部署與維運需要的設定。功能介紹與使用方式請看 [README.md](./README.md)。

## 架構

| 服務              | 用途                                 | 設定檔                  |
| ----------------- | ------------------------------------ | ----------------------- |
| Cloudflare Pages  | 前端與 Pages Functions               | `wrangler.jsonc`        |
| Cloudflare Worker | WebSocket 即時同步與 Durable Objects | `wrangler.worker.jsonc` |
| D1                | 畫布與節點資料                       | `DB` binding            |
| R2                | 圖片檔案                             | `R2_BUCKET` binding     |

Pages 與 Worker 是兩個獨立的 Cloudflare 服務，都可以連到同一個 GitHub Repository，但部署設定不同。

## 第一次設定

### 1. 登入 Wrangler

```bash
pnpm exec wrangler login
pnpm exec wrangler whoami
```

### 2. 確認 Cloudflare 資源

目前設定檔預期使用以下資源：

- D1：`canvas-d1-prod`
- R2：`canvas-assets`
- Pages：`cloud-canvas`
- Worker：`cloud-canvas-sync`

如果資源尚未建立，可使用：

```bash
pnpm exec wrangler d1 create canvas-d1-prod
pnpm exec wrangler r2 bucket create canvas-assets
```

建立 D1 後，將回傳的 `database_id` 填入 `wrangler.jsonc`，再初始化資料表：

```bash
pnpm exec wrangler d1 execute canvas-d1-prod --remote --file=./schema.sql
```

不要把 API token、R2 金鑰或其他秘密寫進 Repository。需要秘密時，請在 Cloudflare Dashboard 的 Settings > Variables and Secrets 設定。

## GitHub 自動部署

### Pages `cloud-canvas`

在 Cloudflare Dashboard 建立或連結 GitHub Repository `garconbenjamin/cloud-canvas`：

- Production branch：`main`
- Build command：`pnpm build`
- Deploy command：留空，或使用 Pages 的預設部署流程
- Root directory：留空
- Build output directory：若介面要求，填 `dist`；若沒有此欄位，使用 `wrangler.jsonc` 的 `pages_build_output_dir`

Pages Functions 會隨著 Pages 部署一起發布，無需另外執行 Worker deploy command。

### Worker `cloud-canvas-sync`

Worker 也可以連結同一個 GitHub Repository，但部署設定要使用 Worker 的 Wrangler 設定：

- Build command：`pnpm install --frozen-lockfile`
- Deploy command：`pnpm exec wrangler deploy --config wrangler.worker.jsonc`
- Production branch：`main`
- 非 production branch：可留空；需要 Preview Worker 時再設定獨立的 Worker 名稱與環境

Worker 的 Durable Objects 綁定與 migration 已寫在 `wrangler.worker.jsonc`，不要在 Dashboard 另外建立同名 binding。

## 手動部署

本地確認通過後，可以分別部署 Pages 與 Worker：

```bash
pnpm build
pnpm pages:deploy
pnpm worker:deploy
```

如果只修改前端或 Pages Functions，不需要重新部署 Worker；如果修改 `worker-durable-objects/` 或 `wrangler.worker.jsonc`，才需要部署 Worker。

## 環境變數

### Pages

在 Cloudflare Pages 的 Settings > Variables and Secrets 設定：

| 名稱                              | 用途                                                                     | 必要性                     |
| --------------------------------- | ------------------------------------------------------------------------ | -------------------------- |
| `VITE_WS_HOST`                    | Worker 的 WebSocket 網址，例如 `cloud-canvas-sync.<account>.workers.dev` | 生產環境必要               |
| `GOOGLE_CLIENT_ID`                | Google 登入設定                                                          | 使用 Google 登入時必要     |
| `CLOUDFLARE_R2_ACCOUNT_ID`        | R2 存取設定                                                              | 使用外部 S3 相容上傳時需要 |
| `CLOUDFLARE_R2_ACCESS_KEY_ID`     | R2 存取金鑰                                                              | 使用外部 S3 相容上傳時需要 |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | R2 秘密金鑰                                                              | 使用外部 S3 相容上傳時需要 |

D1 與 R2 的主要資源透過 `wrangler.jsonc` binding 設定，不要把 binding 名稱改成環境變數。

### WebSocket 網址

`VITE_WS_HOST` 只填主機名稱，不要加 `https://`、`wss://` 或路徑：

```text
cloud-canvas-sync.example.workers.dev
```

前端會依照目前頁面的 HTTP/HTTPS 自動選擇 `ws://` 或 `wss://`。

## 本地開發

一般開發只需要：

```bash
pnpm install
pnpm dev
```

這會啟動前端、API 與本地 WebSocket。若要測試 Worker 本身：

```bash
pnpm worker:dev
```

提交前建議執行：

```bash
pnpm lint
pnpm lint:eslint
pnpm build
```

## 排錯

### Pages 建置失敗

確認 Pages 使用 `pnpm build`，且 Repository 有 `pnpm-lock.yaml`。如果看到 frozen lockfile 錯誤，請在本地執行 `pnpm install` 後提交更新過的 lockfile。

### Worker 部署失敗

先確認使用正確設定檔：

```bash
pnpm exec wrangler deploy --config wrangler.worker.jsonc
```

查看即時日誌：

```bash
pnpm exec wrangler tail cloud-canvas-sync
```

### Header 顯示離線

1. 確認 `cloud-canvas-sync` Worker 已成功部署。
2. 確認 Pages 的 `VITE_WS_HOST` 指向 Worker 主機名稱。
3. 重新部署 Pages，因為 `VITE_*` 變數會在建置前端時寫入 bundle。
4. 在瀏覽器 DevTools 的 Network > WS 檢查 WebSocket 是否成功連線。

### D1 或 R2 錯誤

確認 `wrangler.jsonc` 的 binding 名稱與資源名稱正確：`DB`、`R2_BUCKET`。修改 binding 後重新部署 Pages。
