import React from 'react';
import { UserPresence, UserProfile, CloudflareStatus } from '../types.ts';
import {
  Cloud,
  Database,
  Users,
  Copy,
  ExternalLink,
  Download,
  Share2,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface TopNavbarProps {
  boardTitle: string;
  onUpdateBoardTitle: (title: string) => void;
  onlineUsers: UserPresence[];
  currentUser: UserProfile;
  onOpenAuthModal: () => void;
  onOpenDeployModal: () => void;
  cloudflareStatus: CloudflareStatus | null;
  onResetBoard: () => void;
  onExportCanvas: (format: 'png' | 'svg' | 'json') => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  boardTitle,
  onUpdateBoardTitle,
  onlineUsers,
  currentUser,
  onOpenAuthModal,
  onOpenDeployModal,
  cloudflareStatus,
  onResetBoard,
  onExportCanvas,
}) => {
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleInput, setTitleInput] = React.useState(boardTitle);
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  React.useEffect(() => {
    setTitleInput(boardTitle);
  }, [boardTitle]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && titleInput !== boardTitle) {
      onUpdateBoardTitle(titleInput.trim());
    }
  };

  const handleOpenSecondWindow = () => {
    // Open current URL in a new window/tab to simulate peer collaboration
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank');
    }
  };

  const handleCopyShareLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <header
      id="top-navbar"
      className="h-14 bg-neutral-900/90 border-b border-neutral-800 px-4 flex items-center justify-between backdrop-blur-xl z-40 select-none"
    >
      {/* Left: App Logo & Board Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 font-bold text-white text-sm">
            ✦
          </div>
          <span className="font-bold text-white text-sm tracking-tight hidden sm:inline">
            CloudCanvas
          </span>
        </div>

        <div className="h-4 w-[1px] bg-neutral-800" />

        {/* Board Title */}
        {isEditingTitle ? (
          <input
            autoFocus
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
            className="px-2 py-1 rounded bg-neutral-950 border border-indigo-500 text-xs font-semibold text-white outline-none max-w-[200px]"
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="text-xs font-semibold text-neutral-300 hover:text-white px-2 py-1 rounded hover:bg-neutral-800/80 transition-colors truncate max-w-[180px]"
            title="點擊修改畫布名稱"
          >
            {boardTitle}
          </button>
        )}

        {/* Cloudflare D1 & R2 Status Indicator */}
        <div className="hidden lg:flex items-center gap-2">
          <div
            onClick={onOpenDeployModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[11px] text-indigo-300 hover:bg-indigo-500/20 cursor-pointer transition-colors"
            title="Cloudflare D1 實時資料庫已連線"
          >
            <Database className="w-3 h-3 text-indigo-400" />
            <span>D1 已同步 ({cloudflareStatus?.d1NodeCount || 0} 節點)</span>
          </div>

          <div
            onClick={onOpenDeployModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-[11px] text-orange-300 hover:bg-orange-500/20 cursor-pointer transition-colors"
            title="Cloudflare R2 圖檔物件存儲就緒"
          >
            <Cloud className="w-3 h-3 text-orange-400" />
            <span>R2 圖檔存儲就緒</span>
          </div>
        </div>
      </div>

      {/* Center / Right Controls */}
      <div className="flex items-center gap-2">
        {/* Open in Second Tab Button (Awesome for testing real-time sync!) */}
        <button
          id="btn-multi-tab-test"
          onClick={handleOpenSecondWindow}
          title="開啟新分頁，將兩個視窗並排即可測試即時多人游標與拖曳同步！"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-all hover:scale-[1.02]"
        >
          <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
          <span>開雙視窗測同步</span>
        </button>

        {/* Live Active Peers List */}
        <div className="flex items-center -space-x-1.5 px-2 py-1 rounded-xl bg-neutral-950/60 border border-neutral-800">
          {Array.from(new Map<string, UserPresence>(onlineUsers.map((u) => [u.id, u])).values())
            .slice(0, 4)
            .map((user, idx) => (
              <div
                key={user.connectionId || `${user.id}_${idx}`}
                className="relative group"
                title={`${user.name} (${user.email})`}
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-6 h-6 rounded-full object-cover border-2 shadow"
                  style={{ borderColor: user.color }}
                />
                <span
                  className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-black"
                  style={{ backgroundColor: user.color }}
                />
              </div>
            ))}
          {new Set(onlineUsers.map((u) => u.id)).size > 4 && (
            <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] text-neutral-300 font-medium">
              +{new Set(onlineUsers.map((u) => u.id)).size - 4}
            </div>
          )}
        </div>

        {/* Cloudflare Deploy Button */}
        <button
          id="btn-deploy-cloudflare"
          onClick={onOpenDeployModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-semibold shadow-lg shadow-orange-600/20 transition-all"
        >
          <Cloud className="w-3.5 h-3.5" />
          <span className="hidden md:inline">部署到 Cloudflare</span>
          <span className="md:hidden">部署</span>
        </button>

        {/* Export Canvas Dropdown */}
        <div className="relative">
          <button
            id="btn-export-menu"
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="匯出畫布"
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-44 p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl backdrop-blur-xl flex flex-col gap-1 text-xs z-50">
              <button
                onClick={() => {
                  onExportCanvas('png');
                  setShowExportMenu(false);
                }}
                className="px-2.5 py-1.5 rounded-lg text-left hover:bg-neutral-800 text-neutral-200"
              >
                🖼️ 匯出為 PNG 圖片
              </button>
              <button
                onClick={() => {
                  onExportCanvas('svg');
                  setShowExportMenu(false);
                }}
                className="px-2.5 py-1.5 rounded-lg text-left hover:bg-neutral-800 text-neutral-200"
              >
                📐 匯出為 SVG 向量
              </button>
              <button
                onClick={() => {
                  onExportCanvas('json');
                  setShowExportMenu(false);
                }}
                className="px-2.5 py-1.5 rounded-lg text-left hover:bg-neutral-800 text-neutral-200"
              >
                💾 匯出為 D1 JSON
              </button>
              <div className="h-[1px] bg-neutral-800 my-0.5" />
              <button
                onClick={() => {
                  onResetBoard();
                  setShowExportMenu(false);
                }}
                className="px-2.5 py-1.5 rounded-lg text-left hover:bg-rose-950/40 text-rose-400"
              >
                <RotateCcw className="w-3 h-3 inline mr-1" />
                重設為預設畫布
              </button>
            </div>
          )}
        </div>

        {/* Google User Avatar / Persona Button */}
        <button
          id="btn-user-profile"
          onClick={onOpenAuthModal}
          className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-neutral-950/70 border border-neutral-800 hover:bg-neutral-800 transition-all text-xs"
          title="切換 Google 帳號或協作者身份"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-6 h-6 rounded-full object-cover border"
            style={{ borderColor: currentUser.color }}
          />
          <span className="font-medium text-neutral-200 max-w-[90px] truncate hidden sm:inline">
            {currentUser.name}
          </span>
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: currentUser.color }}
          />
        </button>
      </div>
    </header>
  );
};
