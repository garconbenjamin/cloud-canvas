import type { FC, KeyboardEvent } from 'react';
import { useEffect, useState } from 'react';

import { CanvasNode } from '../../types.ts';

interface RectangleNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  onUpdateText?: (newText: string) => void;
}

export const RectangleNode: FC<RectangleNodeProps> = ({ node, onUpdateText }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.text || '');

  useEffect(() => {
    setEditText(node.text || '');
  }, [node.text]);

  const handleBlur = () => {
    setIsEditing(false);
    if (onUpdateText && editText !== node.text) {
      onUpdateText(editText);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <div
      id={`node-${node.id}`}
      className="relative w-full h-full flex flex-col items-center justify-center transition-all duration-75 select-none"
      style={{
        backgroundColor: node.fillColor || '#1e1b4b',
        borderColor: node.strokeColor || '#6366f1',
        borderWidth: `${node.strokeWidth || 0}px`,
        borderStyle: 'solid',
        borderRadius: `${node.borderRadius || 0}px`,
        opacity: node.opacity ?? 1,
        boxShadow: node.shadow
          ? '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
          : 'none',
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      {isEditing ? (
        <textarea
          autoFocus
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full p-3 bg-transparent resize-none outline-none text-center font-sans"
          style={{
            fontSize: `${node.fontSize || 16}px`,
            color: node.textColor || '#ffffff',
            fontWeight: node.fontWeight || 'normal',
            textAlign: node.textAlign || 'center',
          }}
        />
      ) : (
        <div
          className="w-full h-full p-4 flex items-center justify-center overflow-hidden break-words whitespace-pre-wrap pointer-events-none"
          style={{
            fontSize: `${node.fontSize || 16}px`,
            color: node.textColor || '#ffffff',
            fontWeight: node.fontWeight || 'normal',
            textAlign: node.textAlign || 'center',
          }}
        >
          {node.text}
        </div>
      )}
    </div>
  );
};
