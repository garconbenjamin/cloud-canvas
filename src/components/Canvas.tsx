import React from 'react';
import {
  CanvasNode,
  NodeType,
  ToolMode,
  Viewport,
  UserPresence,
  UserProfile,
} from '../types.ts';
import { RectangleNode } from './nodes/RectangleNode.tsx';
import { CircleNode } from './nodes/CircleNode.tsx';
import { TextNode } from './nodes/TextNode.tsx';
import { StickyNode } from './nodes/StickyNode.tsx';
import { ImageNode } from './nodes/ImageNode.tsx';
import { ArrowNode } from './nodes/ArrowNode.tsx';
import { LiveCursors } from './LiveCursors.tsx';
import { LiveReactions, FloatingReaction } from './LiveReactions.tsx';
import { STICKY_COLORS } from '../lib/constants.ts';

interface CanvasProps {
  nodes: CanvasNode[];
  selectedNodeIds: string[];
  onSelectNodes: (ids: string[]) => void;
  onUpdateNode: (nodeId: string, updates: Partial<CanvasNode>) => void;
  onBatchUpdateNodes: (nodes: CanvasNode[]) => void;
  onLocalTransformNodes?: (nodes: CanvasNode[]) => void;
  onCommitTransformNodes?: (nodes: CanvasNode[]) => void;
  onCreateNode: (node: CanvasNode) => void;
  onDeleteNodes: (nodeIds: string[]) => void;
  currentTool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
  currentUser: UserProfile;
  presences: UserPresence[];
  reactions: FloatingReaction[];
  onSendCursor: (cursor: { x: number; y: number } | null, selectedIds: string[], isDragging?: boolean) => void;
  onSendReaction: (emoji: string, x: number, y: number) => void;
  onUploadImageFile: (file: File, x: number, y: number) => void;
}

type ResizeHandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const Canvas: React.FC<CanvasProps> = ({
  nodes,
  selectedNodeIds,
  onSelectNodes,
  onUpdateNode,
  onBatchUpdateNodes,
  onLocalTransformNodes,
  onCommitTransformNodes,
  onCreateNode,
  onDeleteNodes,
  currentTool,
  onToolChange,
  viewport,
  onViewportChange,
  currentUser,
  presences,
  reactions,
  onSendCursor,
  onSendReaction,
  onUploadImageFile,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Interaction States
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = React.useState(false);

  // Dragging nodes state
  const [isDraggingNodes, setIsDraggingNodes] = React.useState(false);
  const [dragStartPos, setDragStartPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialNodePositions, setInitialNodePositions] = React.useState<Map<string, { x: number; y: number }>>(new Map());

  // Marquee selection state
  const [marquee, setMarquee] = React.useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Resizing node state
  const [activeResizeHandle, setActiveResizeHandle] = React.useState<ResizeHandleType | null>(null);
  const [resizeInitial, setResizeInitial] = React.useState<{
    startX: number;
    startY: number;
    nodeId: string;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    nodeType: NodeType;
  } | null>(null);

  const [rotationInitial, setRotationInitial] = React.useState<{
    nodeId: string;
    centerX: number;
    centerY: number;
    startAngle: number;
    initialRotation: number;
  } | null>(null);
  const [isNearRotationCorner, setIsNearRotationCorner] = React.useState(false);

  // Drag over state for file drop visual feedback
  const [isDragOverFile, setIsDragOverFile] = React.useState(false);

  // Convert Screen coordinates to Canvas World coordinates
  const screenToWorld = React.useCallback(
    (screenX: number, screenY: number) => {
      const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      const relX = screenX - containerRect.left;
      const relY = screenY - containerRect.top;
      return {
        x: (relX - viewport.x) / viewport.zoom,
        y: (relY - viewport.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  const getRotationNodeAtPoint = React.useCallback((screenX: number, screenY: number) => {
    if (selectedNodeIds.length !== 1) return null;
    const node = nodes.find((item) => item.id === selectedNodeIds[0]);
    if (!node || node.isLocked || node.isHidden) return null;

    const centerX = (node.x + node.width / 2) * viewport.zoom + viewport.x;
    const centerY = (node.y + node.height / 2) * viewport.zoom + viewport.y;
    const radians = (node.rotation || 0) * (Math.PI / 180);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    for (const [horizontal, vertical] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const localX = horizontal * node.width * viewport.zoom / 2;
      const localY = vertical * node.height * viewport.zoom / 2;
      const cornerX = centerX + localX * cos - localY * sin;
      const cornerY = centerY + localX * sin + localY * cos;
      if (Math.hypot(screenX - cornerX, screenY - cornerY) <= 22) return node;
    }
    return null;
  }, [nodes, selectedNodeIds, viewport]);

  // Listen to global keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Global Window Mouse Move and Mouse Up Listeners for Rock-Solid Dragging and Resizing
  React.useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      const world = screenToWorld(e.clientX, e.clientY);

      // Broadcast cursor position to peers
      onSendCursor(world, selectedNodeIds, isDraggingNodes);

      if (!isPanning && !marquee && !activeResizeHandle && !rotationInitial && !isDraggingNodes) {
        setIsNearRotationCorner(Boolean(getRotationNodeAtPoint(e.clientX, e.clientY)));
      }

      // 1. Handling Viewport Panning
      if (isPanning) {
        onViewportChange({
          ...viewport,
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
        return;
      }

      // 2. Handling Marquee selection
      if (marquee) {
        setMarquee((prev) => (prev ? { ...prev, currentX: world.x, currentY: world.y } : null));

        const mLeft = Math.min(marquee.startX, world.x);
        const mTop = Math.min(marquee.startY, world.y);
        const mRight = Math.max(marquee.startX, world.x);
        const mBottom = Math.max(marquee.startY, world.y);

        const intersectingIds = nodes
          .filter((n) => {
            if (n.isHidden || n.isLocked) return false;
            return !(n.x > mRight || n.x + n.width < mLeft || n.y > mBottom || n.y + n.height < mTop);
          })
          .map((n) => n.id);

        onSelectNodes(intersectingIds);
        return;
      }

      // 3. Handling Node Resizing (All 8 Handles)
      if (activeResizeHandle && resizeInitial) {
        const dx = world.x - resizeInitial.startX;
        const dy = world.y - resizeInitial.startY;

        let newX = resizeInitial.initialX;
        let newY = resizeInitial.initialY;
        let newWidth = resizeInitial.initialWidth;
        let newHeight = resizeInitial.initialHeight;

        // East / West
        if (activeResizeHandle.includes('e')) {
          newWidth = Math.max(20, resizeInitial.initialWidth + dx);
        } else if (activeResizeHandle.includes('w')) {
          const potentialW = resizeInitial.initialWidth - dx;
          if (potentialW >= 20) {
            newWidth = potentialW;
            newX = resizeInitial.initialX + dx;
          }
        }

        // South / North
        if (activeResizeHandle.includes('s')) {
          newHeight = Math.max(20, resizeInitial.initialHeight + dy);
        } else if (activeResizeHandle.includes('n')) {
          const potentialH = resizeInitial.initialHeight - dy;
          if (potentialH >= 20) {
            newHeight = potentialH;
            newY = resizeInitial.initialY + dy;
          }
        }

        // Circles always retain a 1:1 aspect ratio, including side-handle resizing.
        if (resizeInitial.nodeType === 'circle') {
          const initialSize = Math.max(resizeInitial.initialWidth, resizeInitial.initialHeight);
          const horizontalDelta = activeResizeHandle.includes('e') ? dx : activeResizeHandle.includes('w') ? -dx : 0;
          const verticalDelta = activeResizeHandle.includes('s') ? dy : activeResizeHandle.includes('n') ? -dy : 0;
          const sizeDelta = activeResizeHandle.length === 2
            ? Math.max(horizontalDelta, verticalDelta)
            : horizontalDelta || verticalDelta;
          const newSize = Math.max(20, initialSize + sizeDelta);

          newWidth = newSize;
          newHeight = newSize;
          if (activeResizeHandle.includes('w')) newX = resizeInitial.initialX + initialSize - newSize;
          if (activeResizeHandle.includes('n')) newY = resizeInitial.initialY + initialSize - newSize;
        }

        const updated = nodes.map((n) =>
          n.id === resizeInitial.nodeId
            ? { ...n, x: newX, y: newY, width: newWidth, height: newHeight }
            : n
        );

        if (onLocalTransformNodes) {
          onLocalTransformNodes(updated.filter((n) => n.id === resizeInitial.nodeId));
        } else {
          onUpdateNode(resizeInitial.nodeId, { x: newX, y: newY, width: newWidth, height: newHeight });
        }
        return;
      }

      // 4. Handling Node Rotation
      if (rotationInitial) {
        const angle = Math.atan2(world.y - rotationInitial.centerY, world.x - rotationInitial.centerX) * (180 / Math.PI);
        const rotation = rotationInitial.initialRotation + angle - rotationInitial.startAngle;
        const updatedNode = nodes.find((node) => node.id === rotationInitial.nodeId);
        if (!updatedNode) return;

        const nextNode = { ...updatedNode, rotation };
        if (onLocalTransformNodes) {
          onLocalTransformNodes([nextNode]);
        } else {
          onUpdateNode(rotationInitial.nodeId, { rotation });
        }
        return;
      }

      // 5. Handling Node Dragging (Multi-node support)
      if (isDraggingNodes) {
        const dx = world.x - dragStartPos.x;
        const dy = world.y - dragStartPos.y;

        const updatedSubset = nodes
          .filter((n) => selectedNodeIds.includes(n.id) && !n.isLocked)
          .map((n) => {
            const init = initialNodePositions.get(n.id);
            if (!init) return n;
            return {
              ...n,
              x: init.x + dx,
              y: init.y + dy,
            };
          });

        if (updatedSubset.length > 0) {
          if (onLocalTransformNodes) {
            onLocalTransformNodes(updatedSubset);
          } else {
            onBatchUpdateNodes(updatedSubset);
          }
        }
      }
    };

    const handleWindowMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
      }
      if (marquee) {
        setMarquee(null);
      }
      if (activeResizeHandle && resizeInitial) {
        const resizedNode = nodes.find((n) => n.id === resizeInitial.nodeId);
        if (resizedNode && onCommitTransformNodes) {
          onCommitTransformNodes([resizedNode]);
        }
        setActiveResizeHandle(null);
        setResizeInitial(null);
      }
      if (rotationInitial) {
        const rotatedNode = nodes.find((node) => node.id === rotationInitial.nodeId);
        if (rotatedNode && onCommitTransformNodes) {
          onCommitTransformNodes([rotatedNode]);
        }
        setRotationInitial(null);
      }
      if (isDraggingNodes) {
        setIsDraggingNodes(false);
        const draggedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
        if (draggedNodes.length > 0 && onCommitTransformNodes) {
          onCommitTransformNodes(draggedNodes);
        }
        onSendCursor(null, selectedNodeIds, false);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [
    isPanning,
    panStart,
    viewport,
    marquee,
    activeResizeHandle,
    resizeInitial,
    rotationInitial,
    isDraggingNodes,
    dragStartPos,
    initialNodePositions,
    nodes,
    selectedNodeIds,
    screenToWorld,
    onSendCursor,
    onSelectNodes,
    onLocalTransformNodes,
    onCommitTransformNodes,
    onUpdateNode,
    onBatchUpdateNodes,
    onViewportChange,
    getRotationNodeAtPoint,
  ]);

  // Wheel zoom / trackpad pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    if (e.ctrlKey || e.metaKey) {
      // Zooming centered around cursor
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.1), 5);

      // Adjust viewport.x and y so mouse position stays stationary in canvas space
      const newX = mouseX - (mouseX - viewport.x) * (newZoom / viewport.zoom);
      const newY = mouseY - (mouseY - viewport.y) * (newZoom / viewport.zoom);

      onViewportChange({ x: newX, y: newY, zoom: newZoom });
    } else {
      // Panning
      onViewportChange({
        ...viewport,
        x: viewport.x - e.deltaX,
        y: viewport.y - e.deltaY,
      });
    }
  };

  // Mouse Down on Canvas Background
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click or space+click starts viewport pan
    if (e.button === 1 || isSpacePressed || currentTool === 'hand') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      return;
    }

    if (e.button !== 0) return; // Only left click

    const rotationNode = getRotationNodeAtPoint(e.clientX, e.clientY);
    if (rotationNode) {
      handleRotationStart(e, rotationNode);
      return;
    }

    const world = screenToWorld(e.clientX, e.clientY);

    // If a shape tool is active, create node immediately!
    if (currentTool !== 'select' && currentTool !== 'hand') {
      handleCreateShapeAtWorld(currentTool, world.x, world.y);
      onToolChange('select');
      return;
    }

    // If clicking on empty canvas in Select mode, start Marquee selection
    if (!e.shiftKey) {
      onSelectNodes([]);
    }
    setMarquee({
      startX: world.x,
      startY: world.y,
      currentX: world.x,
      currentY: world.y,
    });
  };

  // Node Click / Start Drag
  const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    if (node.isLocked) return;
    if (isSpacePressed || currentTool === 'hand') return;

    e.stopPropagation();

    // Select logic
    let newSelectedIds = [...selectedNodeIds];
    if (e.shiftKey) {
      if (newSelectedIds.includes(node.id)) {
        newSelectedIds = newSelectedIds.filter((id) => id !== node.id);
      } else {
        newSelectedIds.push(node.id);
      }
    } else {
      if (!newSelectedIds.includes(node.id)) {
        newSelectedIds = [node.id];
      }
    }

    onSelectNodes(newSelectedIds);

    // Initialize dragging
    const world = screenToWorld(e.clientX, e.clientY);
    setIsDraggingNodes(true);
    setDragStartPos({ x: world.x, y: world.y });

    const posMap = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => {
      if (newSelectedIds.includes(n.id)) {
        posMap.set(n.id, { x: n.x, y: n.y });
      }
    });
    setInitialNodePositions(posMap);
  };

  // Start Resize Handle Drag
  const handleResizeStart = (e: React.MouseEvent, handle: ResizeHandleType, node: CanvasNode) => {
    e.stopPropagation();
    const world = screenToWorld(e.clientX, e.clientY);
    setActiveResizeHandle(handle);
    setResizeInitial({
      startX: world.x,
      startY: world.y,
      nodeId: node.id,
      initialX: node.x,
      initialY: node.y,
      initialWidth: node.width,
      initialHeight: node.height,
      nodeType: node.type,
    });
  };

  const handleRotationStart = (e: React.MouseEvent, node: CanvasNode) => {
    e.stopPropagation();
    const world = screenToWorld(e.clientX, e.clientY);
    const centerX = node.x + node.width / 2;
    const centerY = node.y + node.height / 2;
    setRotationInitial({
      nodeId: node.id,
      centerX,
      centerY,
      startAngle: Math.atan2(world.y - centerY, world.x - centerX) * (180 / Math.PI),
      initialRotation: node.rotation || 0,
    });
  };

  // Helper to create shape at world coordinate
  const handleCreateShapeAtWorld = (type: ToolMode, worldX: number, worldY: number) => {
    const timestamp = Date.now();
    const id = `node_${type}_${timestamp}_${Math.random().toString(36).slice(2, 6)}`;

    let newNode: CanvasNode;

    switch (type) {
      case 'rectangle':
        newNode = {
          id,
          type: 'rectangle',
          x: Math.round(worldX - 100),
          y: Math.round(worldY - 60),
          width: 200,
          height: 120,
          rotation: 0,
          zIndex: nodes.length + 1,
          fillColor: '#1e1b4b',
          strokeColor: '#6366f1',
          strokeWidth: 2,
          opacity: 1,
          borderRadius: 12,
          shadow: true,
          text: '',
          fontSize: 16,
          textColor: '#ffffff',
          createdBy: currentUser,
          createdAt: timestamp,
        };
        break;

      case 'circle':
        newNode = {
          id,
          type: 'circle',
          x: Math.round(worldX - 70),
          y: Math.round(worldY - 70),
          width: 140,
          height: 140,
          rotation: 0,
          zIndex: nodes.length + 1,
          fillColor: '#0f172a',
          strokeColor: '#38bdf8',
          strokeWidth: 2,
          opacity: 1,
          borderRadius: 999,
          shadow: true,
          text: '',
          fontSize: 15,
          textColor: '#38bdf8',
          createdBy: currentUser,
          createdAt: timestamp,
        };
        break;

      case 'text':
        newNode = {
          id,
          type: 'text',
          x: Math.round(worldX - 80),
          y: Math.round(worldY - 20),
          width: 200,
          height: 50,
          rotation: 0,
          zIndex: nodes.length + 1,
          fillColor: 'transparent',
          strokeColor: 'transparent',
          strokeWidth: 0,
          opacity: 1,
          borderRadius: 0,
          shadow: false,
          text: '輸入文字內容',
          fontSize: 20,
          textColor: '#ffffff',
          textAlign: 'left',
          createdBy: currentUser,
          createdAt: timestamp,
        };
        break;

      case 'sticky':
        const randomSticky = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
        newNode = {
          id,
          type: 'sticky',
          x: Math.round(worldX - 90),
          y: Math.round(worldY - 90),
          width: 180,
          height: 180,
          rotation: Math.floor(Math.random() * 6) - 3,
          zIndex: nodes.length + 1,
          fillColor: randomSticky.fill,
          strokeColor: randomSticky.stroke,
          strokeWidth: 1,
          opacity: 1,
          borderRadius: 4,
          shadow: true,
          text: '便利貼想法...',
          fontSize: 16,
          fontFamily: 'handwriting',
          textColor: randomSticky.text,
          createdBy: currentUser,
          createdAt: timestamp,
        };
        break;

      case 'arrow':
        newNode = {
          id,
          type: 'arrow',
          x: Math.round(worldX - 100),
          y: Math.round(worldY - 40),
          width: 200,
          height: 80,
          rotation: 0,
          zIndex: nodes.length + 1,
          fillColor: 'transparent',
          strokeColor: '#6366f1',
          strokeWidth: 3,
          opacity: 1,
          borderRadius: 0,
          shadow: false,
          createdBy: currentUser,
          createdAt: timestamp,
        };
        break;

      default:
        return;
    }

    onCreateNode(newNode);
    onSelectNodes([newNode.id]);
  };

  // Drag & Drop Image Files handler (R2 storage)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragOverFile) setIsDragOverFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverFile(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const world = screenToWorld(e.clientX, e.clientY);
        onUploadImageFile(file, world.x, world.y);
      }
    }
  };

  // Paste image from clipboard
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              const containerRect = containerRef.current?.getBoundingClientRect() || { width: 800, height: 600 };
              const centerWorld = screenToWorld(containerRect.width / 2, containerRect.height / 2);
              onUploadImageFile(file, centerWorld.x, centerWorld.y);
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [screenToWorld, onUploadImageFile]);

  // Render individual node content
  const renderNode = (node: CanvasNode) => {
    const isSelected = selectedNodeIds.includes(node.id);

    // Check if other peers are selecting/dragging this node
    const peerSelecting = presences.find(
      (p) => p.id !== currentUser.id && p.selectedNodeIds.includes(node.id)
    );

    return (
      <div
        key={node.id}
        id={`canvas-node-wrapper-${node.id}`}
        onMouseDown={(e) => handleNodeMouseDown(e, node)}
        className={`absolute select-none pointer-events-auto cursor-move transition-shadow ${
          isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-neutral-950 z-30' : ''
        }`}
        style={{
          transform: `translate(${node.x}px, ${node.y}px) rotate(${node.rotation || 0}deg)`,
          width: `${node.width}px`,
          height: `${node.height}px`,
          zIndex: node.zIndex || 1,
          display: node.isHidden ? 'none' : 'block',
        }}
      >
        {/* Node Body */}
        {node.type === 'rectangle' && (
          <RectangleNode
            node={node}
            isSelected={isSelected}
            onUpdateText={(text) => onUpdateNode(node.id, { text })}
          />
        )}
        {node.type === 'circle' && (
          <CircleNode
            node={node}
            isSelected={isSelected}
            onUpdateText={(text) => onUpdateNode(node.id, { text })}
          />
        )}
        {node.type === 'text' && (
          <TextNode
            node={node}
            isSelected={isSelected}
            onUpdateText={(text) => onUpdateNode(node.id, { text })}
          />
        )}
        {node.type === 'sticky' && (
          <StickyNode
            node={node}
            isSelected={isSelected}
            onUpdateText={(text) => onUpdateNode(node.id, { text })}
          />
        )}
        {node.type === 'image' && (
          <ImageNode node={node} isSelected={isSelected} />
        )}
        {node.type === 'arrow' && (
          <ArrowNode node={node} isSelected={isSelected} />
        )}

        {/* Real-time Peer Halo when another user is selecting/editing */}
        {peerSelecting && (
          <div
            className="absolute -inset-1.5 rounded-lg border-2 pointer-events-none z-40 transition-all animate-pulse"
            style={{ borderColor: peerSelecting.color }}
          >
            <div
              className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-semibold text-white shadow-md flex items-center gap-1"
              style={{ backgroundColor: peerSelecting.color }}
            >
              <span>{peerSelecting.name} 正在編輯</span>
            </div>
          </div>
        )}

        {/* 8-Point Resize Handles for Selected Single Node */}
        {isSelected && selectedNodeIds.length === 1 && !node.isLocked && (
          <div className="absolute inset-0 pointer-events-none z-50">
            {/* Visible rotation controls at each corner. */}
            {([
              '-top-5 -left-5',
              '-top-5 -right-5',
              '-bottom-5 -right-5',
              '-bottom-5 -left-5',
            ] as const).map((position) => (
              <button
                key={position}
                type="button"
                aria-label="旋轉物件"
                title="拖曳以旋轉"
                onMouseDown={(e) => handleRotationStart(e, node)}
                className={`absolute ${position} w-3.5 h-3.5 rounded-full border border-indigo-200 bg-indigo-600 shadow cursor-grab active:cursor-grabbing pointer-events-auto hover:scale-125 transition-transform`}
              />
            ))}
            {/* NW: Top-Left */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'nw', node)}
              className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm shadow cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform"
            />
            {/* N: Top-Center */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'n', node)}
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm shadow cursor-ns-resize pointer-events-auto hover:scale-125 transition-transform"
            />
            {/* NE: Top-Right */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'ne', node)}
              className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm shadow cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform"
            />
            {/* E: Middle-Right */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'e', node)}
              className="absolute top-1/2 -right-1 -translate-y-1/2 w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm shadow cursor-ew-resize pointer-events-auto hover:scale-125 transition-transform"
            />
            {/* SE: Bottom-Right */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'se', node)}
              className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm shadow cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform"
            />
            {/* S: Bottom-Center */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 's', node)}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm shadow cursor-ns-resize pointer-events-auto hover:scale-125 transition-transform"
            />
            {/* SW: Bottom-Left */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'sw', node)}
              className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm shadow cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform"
            />
            {/* W: Middle-Left */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'w', node)}
              className="absolute top-1/2 -left-1 -translate-y-1/2 w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm shadow cursor-ew-resize pointer-events-auto hover:scale-125 transition-transform"
            />

            {/* Dimension Badge Tooltip on bottom */}
            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/85 backdrop-blur-md text-[10px] font-mono text-white pointer-events-none border border-white/10 whitespace-nowrap shadow-lg">
              {Math.round(node.width)} × {Math.round(node.height)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      id="infinite-canvas-viewport"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ cursor: isNearRotationCorner ? 'alias' : undefined }}
      className={`relative w-full h-full overflow-hidden bg-neutral-950 select-none ${
        isPanning || isSpacePressed || currentTool === 'hand'
          ? 'cursor-grab active:cursor-grabbing'
          : currentTool !== 'select'
          ? 'cursor-crosshair'
          : 'cursor-default'
      }`}
    >
      {/* Infinite Grid Background */}
      <div
        id="canvas-grid-bg"
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(#27272a 1px, transparent 1px)`,
          backgroundSize: `${32 * viewport.zoom}px ${32 * viewport.zoom}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        }}
      />

      {/* World Plane Container */}
      <div
        id="canvas-world-plane"
        className="absolute top-0 left-0 origin-top-left z-10"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          willChange: 'transform',
        }}
      >
        {/* Render all canvas nodes */}
        {nodes.map(renderNode)}

        {/* Marquee selection box */}
        {marquee && (
          <div
            id="marquee-selection-box"
            className="absolute border border-indigo-500 bg-indigo-500/15 pointer-events-none z-50 rounded"
            style={{
              left: Math.min(marquee.startX, marquee.currentX),
              top: Math.min(marquee.startY, marquee.currentY),
              width: Math.abs(marquee.currentX - marquee.startX),
              height: Math.abs(marquee.currentY - marquee.startY),
            }}
          />
        )}
      </div>

      {/* Live Peer Cursors */}
      <LiveCursors
        presences={presences}
        currentUserId={currentUser.id}
        viewport={viewport}
      />

      {/* Live Floating Reactions */}
      <LiveReactions reactions={reactions} viewport={viewport} />

      {/* Drag Over File Upload Overlay */}
      {isDragOverFile && (
        <div className="absolute inset-0 bg-indigo-950/80 border-4 border-dashed border-indigo-500 flex flex-col items-center justify-center text-white z-50 pointer-events-none backdrop-blur-sm">
          <div className="p-4 rounded-2xl bg-indigo-600 shadow-2xl mb-3">
            <svg className="w-12 h-12 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">放開以立即上傳至 Cloudflare R2</h2>
          <p className="text-sm text-indigo-300 mt-1">圖片將自動儲存至 R2 並由 Cloudflare D1 同步至所有協作者</p>
        </div>
      )}
    </div>
  );
};
