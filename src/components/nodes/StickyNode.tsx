import React from 'react';

import { CanvasNode } from '../../types.ts';

interface StickyNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  onUpdateText?: (newText: string) => void;
}

export const StickyNode: React.FC<StickyNodeProps> = ({ node, isSelected, onUpdateText }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(node.text || '');

  React.useEffect(() => {
    setEditText(node.text || '');
  }, [node.text]);

  const handleBlur = () => {
    setIsEditing(false);
    if (onUpdateText && editText !== node.text) {
      onUpdateText(editText);
    }
  };

  return (
    <div
      id={`node-${node.id}`}
      className="relative w-full h-full flex flex-col p-4 select-none rounded-sm transition-all overflow-hidden"
      style={{
        backgroundColor: node.fillColor || '#fef08a',
        borderColor: node.strokeColor || '#facc15',
        borderWidth: `${node.strokeWidth || 1}px`,
        boxShadow: '0 8px 20px -3px rgba(0, 0, 0, 0.35), 0 4px 6px -4px rgba(0, 0, 0, 0.2)',
        fontFamily: '"Kalam", cursive',
        opacity: node.opacity ?? 1,
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      {/* Subtle top sticky tape highlight */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-black/5" />

      {isEditing ? (
        <textarea
          autoFocus
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleBlur}
          className="w-full flex-1 bg-transparent resize-none outline-none leading-relaxed"
          style={{
            fontSize: `${node.fontSize || 16}px`,
            color: node.textColor || '#854d0e',
            fontWeight: node.fontWeight || 'normal',
            textAlign: node.textAlign || 'left',
          }}
        />
      ) : (
        <div
          className="w-full flex-1 overflow-hidden whitespace-pre-wrap break-words pointer-events-none leading-relaxed"
          style={{
            fontSize: `${node.fontSize || 16}px`,
            color: node.textColor || '#854d0e',
            fontWeight: node.fontWeight || 'normal',
            textAlign: node.textAlign || 'left',
          }}
        >
          {node.text || '寫下你的想法...'}
        </div>
      )}

      {/* Author badge footer */}
      {node.createdBy && (
        <div className="mt-2 flex items-center justify-between text-[11px] font-sans font-medium text-black/50 border-t border-black/10 pt-1">
          <span className="truncate max-w-[120px]">{node.createdBy.name}</span>
          <span className="opacity-70">Sticky</span>
        </div>
      )}
    </div>
  );
};
