import type { FC } from 'react';

import { CanvasNode } from '../../types.ts';

interface ArrowNodeProps {
  node: CanvasNode;
  isSelected: boolean;
}

export const ArrowNode: FC<ArrowNodeProps> = ({ node }) => {
  const strokeColor = node.strokeColor || '#6366f1';
  const strokeWidth = node.strokeWidth || 3;

  return (
    <div
      id={`node-${node.id}`}
      className="relative w-full h-full pointer-events-none"
      style={{ opacity: node.opacity ?? 1 }}
    >
      <svg className="w-full h-full overflow-visible pointer-events-none">
        <defs>
          <marker
            id={`arrowhead-${node.id}`}
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={strokeColor} />
          </marker>
        </defs>

        <line
          x1={10}
          y1={10}
          x2={node.width - 10}
          y2={node.height - 10}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={node.borderRadius > 0 ? '6,6' : 'none'}
          markerEnd={`url(#arrowhead-${node.id})`}
        />
      </svg>
    </div>
  );
};
