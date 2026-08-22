import {
  Check,
  FilePlus2,
  LayoutDashboard,
  RotateCcw,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useState } from 'react';

import { Board, UserPresence, UserProfile } from '../types.ts';

interface TopNavbarProps {
  boardId: string;
  boardTitle: string;
  onUpdateBoardTitle: (title: string) => void;
  canEditBoardTitle: boolean;
  boardOwnerName: string;
  boards: Board[];
  boardListError: string;
  onRefreshBoards: () => void;
  onOpenBoard: (id: string) => void;
  onCreateBoard: () => void;
  onlineUsers: UserPresence[];
  currentUser: UserProfile;
  onOpenAuthModal: () => void;
  onResetBoard: () => void;
}

export const TopNavbar: FC<TopNavbarProps> = ({
  boardId,
  boardTitle,
  onUpdateBoardTitle,
  canEditBoardTitle,
  boardOwnerName,
  boards,
  boardListError,
  onRefreshBoards,
  onOpenBoard,
  onCreateBoard,
  onlineUsers,
  currentUser,
  onOpenAuthModal,
  onResetBoard,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(boardTitle);
  const [showBoardsMenu, setShowBoardsMenu] = useState(false);
  const [didCopyShareLink, setDidCopyShareLink] = useState(false);

  useEffect(() => {
    setTitleInput(boardTitle);
  }, [boardTitle]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && titleInput !== boardTitle) {
      onUpdateBoardTitle(titleInput.trim());
    }
  };

  const handleTitleCancel = () => {
    setTitleInput(boardTitle);
    setIsEditingTitle(false);
  };

  const handleShareBoard = async () => {
    const shareUrl = `${window.location.origin}/board/${boardId}`;
    await navigator.clipboard.writeText(shareUrl);
    setDidCopyShareLink(true);
    window.setTimeout(() => setDidCopyShareLink(false), 1600);
  };

  return (
    <header
      id="top-navbar"
      className="h-14 bg-neutral-900/90 border-b border-neutral-800 px-4 flex items-center justify-between backdrop-blur-xl z-40 select-none"
    >
      {/* Left: App Logo & Board Title */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            id="btn-board-list"
            onClick={() => {
              setShowBoardsMenu((open) => !open);
              onRefreshBoards();
            }}
            className="flex items-center gap-2 rounded-2xl px-1.5 py-1 hover:bg-neutral-800/80 transition-colors"
            title="開啟畫布列表"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 font-bold text-white text-sm">
              ✦
            </div>
            <span className="font-bold text-white text-sm tracking-tight hidden sm:inline">
              CloudCanvas
            </span>
          </button>

          {showBoardsMenu && (
            <div className="absolute left-0 top-12 w-80 rounded-2xl border border-neutral-800 bg-neutral-900/95 shadow-2xl backdrop-blur-xl p-2 z-50">
              <div className="flex items-center justify-between px-2 py-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                  <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                  畫布列表
                </div>
                <button
                  onClick={onCreateBoard}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  新增畫布
                </button>
              </div>

              {boardListError && (
                <p className="px-2 pb-2 text-xs text-rose-400">{boardListError}</p>
              )}

              <div className="max-h-80 overflow-y-auto py-1">
                {boards.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-neutral-500">尚未建立畫布</p>
                ) : (
                  boards.map((board) => (
                    <button
                      key={board.id}
                      onClick={() => {
                        onOpenBoard(board.id);
                        setShowBoardsMenu(false);
                      }}
                      className={`w-full rounded-xl px-3 py-2 text-left transition-colors ${
                        board.id === boardId
                          ? 'bg-indigo-500/15 text-indigo-100'
                          : 'text-neutral-200 hover:bg-neutral-800'
                      }`}
                    >
                      <span className="block truncate text-sm font-medium">{board.title}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-neutral-500">
                        {board.id}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-neutral-800" />

        {/* Board Title */}
        {isEditingTitle ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') handleTitleCancel();
              }}
              className="px-2 py-1 rounded bg-neutral-950 border border-indigo-500 text-xs font-semibold text-white outline-none max-w-[200px]"
            />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleTitleCancel}
              className="text-xs text-neutral-400 hover:text-white px-1"
              title="取消修改"
            >
              取消
            </button>
          </div>
        ) : canEditBoardTitle ? (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="text-xs font-semibold text-neutral-300 hover:text-white px-2 py-1 rounded hover:bg-neutral-800/80 transition-colors truncate max-w-[180px]"
            title="點擊修改畫布名稱"
          >
            {boardTitle}
          </button>
        ) : (
          <span
            className="text-xs font-semibold text-neutral-300 px-2 py-1 truncate max-w-[180px]"
            title="只有畫布建立者可以修改名稱"
          >
            {boardTitle}
          </span>
        )}

        <span
          className="hidden md:inline-flex items-center gap-1 text-[11px] text-neutral-500 border-l border-neutral-800 pl-3"
          title="畫布建立者"
        >
          <ShieldCheck className="w-3 h-3 text-indigo-400" />
          Owner: <span className="text-neutral-300 max-w-[120px] truncate">{boardOwnerName}</span>
        </span>
      </div>

      {/* Center / Right Controls */}
      <div className="flex items-center gap-2">
        {/* Open in Second Tab Button (Awesome for testing real-time sync!) */}
        {/* <button
          id="btn-multi-tab-test"
          onClick={handleOpenSecondWindow}
          title="開啟新分頁，將兩個視窗並排即可測試即時多人游標與拖曳同步！"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-all hover:scale-[1.02]"
        >
          <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
          <span>開雙視窗測同步</span>
        </button> */}

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

        <button
          id="btn-share-board"
          onClick={handleShareBoard}
          title="複製分享連結"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors text-xs"
        >
          {didCopyShareLink ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{didCopyShareLink ? '已複製' : '分享'}</span>
        </button>

        <button
          id="btn-reset-board"
          onClick={onResetBoard}
          title="重設為空白畫布"
          className="p-2 rounded-xl bg-neutral-800 hover:bg-rose-950/40 text-neutral-300 hover:text-rose-300 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

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
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentUser.color }} />
        </button>
      </div>
    </header>
  );
};
