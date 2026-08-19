import React from 'react';
import { CanvasNode, Viewport } from '../types.ts';

interface MinimapProps {
  nodes: CanvasNode[];
  viewport: Viewport;
  canvasWidth: number;
  canvasHeight: number;
  onNavigate: (x: number, y: number) => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  nodes,
  viewport,
  canvasWidth,
  canvasHeight,
  onNavigate,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const mapWidth = 180;
  const mapHeight = 110;

  // Calculate bounding box of all elements
  const bounds = React.useMemo(() => {
    if (nodes.length === 0) {
      return { minX: -500, minY: -500, maxX: 1500, maxY: 1200 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((n) => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const padding = 400;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  }, [nodes]);

  const worldWidth = bounds.maxX - bounds.minX;
  const worldHeight = bounds.maxY - bounds.minY;
  const scale = Math.min(mapWidth / worldWidth, mapHeight / worldHeight);

  // Viewport box in minimap coordinates
  const viewX = (-viewport.x / viewport.zoom - bounds.minX) * scale;
  const viewY = (-viewport.y / viewport.zoom - bounds.minY) * scale;
  const viewW = (canvasWidth / viewport.zoom) * scale;
  const viewH = (canvasHeight / viewport.zoom) * scale;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const targetWorldX = bounds.minX + clickX / scale;
    const targetWorldY = bounds.minY + clickY / scale;

    const newViewportX = -targetWorldX * viewport.zoom + canvasWidth / 2;
    const newViewportY = -targetWorldY * viewport.zoom + canvasHeight / 2;

    onNavigate(newViewportX, newViewportY);
  };

  if (!isExpanded) {
    return (
      <button
        id="btn-expand-minimap"
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 z-30 px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-neutral-400 hover:text-white shadow-xl backdrop-blur-xl text-xs"
      >
        🗺️ 小地圖
      </button>
    );
  }

  return (
    <div
      id="minimap-container"
      className="fixed bottom-6 right-6 z-30 p-2 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-2xl backdrop-blur-xl flex flex-col gap-1 select-none"
    >
      <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono px-1">
        <span>MINIMAP</span>
        <button
          onClick={() => setIsExpanded(false)}
          className="hover:text-white"
        >
          ✕
        </button>
      </div>

      <div
        className="relative bg-neutral-950/80 rounded-lg overflow-hidden border border-neutral-800 cursor-pointer"
        style={{ width: mapWidth, height: mapHeight }}
        onClick={handleClick}
      >
        {/* Render node dots / rects */}
        {nodes.map((node) => {
          if (node.isHidden) return null;
          const nodeX = (node.x - bounds.minX) * scale;
          const nodeY = (node.y - bounds.minY) * scale;
          const nodeW = Math.max(2, node.width * scale);
          const nodeH = Math.max(2, node.height * scale);

          return (
            <div
              key={node.id}
              className="absolute rounded-sm"
              style={{
                left: nodeX,
                top: nodeY,
                width: nodeW,
                height: nodeH,
                backgroundColor: node.fillColor || '#6366f1',
                opacity: 0.8,
              }}
            />
          );
        })}

        {/* Viewport indicator rectangle */}
        <div
          className="absolute border-2 border-indigo-400 bg-indigo-500/15 rounded pointer-events-none transition-all duration-75"
          style={{
            left: Math.max(0, viewX),
            top: Math.max(0, viewY),
            width: Math.min(mapWidth, viewW),
            height: Math.min(mapHeight, viewH),
          }}
        />
      </div>
    </div>
  );
};
