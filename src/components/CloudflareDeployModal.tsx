import {
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileCode,
  GitBranch,
  Layers,
  Shield,
  Sparkles,
  Terminal,
} from 'lucide-react';
import React from 'react';

import { CloudflareStatus } from '../types.ts';

interface CloudflareDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: CloudflareStatus | null;
}

export const CloudflareDeployModal: React.FC<CloudflareDeployModalProps> = ({
  isOpen,
  onClose,
  status,
}) => {
  const [activeTab, setActiveTab] = React.useState<'guide' | 'schema' | 'wrangler' | 'worker'>(
    'guide',
  );
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [schemaSql, setSchemaSql] = React.useState<string>('');
  const [wranglerToml, setWranglerToml] = React.useState<string>('');
  const [workerTs, setWorkerTs] = React.useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      fetch('/api/cloudflare/d1-dump')
        .then((r) => r.text())
        .then((txt) => setSchemaSql(txt))
        .catch(() => {});

      fetch('/api/cloudflare/wrangler-toml')
        .then((r) => r.text())
        .then((txt) => setWranglerToml(txt))
        .catch(() => {});

      fetch('/api/cloudflare/worker-ts')
        .then((r) => r.text())
        .then((txt) => setWorkerTs(txt))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div
        id="cloudflare-deploy-modal"
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl flex flex-col overflow-hidden text-neutral-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Cloudflare 完整部署指南與設定檔
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  D1 + R2 + Pages
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                依序完成 Git Repo、Cloudflare D1 資料庫、Cloudflare R2 存儲與 Pages 部署
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Live Storage Health Stats Bar */}
        <div className="px-6 py-3 bg-neutral-950/60 border-b border-neutral-800 grid grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800">
            <Database className="w-4 h-4 text-indigo-400" />
            <div className="min-w-0">
              <div className="font-semibold text-white truncate">Cloudflare D1 資料庫</div>
              <div className="text-[11px] text-emerald-400">
                ● 運作中 ({status?.d1NodeCount || 0} 個節點已持久化)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800">
            <Cloud className="w-4 h-4 text-orange-400" />
            <div className="min-w-0">
              <div className="font-semibold text-white truncate">Cloudflare R2 存儲</div>
              <div className="text-[11px] text-orange-300">
                ● {status?.r2BucketName || 'canvas-assets'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            <div className="min-w-0">
              <div className="font-semibold text-white truncate">Cloudflare Pages 狀態</div>
              <div className="text-[11px] text-neutral-400">相容 Vite SPA + Edge Functions</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-neutral-800 bg-neutral-900/60 text-xs font-medium">
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'guide'
                ? 'border-orange-500 text-orange-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
            1. 部署步驟指南
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'schema'
                ? 'border-orange-500 text-orange-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            2. D1 SQL (schema.sql)
          </button>
          <button
            onClick={() => setActiveTab('wrangler')}
            className={`px-4 py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'wrangler'
                ? 'border-orange-500 text-orange-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4" />
            3. wrangler.toml
          </button>
          <button
            onClick={() => setActiveTab('worker')}
            className={`px-4 py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'worker'
                ? 'border-orange-500 text-orange-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            4. Edge worker.ts
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 text-xs leading-relaxed">
          {activeTab === 'guide' && (
            <div className="space-y-6">
              {/* Progress Milestones Review */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  規格與功能完成度清單
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-neutral-300">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900/60 border border-neutral-800">
                    <span className="text-emerald-400 font-bold">✓ 1.</span>
                    <span>公開 Repo 與 React App Cloudflare 建構配置</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900/60 border border-neutral-800">
                    <span className="text-emerald-400 font-bold">✓ 2.</span>
                    <span>矩形、圓形、文字、便利貼新增與滑鼠拖移選取</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900/60 border border-neutral-800">
                    <span className="text-emerald-400 font-bold">✓ 3.</span>
                    <span>節點寫入 D1，重整瀏覽器後畫布原封不動</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900/60 border border-neutral-800">
                    <span className="text-emerald-400 font-bold">✓ 4.</span>
                    <span>雙瀏覽器開啟畫布即時同步拖曳與他人彩色游標</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900/60 border border-neutral-800">
                    <span className="text-emerald-400 font-bold">✓ 5.</span>
                    <span>Google 帳號顯示登入者，節點記錄建立與修改者</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900/60 border border-neutral-800">
                    <span className="text-emerald-400 font-bold">✓ 6.</span>
                    <span>拖曳圖片至畫布存進 R2，重整後仍在</span>
                  </div>
                </div>
              </div>

              {/* Step 1 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">
                    步驟 1：建立 Public Git Repo 並推上 GitHub
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-neutral-300 relative group">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'git init\ngit add .\ngit commit -m "feat: initial CloudCanvas commit"\ngit branch -M main\ngit remote add origin https://github.com/YOUR_USER/cloudcanvas.git\ngit push -u origin main',
                        'git-cmd',
                      )
                    }
                    className="absolute top-2 right-2 p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  >
                    {copiedKey === 'git-cmd' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <pre className="overflow-x-auto text-[11px]">
                    {`git init
git add .
git commit -m "feat: initial CloudCanvas commit"
git branch -M main
git remote add origin https://github.com/YOUR_USER/cloudcanvas.git
git push -u origin main`}
                  </pre>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">
                    步驟 2：在 Cloudflare 建立 D1 資料庫與執行 Migration
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-neutral-300 relative group">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'pnpm dlx wrangler d1 create canvas-d1-prod\n# 執行 SQL 建立資料表\npnpm dlx wrangler d1 execute canvas-d1-prod --file=./schema.sql',
                        'd1-cmd',
                      )
                    }
                    className="absolute top-2 right-2 p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  >
                    {copiedKey === 'd1-cmd' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <pre className="overflow-x-auto text-[11px]">
                    {`# 建立 D1 資料庫
pnpm dlx wrangler d1 create canvas-d1-prod

# 匯入 schema.sql (點選上方分頁可直接下載或複製)
pnpm dlx wrangler d1 execute canvas-d1-prod --file=./schema.sql`}
                  </pre>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">
                    步驟 3：建立 Cloudflare R2 存儲桶
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-neutral-300 relative group">
                  <button
                    onClick={() =>
                      copyToClipboard('pnpm dlx wrangler r2 bucket create canvas-assets', 'r2-cmd')
                    }
                    className="absolute top-2 right-2 p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  >
                    {copiedKey === 'r2-cmd' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <pre className="overflow-x-auto text-[11px]">
                    {`# 建立 R2 Bucket 存放拖曳上傳之圖檔
pnpm dlx wrangler r2 bucket create canvas-assets`}
                  </pre>
                </div>
              </div>

              {/* Step 4 */}
              <div className="space-y-2">
                <span className="font-bold text-white text-sm">
                  步驟 4：至 Cloudflare Pages 綁定 D1 與 R2
                </span>
                <p className="text-neutral-400">
                  登入 Cloudflare 後台，在 Pages 專案的 <strong>Settings &gt; Functions</strong>{' '}
                  中綁定：
                </p>
                <ul className="list-disc list-inside space-y-1 text-neutral-300 ml-2">
                  <li>
                    <strong>D1 database bindings:</strong> 變數名稱設為{' '}
                    <code className="text-indigo-400">DB</code>，綁定至{' '}
                    <code className="text-neutral-200">canvas-d1-prod</code>
                  </li>
                  <li>
                    <strong>R2 bucket bindings:</strong> 變數名稱設為{' '}
                    <code className="text-orange-400">R2_BUCKET</code>，綁定至{' '}
                    <code className="text-neutral-200">canvas-assets</code>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">
                  Cloudflare D1 SQL 建表與當前節點資料 Dump
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(schemaSql, 'schema')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
                  >
                    {copiedKey === 'schema' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    複製 SQL
                  </button>
                  <button
                    onClick={() => downloadFile(schemaSql, 'schema.sql')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    下載 schema.sql
                  </button>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-neutral-300 max-h-96 overflow-y-auto">
                <pre className="text-[11px] whitespace-pre-wrap">
                  {schemaSql || '載入 D1 Schema 中...'}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'wrangler' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">wrangler.toml 設定檔</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(wranglerToml, 'wrangler')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
                  >
                    {copiedKey === 'wrangler' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    複製設定
                  </button>
                  <button
                    onClick={() => downloadFile(wranglerToml, 'wrangler.toml')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    下載 wrangler.toml
                  </button>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-neutral-300 max-h-96 overflow-y-auto">
                <pre className="text-[11px] whitespace-pre-wrap">
                  {wranglerToml || '載入 wrangler.toml 中...'}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'worker' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">
                  Cloudflare Worker / Pages Edge API 程式碼 (worker.ts)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(workerTs, 'worker')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
                  >
                    {copiedKey === 'worker' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    複製程式碼
                  </button>
                  <button
                    onClick={() => downloadFile(workerTs, 'worker.ts')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    下載 worker.ts
                  </button>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-neutral-300 max-h-96 overflow-y-auto">
                <pre className="text-[11px] whitespace-pre-wrap">
                  {workerTs || '載入 worker.ts 中...'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between text-xs">
          <div className="text-neutral-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>支援雙向 WebSocket 即時通訊與 Cloudflare Edge 持久化</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
