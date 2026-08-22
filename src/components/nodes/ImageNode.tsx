import { Cloud, Image as ImageIcon, Loader2 } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';

import { CanvasNode } from '../../types.ts';

interface ImageNodeProps {
  node: CanvasNode;
  isSelected: boolean;
}

export const ImageNode: FC<ImageNodeProps> = ({ node, isSelected }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div
      id={`node-${node.id}`}
      className="relative w-full h-full flex items-center justify-center rounded-lg overflow-hidden select-none group"
      style={{
        borderColor: node.strokeColor || (isSelected ? '#6366f1' : '#3f3f46'),
        borderWidth: `${node.strokeWidth || 0}px`,
        borderStyle: 'solid',
        borderRadius: `${node.borderRadius || 8}px`,
        opacity: node.opacity ?? 1,
        boxShadow: node.shadow ? '0 12px 28px -4px rgba(0, 0, 0, 0.5)' : 'none',
        backgroundColor: '#18181b',
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 text-neutral-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="text-xs">圖片載入中...</span>
        </div>
      )}

      {hasError ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-neutral-900/90 text-neutral-400 gap-2 text-center">
          <ImageIcon className="w-8 h-8 text-rose-400" />
          <span className="text-xs font-medium text-rose-300">圖片載入失敗</span>
          <span className="text-[10px] text-neutral-500 truncate max-w-[180px]">
            {node.imageUrl}
          </span>
        </div>
      ) : (
        <img
          src={node.imageUrl}
          alt={node.text || 'Canvas Image'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover pointer-events-none"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}

      {/* Cloudflare R2 / Storage Badge */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 pointer-events-none">
        <Cloud className="w-3 h-3 text-orange-400" />
        <span>雲端圖片</span>
      </div>

      {node.text && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white text-xs truncate">
          {node.text}
        </div>
      )}
    </div>
  );
};
