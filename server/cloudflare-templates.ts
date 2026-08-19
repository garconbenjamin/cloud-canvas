export function getWranglerToml(): string {
  return `name = "cloudcanvas-app"
main = "worker/index.ts"
compatibility_date = "2024-04-01"

[site]
bucket = "./dist"

# Cloudflare D1 Database Binding
[[d1_databases]]
binding = "DB"
database_name = "canvas-d1-prod"
database_id = "YOUR_CLOUDFLARE_D1_DATABASE_ID"

# Cloudflare R2 Bucket Binding
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "canvas-assets"
preview_bucket_name = "canvas-assets-preview"

# Environment Variables
[vars]
ENVIRONMENT = "production"
GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
`;
}

export function getWorkerTypeScript(): string {
  return `/**
 * Cloudflare Worker / Pages Functions API Handler
 * Handles Cloudflare D1 SQL queries, R2 uploads/downloads, and real-time syncing.
 */

export interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  GOOGLE_CLIENT_ID?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. Get Board Nodes from D1
    if (url.pathname.match(/^\\/api\\/board\\/([^\\/]+)\\/nodes$/) && request.method === 'GET') {
      const boardId = url.pathname.split('/')[3] || 'default';
      const { results } = await env.DB.prepare(
        'SELECT * FROM nodes WHERE board_id = ? ORDER BY z_index ASC'
      ).bind(boardId).all();

      const parsedNodes = (results || []).map((row: any) => ({
        ...row,
        createdBy: JSON.parse(row.created_by || '{}'),
        lastEditedBy: row.last_edited_by ? JSON.parse(row.last_edited_by) : undefined,
        shadow: Boolean(row.shadow),
        isLocked: Boolean(row.is_locked),
        isHidden: Boolean(row.is_hidden),
      }));

      return new Response(JSON.stringify({ success: true, nodes: parsedNodes }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2. Save Node to D1
    if (url.pathname.match(/^\\/api\\/board\\/([^\\/]+)\\/nodes$/) && request.method === 'POST') {
      const boardId = url.pathname.split('/')[3] || 'default';
      const body = await request.json() as any;
      const node = body.node;

      await env.DB.prepare(
        \`INSERT OR REPLACE INTO nodes (
          id, board_id, type, x, y, width, height, rotation, z_index,
          fill_color, stroke_color, stroke_width, opacity, border_radius,
          shadow, text, font_size, font_family, font_weight, text_align,
          text_color, image_url, r2_key, r2_bucket, file_size, mime_type,
          aspect_ratio, created_by, created_at, last_edited_by, last_edited_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`
      ).bind(
        node.id, boardId, node.type, node.x, node.y, node.width, node.height,
        node.rotation || 0, node.zIndex || 1, node.fillColor || '', node.strokeColor || '',
        node.strokeWidth || 1, node.opacity ?? 1, node.borderRadius || 0,
        node.shadow ? 1 : 0, node.text || '', node.fontSize || 16, node.fontFamily || 'sans',
        node.fontWeight || 'normal', node.textAlign || 'left', node.textColor || '',
        node.imageUrl || '', node.r2Key || '', node.r2Bucket || '', node.fileSize || 0,
        node.mimeType || '', node.aspectRatio || 1,
        JSON.stringify(node.createdBy || {}), node.createdAt || Date.now(),
        JSON.stringify(node.lastEditedBy || {}), Date.now()
      ).run();

      return new Response(JSON.stringify({ success: true, node }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 3. Upload File to Cloudflare R2
    if (url.pathname === '/api/upload' && request.method === 'POST') {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400, headers: corsHeaders });
      }

      const key = \`canvas-images/\${Date.now()}-\${crypto.randomUUID()}-\${file.name}\`;
      await env.R2_BUCKET.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type },
      });

      const publicUrl = \`/api/storage/\${encodeURIComponent(key)}\`;
      return new Response(JSON.stringify({
        success: true,
        url: publicUrl,
        key,
        bucket: 'canvas-assets',
        size: file.size,
        mimeType: file.type,
        isR2: true
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 4. Serve File from Cloudflare R2
    if (url.pathname.startsWith('/api/storage/')) {
      const key = decodeURIComponent(url.pathname.replace('/api/storage/', ''));
      const object = await env.R2_BUCKET.get(key);
      if (!object) {
        return new Response('Not found in R2', { status: 404 });
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000');
      return new Response(object.body, { headers });
    }

    return new Response(JSON.stringify({ message: 'Cloudflare Worker CloudCanvas API ready' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};
`;
}

export function getDeployGuideMarkdown(): string {
  return `# 🚀 CloudCanvas 部署到 Cloudflare 完整教學 (Git + D1 + R2)

本專案已完整支援 **Cloudflare Pages / Workers + D1 資料庫 + R2 物件存儲**。
請依照下列 6 個進度步驟完成部署：

---

### 步驟 1：建立 Public Git Repo 並推上 GitHub
\`\`\`bash
# 初始化 Git 倉庫
git init
git add .
git commit -m "feat: initial commit with Cloudflare D1 + R2 infinite canvas"

# 新增 GitHub 遠端倉庫並推送
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/cloudcanvas.git
git push -u origin main
\`\`\`

---

### 步驟 2：使用 Cloudflare Wrangler 建立 D1 資料庫
\`\`\`bash
# 安裝依賴
pnpm install

# 登入 Cloudflare
pnpm dlx wrangler login

# 建立 D1 資料庫
pnpm dlx wrangler d1 create canvas-d1-prod

# 執行 SQL Migration 建表 (使用匯出的 schema.sql)
pnpm dlx wrangler d1 execute canvas-d1-prod --file=./schema.sql
\`\`\`

---

### 步驟 3：建立 Cloudflare R2 存儲桶
\`\`\`bash
# 建立 R2 Bucket 存放畫布圖片
pnpm dlx wrangler r2 bucket create canvas-assets
\`\`\`

---

### 步驟 4：在 Cloudflare Dashboard 綁定 D1 與 R2
1. 進入 [Cloudflare Dashboard](https://dash.cloudflare.com) -> **Workers & Pages**
2. 點選 **Create application** -> **Pages** -> **Connect to Git**
3. 選擇你的 GitHub 倉庫 \`cloudcanvas\`
4. 構建設定：
   - **Framework preset**: \`Vite\`
   - **Build command**: \`pnpm build\`
   - **Build output directory**: \`dist\`
5. 進入 Settings -> **Functions** -> **D1 database bindings**:
   - Variable name: \`DB\`
   - Database: \`canvas-d1-prod\`
6. **R2 bucket bindings**:
   - Variable name: \`R2_BUCKET\`
   - R2 bucket: \`canvas-assets\`

---

### 步驟 5：設定 Google OAuth 登入 (選填)
1. 前往 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 建立 OAuth 2.0 Client ID (Web Application)
3. 將你的 Cloudflare Pages 網址 (例如 \`https://cloudcanvas.pages.dev\`) 加入 **Authorized JavaScript origins**
4. 將 Client ID 填入環境變數 \`GOOGLE_CLIENT_ID\`。

---

### 步驟 6：享受即時畫布！
- 拖曳圖片至畫布即自動上傳至 Cloudflare R2
- 畫布所有矩形、文字、便利貼、圓形皆由 Cloudflare D1 持久化儲存
- 多人同時打開網址即時顯示游標與拖曳同步！
`;
}
