import {
  ArrowUpRight,
  Circle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layers,
  Lock,
  Search,
  Square,
  StickyNote,
  Type,
  Unlock,
} from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';

import { CanvasNode, NodeType } from '../types.ts';
import { PanelToggleButton } from './common/PanelToggleButton.tsx';

interface LayersPanelProps {
  nodes: CanvasNode[];
  selectedNodeIds: string[];
  onSelectNode: (nodeId: string, isShift: boolean) => void;
  onToggleLock: (nodeId: string) => void;
  onToggleHide: (nodeId: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const LayersPanel: FC<LayersPanelProps> = ({
  nodes,
  selectedNodeIds,
  onSelectNode,
  onToggleLock,
  onToggleHide,
  isOpen,
  onToggleOpen,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const getNodeIcon = (type: NodeType) => {
    switch (type) {
      case 'rectangle':
        return <Square className="w-3.5 h-3.5 text-indigo-400" />;
      case 'circle':
        return <Circle className="w-3.5 h-3.5 text-sky-400" />;
      case 'text':
        return <Type className="w-3.5 h-3.5 text-violet-400" />;
      case 'sticky':
        return <StickyNote className="w-3.5 h-3.5 text-amber-400" />;
      case 'arrow':
        return <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-orange-400" />;
    }
  };

  const getNodeName = (node: CanvasNode) => {
    if (node.text) {
      const clean = node.text.replace(/\n/g, ' ').trim();
      return clean.length > 18 ? `${clean.slice(0, 18)}...` : clean;
    }
    switch (node.type) {
      case 'rectangle':
        return '矩形節點';
      case 'circle':
        return '圓形節點';
      case 'text':
        return '文字標籤';
      case 'sticky':
        return '便利貼';
      case 'arrow':
        return '連接箭頭';
      case 'image':
        return 'R2 圖片';
    }
  };

  // Sort nodes by zIndex reversed (topmost layer on top)
  const sortedNodes = [...nodes].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
  const filteredNodes = sortedNodes.filter((n) => {
    if (!searchTerm) return true;
    const name = getNodeName(n).toLowerCase();
    const type = n.type.toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || type.includes(term);
  });

  if (!isOpen) {
    return (
      <PanelToggleButton id="btn-open-layers" label="開啟圖層面板" onClick={onToggleOpen}>
        <Layers className="w-4 h-4" />
      </PanelToggleButton>
    );
  }

  return (
    <aside
      id="layers-panel"
      className="w-64 bg-neutral-900/90 border-r border-neutral-800 flex flex-col text-xs text-neutral-300 backdrop-blur-xl select-none z-30"
    >
      {/* Header */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-neutral-200">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>圖層列表 ({nodes.length})</span>
        </div>
        <button
          onClick={onToggleOpen}
          className="px-2 py-0.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
        >
          收合
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-neutral-800">
        <div className="flex items-center bg-neutral-950/60 rounded-lg px-2 py-1 border border-neutral-800">
          <Search className="w-3.5 h-3.5 text-neutral-500 mr-1.5" />
          <input
            type="text"
            placeholder="搜尋圖層..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none text-neutral-200 placeholder-neutral-500"
          />
        </div>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {filteredNodes.length === 0 ? (
          <div className="p-4 text-center text-neutral-500 text-[11px]">
            {nodes.length === 0 ? '畫布為空，使用工具列新增' : '無符合的圖層'}
          </div>
        ) : (
          filteredNodes.map((node) => {
            const isSelected = selectedNodeIds.includes(node.id);
            return (
              <div
                key={node.id}
                onClick={(e) => onSelectNode(node.id, e.shiftKey)}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors group ${
                  isSelected
                    ? 'bg-indigo-600/30 text-white border border-indigo-500/40'
                    : 'hover:bg-neutral-800 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  {getNodeIcon(node.type)}
                  <span className="truncate font-medium">{getNodeName(node)}</span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleHide(node.id);
                    }}
                    className="p-1 hover:text-white text-neutral-400"
                    title={node.isHidden ? '顯示' : '隱藏'}
                  >
                    {node.isHidden ? (
                      <EyeOff className="w-3 h-3 text-rose-400" />
                    ) : (
                      <Eye className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLock(node.id);
                    }}
                    className="p-1 hover:text-white text-neutral-400"
                    title={node.isLocked ? '解鎖' : '鎖定'}
                  >
                    {node.isLocked ? (
                      <Lock className="w-3 h-3 text-amber-400" />
                    ) : (
                      <Unlock className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
