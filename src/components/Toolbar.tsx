import React from 'react';
import { ToolMode } from '../types.ts';
import {
  MousePointer,
  Hand,
  Square,
  Circle,
  Type,
  StickyNote,
  ArrowUpRight,
  Image as ImageIcon,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Smile,
  Sparkles,
} from 'lucide-react';

interface ToolbarProps {
  currentTool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onZoomToFit: () => void;
  onTriggerImageUpload: () => void;
  onSendReaction: (emoji: string) => void;
  onAddPresetTemplate: (presetKey: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onSelectTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onZoomToFit,
  onTriggerImageUpload,
  onSendReaction,
  onAddPresetTemplate,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = React.useState(false);

  const tools: Array<{
    id: ToolMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    shortcut: string;
  }> = [
    { id: 'select', label: '選取 (V)', icon: MousePointer, shortcut: 'V' },
    { id: 'hand', label: '平移 (H)', icon: Hand, shortcut: 'H' },
    { id: 'rectangle', label: '矩形 (R)', icon: Square, shortcut: 'R' },
    { id: 'circle', label: '圓形 (O)', icon: Circle, shortcut: 'O' },
    { id: 'text', label: '文字 (T)', icon: Type, shortcut: 'T' },
    { id: 'sticky', label: '便利貼 (S)', icon: StickyNote, shortcut: 'S' },
    { id: 'arrow', label: '箭頭 (A)', icon: ArrowUpRight, shortcut: 'A' },
  ];

  const emojis = ['🔥', '❤️', '👍', '🚀', '💡', '🎉', '👏', '👀'];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
      {/* Main Tools Container */}
      <div
        id="toolbar-main"
        className="flex items-center gap-1 p-1.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-2xl backdrop-blur-xl text-neutral-300"
      >
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = currentTool === t.id;
          return (
            <button
              key={t.id}
              id={`tool-btn-${t.id}`}
              onClick={() => onSelectTool(t.id)}
              title={t.label}
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}

        {/* Cloudflare R2 Image Upload Tool Button */}
        <button
          id="tool-btn-upload-image"
          onClick={onTriggerImageUpload}
          title="上傳圖片至 Cloudflare R2 (I)"
          className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-neutral-800 hover:text-white transition-all text-neutral-300 relative group"
        >
          <ImageIcon className="w-4 h-4 text-orange-400" />
          <span className="absolute -top-8 px-2 py-0.5 rounded bg-black/80 text-[10px] text-orange-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            上傳圖片 (R2)
          </span>
        </button>

        {/* Divider */}
        <div className="w-[1px] h-6 bg-neutral-800 mx-1" />

        {/* Templates Dropdown Button */}
        <div className="relative">
          <button
            id="btn-templates-menu"
            onClick={() => setShowTemplateMenu(!showTemplateMenu)}
            title="常用快速範本"
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-neutral-800 hover:text-amber-300 text-neutral-300 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
          </button>

          {showTemplateMenu && (
            <div className="absolute bottom-12 left-0 w-48 p-2 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl backdrop-blur-xl flex flex-col gap-1 text-xs">
              <span className="px-2 py-1 text-[11px] font-semibold text-neutral-400">快速插入範本</span>
              <button
                onClick={() => {
                  onAddPresetTemplate('wireframe_card');
                  setShowTemplateMenu(false);
                }}
                className="px-2 py-1.5 rounded-lg text-left hover:bg-neutral-800 text-neutral-200"
              >
                📱 UI 介面卡片
              </button>
              <button
                onClick={() => {
                  onAddPresetTemplate('brainstorm_pack');
                  setShowTemplateMenu(false);
                }}
                className="px-2 py-1.5 rounded-lg text-left hover:bg-neutral-800 text-neutral-200"
              >
                💡 頭腦風暴便利貼組
              </button>
              <button
                onClick={() => {
                  onAddPresetTemplate('flowchart_box');
                  setShowTemplateMenu(false);
                }}
                className="px-2 py-1.5 rounded-lg text-left hover:bg-neutral-800 text-neutral-200"
              >
                🔄 流程圖節點與箭頭
              </button>
              <button
                onClick={() => {
                  onAddPresetTemplate('d1_architecture');
                  setShowTemplateMenu(false);
                }}
                className="px-2 py-1.5 rounded-lg text-left hover:bg-neutral-800 text-neutral-200"
              >
                ⚡ Cloudflare D1/R2 架構圖
              </button>
            </div>
          )}
        </div>

        {/* Real-time Emoji Reactions Bar */}
        <div className="relative">
          <button
            id="btn-reaction-picker"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="傳送即時互動表情 (E)"
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-neutral-800 hover:text-white text-neutral-300 transition-all"
          >
            <Smile className="w-4 h-4 text-emerald-400" />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 p-2 rounded-2xl bg-neutral-900/95 border border-neutral-800 shadow-2xl backdrop-blur-xl flex items-center gap-1.5">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSendReaction(emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800 text-lg hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-[1px] h-6 bg-neutral-800 mx-1" />

        {/* Undo / Redo */}
        <button
          id="btn-undo"
          onClick={onUndo}
          disabled={!canUndo}
          title="復原 (Ctrl+Z)"
          className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
            canUndo ? 'hover:bg-neutral-800 text-neutral-200' : 'text-neutral-600 cursor-not-allowed'
          }`}
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          id="btn-redo"
          onClick={onRedo}
          disabled={!canRedo}
          title="重做 (Ctrl+Y)"
          className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
            canRedo ? 'hover:bg-neutral-800 text-neutral-200' : 'text-neutral-600 cursor-not-allowed'
          }`}
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom Widget */}
      <div
        id="zoom-controls"
        className="flex items-center gap-1 p-1.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-2xl backdrop-blur-xl text-neutral-300 text-xs font-mono"
      >
        <button
          id="btn-zoom-out"
          onClick={onZoomOut}
          title="縮小"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          id="btn-reset-zoom"
          onClick={onResetZoom}
          title="重設為 100%"
          className="px-2 py-1 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all font-semibold min-w-[50px] text-center"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          id="btn-zoom-in"
          onClick={onZoomIn}
          title="放大"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          id="btn-zoom-fit"
          onClick={onZoomToFit}
          title="適應所有元素 (Shift + 1)"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all ml-0.5"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
