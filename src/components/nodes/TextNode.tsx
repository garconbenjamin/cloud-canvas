import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';

import { CanvasNode } from '../../types.ts';

interface TextNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  onUpdateText?: (newText: string) => void;
}

export const TextNode: FC<TextNodeProps> = ({ node, onUpdateText }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditText(node.text || '');
  }, [node.text]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (onUpdateText && editText !== node.text) {
      onUpdateText(editText);
    }
  };

  const getFontFamily = () => {
    switch (node.fontFamily) {
      case 'mono':
        return '"JetBrains Mono", monospace';
      case 'handwriting':
        return '"Kalam", cursive';
      case 'sans':
      default:
        return '"Plus Jakarta Sans", sans-serif';
    }
  };

  return (
    <div
      id={`node-${node.id}`}
      className="relative w-full h-full flex items-center justify-center select-none"
      style={{
        opacity: node.opacity ?? 1,
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleBlur}
          className="w-full h-full bg-transparent resize-none outline-none border border-indigo-500 rounded p-1"
          style={{
            fontSize: `${node.fontSize || 20}px`,
            color: node.textColor || '#ffffff',
            fontWeight: node.fontWeight || 'normal',
            textAlign: node.textAlign || 'left',
            fontFamily: getFontFamily(),
          }}
        />
      ) : (
        <div
          className="w-full h-full overflow-hidden whitespace-pre-wrap break-words pointer-events-none flex items-center"
          style={{
            fontSize: `${node.fontSize || 20}px`,
            color: node.textColor || '#ffffff',
            fontWeight: node.fontWeight || 'normal',
            textAlign: node.textAlign || 'left',
            fontFamily: getFontFamily(),
          }}
        >
          {node.text || '點擊兩下輸入文字...'}
        </div>
      )}
    </div>
  );
};
