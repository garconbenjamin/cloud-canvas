import type { FC } from 'react';
import { useEffect, useState } from 'react';

import { CanvasNode } from '../../types.ts';

interface CircleNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  onUpdateText?: (newText: string) => void;
}

export const CircleNode: FC<CircleNodeProps> = ({ node, onUpdateText }) => {
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

  return (
    <div
      id={`node-${node.id}`}
      className="relative w-full h-full flex flex-col items-center justify-center rounded-full transition-all select-none overflow-hidden"
      style={{
        backgroundColor: node.fillColor || '#0f172a',
        borderColor: node.strokeColor || '#38bdf8',
        borderWidth: `${node.strokeWidth || 0}px`,
        borderStyle: 'solid',
        opacity: node.opacity ?? 1,
        boxShadow: node.shadow ? '0 10px 25px -5px rgba(0, 0, 0, 0.4)' : 'none',
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
          className="w-3/4 h-3/4 bg-transparent resize-none outline-none text-center font-sans flex items-center justify-center"
          style={{
            fontSize: `${node.fontSize || 15}px`,
            color: node.textColor || '#38bdf8',
            fontWeight: node.fontWeight || 'bold',
            textAlign: node.textAlign || 'center',
          }}
        />
      ) : (
        <div
          className="w-full h-full p-4 flex items-center justify-center overflow-hidden break-words whitespace-pre-wrap pointer-events-none"
          style={{
            fontSize: `${node.fontSize || 15}px`,
            color: node.textColor || '#38bdf8',
            fontWeight: node.fontWeight || 'bold',
            textAlign: node.textAlign || 'center',
          }}
        >
          {node.text}
        </div>
      )}
    </div>
  );
};
