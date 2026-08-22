import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  BringToFront,
  Cloud,
  Copy,
  Database,
  SendToBack,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { FC } from 'react';

import { PRESET_COLORS } from '../lib/constants.ts';
import { CanvasNode, UserProfile } from '../types.ts';
import { PanelToggleButton } from './common/PanelToggleButton.tsx';

interface PropertyPanelProps {
  selectedNodes: CanvasNode[];
  onUpdateNode: (nodeId: string, updates: Partial<CanvasNode>) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  currentUser: UserProfile;
  isOpen: boolean;
  onToggleOpen: () => void;
  showHoverInfo: boolean;
  onToggleHoverInfo: () => void;
}

export const PropertyPanel: FC<PropertyPanelProps> = ({
  selectedNodes,
  onUpdateNode,
  onDeleteSelected,
  onDuplicateSelected,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  currentUser,
  isOpen,
  onToggleOpen,
  showHoverInfo,
  onToggleHoverInfo,
}) => {
  if (!isOpen) {
    return (
      <PanelToggleButton
        id="btn-open-property-panel"
        label="開啟屬性面板"
        side="right"
        onClick={onToggleOpen}
      >
        <Database className="w-4 h-4" />
      </PanelToggleButton>
    );
  }

  const hoverToggle = (
    <label className="flex items-center justify-between gap-2 text-[11px] text-neutral-400 cursor-pointer">
      <span>選取模式顯示 hover 資訊</span>
      <input type="checkbox" checked={showHoverInfo} onChange={onToggleHoverInfo} />
    </label>
  );

  if (selectedNodes.length === 0) {
    return (
      <aside
        id="property-panel-empty"
        className="w-72 bg-neutral-900/90 border-l border-neutral-800 p-4 flex flex-col text-neutral-400 text-xs backdrop-blur-xl select-none"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-neutral-800 text-neutral-300 font-semibold">
          <Database className="w-4 h-4 text-orange-400" />
          <span>畫布屬性 / D1 資料庫</span>
          <button
            onClick={onToggleOpen}
            className="ml-auto text-neutral-500 hover:text-white"
            title="收合屬性面板"
          >
            收合
          </button>
        </div>
        <div className="mt-3">{hoverToggle}</div>

        <div className="mt-6 flex flex-col items-center text-center p-6 rounded-xl border border-neutral-800/80 bg-neutral-950/40">
          <Sparkles className="w-8 h-8 text-neutral-600 mb-2" />
          <p className="font-medium text-neutral-300">尚未選取任何節點</p>
          <p className="text-[11px] text-neutral-500 mt-1">
            點擊畫布上的矩形、文字、便利貼或圖片以檢視並編輯屬性。
          </p>
        </div>

        {/* Shortcuts quick reference */}
        <div className="mt-auto pt-4 border-t border-neutral-800 space-y-2 text-[11px] text-neutral-500 font-mono">
          <div className="flex justify-between">
            <span>矩形 / 圓形</span>
            <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">R / O</kbd>
          </div>
          <div className="flex justify-between">
            <span>文字 / 便利貼</span>
            <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">T / S</kbd>
          </div>
          <div className="flex justify-between">
            <span>拖曳圖片上傳</span>
            <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-orange-300">R2 Drag</kbd>
          </div>
          <div className="flex justify-between">
            <span>複製 / 刪除</span>
            <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
              Ctrl+D / Del
            </kbd>
          </div>
        </div>
      </aside>
    );
  }

  const primaryNode = selectedNodes[0];
  const isMultiple = selectedNodes.length > 1;

  const handlePropertyChange = (field: keyof CanvasNode, value: any) => {
    selectedNodes.forEach((node) => {
      onUpdateNode(node.id, {
        [field]: value,
        lastEditedBy: currentUser,
        lastEditedAt: Date.now(),
      });
    });
  };

  const handleDimensionChange = (field: 'width' | 'height', value: number) => {
    selectedNodes.forEach((node) => {
      const updates: Partial<CanvasNode> =
        node.type === 'circle' ? { width: value, height: value } : { [field]: value };
      onUpdateNode(node.id, {
        ...updates,
        lastEditedBy: currentUser,
        lastEditedAt: Date.now(),
      });
    });
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '剛剛';
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <aside
      id="property-panel"
      className="w-72 bg-neutral-900/90 border-l border-neutral-800 p-4 flex flex-col gap-4 text-neutral-200 text-xs backdrop-blur-xl overflow-y-auto select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2 font-semibold">
          <span className="capitalize px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            {isMultiple ? `${selectedNodes.length} 個節點` : primaryNode.type}
          </span>
          <span className="text-neutral-400 font-mono text-[11px]">
            #{primaryNode.id.slice(0, 8)}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleOpen}
            className="px-2 py-0.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            title="收合屬性面板"
          >
            收合
          </button>
          <button
            onClick={onDuplicateSelected}
            title="複製節點 (Ctrl+D)"
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDeleteSelected}
            title="刪除節點 (Delete)"
            className="p-1.5 rounded hover:bg-neutral-800 text-rose-400 hover:text-rose-300"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {hoverToggle}

      {/* Transform Coordinates & Dimensions */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          位置與尺寸
        </span>
        <div className="grid grid-cols-2 gap-2 font-mono">
          <div className="flex items-center bg-neutral-950/60 rounded border border-neutral-800 px-2 py-1">
            <span className="text-neutral-500 mr-2">X</span>
            <input
              type="number"
              value={Math.round(primaryNode.x)}
              onChange={(e) => handlePropertyChange('x', parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent outline-none text-right text-neutral-200"
            />
          </div>
          <div className="flex items-center bg-neutral-950/60 rounded border border-neutral-800 px-2 py-1">
            <span className="text-neutral-500 mr-2">Y</span>
            <input
              type="number"
              value={Math.round(primaryNode.y)}
              onChange={(e) => handlePropertyChange('y', parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent outline-none text-right text-neutral-200"
            />
          </div>
          <div className="flex items-center bg-neutral-950/60 rounded border border-neutral-800 px-2 py-1">
            <span className="text-neutral-500 mr-2">W</span>
            <input
              type="number"
              min="10"
              value={Math.round(primaryNode.width)}
              onChange={(e) =>
                handleDimensionChange('width', Math.max(10, parseFloat(e.target.value) || 10))
              }
              className="w-full bg-transparent outline-none text-right text-neutral-200"
            />
          </div>
          <div className="flex items-center bg-neutral-950/60 rounded border border-neutral-800 px-2 py-1">
            <span className="text-neutral-500 mr-2">H</span>
            <input
              type="number"
              min="10"
              value={Math.round(primaryNode.height)}
              onChange={(e) =>
                handleDimensionChange('height', Math.max(10, parseFloat(e.target.value) || 10))
              }
              className="w-full bg-transparent outline-none text-right text-neutral-200"
            />
          </div>
        </div>

        {/* Corner Radius & Opacity */}
        <div className="grid grid-cols-2 gap-2 font-mono">
          <div className="flex items-center bg-neutral-950/60 rounded border border-neutral-800 px-2 py-1">
            <span className="text-neutral-500 mr-2 text-[10px]">圓角</span>
            <input
              type="number"
              min="0"
              max="100"
              value={primaryNode.borderRadius || 0}
              onChange={(e) =>
                handlePropertyChange('borderRadius', Math.max(0, parseInt(e.target.value) || 0))
              }
              className="w-full bg-transparent outline-none text-right text-neutral-200"
            />
          </div>
          <div className="flex items-center bg-neutral-950/60 rounded border border-neutral-800 px-2 py-1">
            <span className="text-neutral-500 mr-2 text-[10px]">不透明</span>
            <input
              type="number"
              min="0.1"
              max="1"
              step="0.1"
              value={primaryNode.opacity ?? 1}
              onChange={(e) => handlePropertyChange('opacity', parseFloat(e.target.value) || 1)}
              className="w-full bg-transparent outline-none text-right text-neutral-200"
            />
          </div>
        </div>
      </div>

      {/* Colors & Styling */}
      {primaryNode.type !== 'image' && (
        <div className="space-y-2 pt-2 border-t border-neutral-800">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            填充色彩
          </span>

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primaryNode.fillColor || '#1e1b4b'}
              onChange={(e) => handlePropertyChange('fillColor', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-neutral-700 bg-transparent p-0"
            />
            <input
              type="text"
              value={primaryNode.fillColor || '#1e1b4b'}
              onChange={(e) => handlePropertyChange('fillColor', e.target.value)}
              className="flex-1 bg-neutral-950/60 rounded border border-neutral-800 px-2 py-1 font-mono text-neutral-200"
            />
          </div>

          {/* Color Presets */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handlePropertyChange('fillColor', c)}
                className="w-5 h-5 rounded-md border border-white/10 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Border & Stroke */}
      <div className="space-y-2 pt-2 border-t border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            邊框線條
          </span>
          <span className="font-mono text-neutral-400">{primaryNode.strokeWidth || 0}px</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="color"
            value={primaryNode.strokeColor || '#6366f1'}
            onChange={(e) => handlePropertyChange('strokeColor', e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-neutral-700 bg-transparent p-0"
          />
          <input
            type="number"
            min="0"
            max="20"
            value={primaryNode.strokeWidth || 0}
            onChange={(e) => handlePropertyChange('strokeWidth', parseInt(e.target.value) || 0)}
            className="w-20 bg-neutral-950/60 rounded border border-neutral-800 px-2 py-1 font-mono text-center text-neutral-200"
          />
        </div>
      </div>

      {/* Typography for Text / Sticky / Shapes with Text */}
      {(primaryNode.type === 'text' || primaryNode.type === 'sticky' || primaryNode.text) && (
        <div className="space-y-2 pt-2 border-t border-neutral-800">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            文字排版
          </span>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-neutral-950/60 rounded border border-neutral-800 px-2 py-1">
              <span className="text-neutral-500 mr-2 text-[10px]">大小</span>
              <input
                type="number"
                min="8"
                max="120"
                value={primaryNode.fontSize || 16}
                onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value) || 16)}
                className="w-full bg-transparent outline-none text-right font-mono text-neutral-200"
              />
            </div>
            <div className="flex items-center bg-neutral-950/60 rounded border border-neutral-800 p-0.5">
              <button
                onClick={() => handlePropertyChange('textAlign', 'left')}
                className={`p-1.5 rounded ${primaryNode.textAlign === 'left' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handlePropertyChange('textAlign', 'center')}
                className={`p-1.5 rounded ${primaryNode.textAlign === 'center' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handlePropertyChange('textAlign', 'right')}
                className={`p-1.5 rounded ${primaryNode.textAlign === 'right' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloudflare R2 Storage Metadata if Image Node */}
      {primaryNode.type === 'image' && (
        <div className="space-y-2 pt-2 border-t border-neutral-800 p-3 rounded-xl bg-orange-950/20 border border-orange-800/30">
          <div className="flex items-center gap-1.5 text-orange-400 font-semibold">
            <Cloud className="w-4 h-4" />
            <span>Cloudflare R2 物件資訊</span>
          </div>
          <div className="space-y-1 font-mono text-[11px] text-neutral-300">
            <div className="flex justify-between">
              <span className="text-neutral-500">存儲桶:</span>
              <span className="text-orange-300">{primaryNode.r2Bucket || 'canvas-assets'}</span>
            </div>
            {primaryNode.fileSize && (
              <div className="flex justify-between">
                <span className="text-neutral-500">大小:</span>
                <span>{(primaryNode.fileSize / 1024).toFixed(1)} KB</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-neutral-500">持久化狀態:</span>
              <span className="text-emerald-400 font-medium">已同步至 D1 & R2</span>
            </div>
          </div>
        </div>
      )}

      {/* Layer Hierarchy Actions */}
      <div className="space-y-2 pt-2 border-t border-neutral-800">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          圖層順序
        </span>
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={onBringToFront}
            title="移至最前層"
            className="flex items-center justify-center p-2 rounded bg-neutral-950/60 border border-neutral-800 hover:bg-neutral-800 text-neutral-300"
          >
            <BringToFront className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onBringForward}
            title="往前一層"
            className="flex items-center justify-center p-2 rounded bg-neutral-950/60 border border-neutral-800 hover:bg-neutral-800 text-neutral-300"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onSendBackward}
            title="往後一層"
            className="flex items-center justify-center p-2 rounded bg-neutral-950/60 border border-neutral-800 hover:bg-neutral-800 text-neutral-300"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onSendToBack}
            title="移至最後層"
            className="flex items-center justify-center p-2 rounded bg-neutral-950/60 border border-neutral-800 hover:bg-neutral-800 text-neutral-300"
          >
            <SendToBack className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Creator & D1 Persistence Metadata Audit */}
      <div className="mt-auto pt-3 border-t border-neutral-800 text-[11px] text-neutral-400 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span>Cloudflare D1 記錄節點</span>
        </div>

        {primaryNode.createdBy && (
          <div className="flex items-center justify-between text-neutral-300">
            <span className="text-neutral-500">建立者:</span>
            <div className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: primaryNode.createdBy.color || '#6366f1' }}
              />
              <span className="truncate max-w-[130px]">{primaryNode.createdBy.name}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-neutral-300">
          <span className="text-neutral-500">建立時間:</span>
          <span>{formatDate(primaryNode.createdAt)}</span>
        </div>

        {primaryNode.lastEditedBy && (
          <div className="flex items-center justify-between text-neutral-300">
            <span className="text-neutral-500">最後修改:</span>
            <span>
              {primaryNode.lastEditedBy.name} ({formatDate(primaryNode.lastEditedAt)})
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
