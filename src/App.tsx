import { FC, useCallback, useEffect, useRef, useState } from 'react';

import { Canvas } from './components/Canvas.tsx';
import { GoogleAuthModal } from './components/GoogleAuthModal.tsx';
import { LayersPanel } from './components/LayersPanel.tsx';
import { Minimap } from './components/Minimap.tsx';
import { PropertyPanel } from './components/PropertyPanel.tsx';
import { Toolbar } from './components/Toolbar.tsx';
import { TopNavbar } from './components/TopNavbar.tsx';
import { syncService } from './lib/syncService.ts';
import {
  Board,
  CanvasNode,
  CloudflareStatus,
  ToolMode,
  UserPresence,
  UserProfile,
  Viewport,
} from './types.ts';

const GUEST_USER: UserProfile = {
  id: 'guest',
  name: '訪客',
  email: 'guest@user.local',
  avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Guest',
  color: '#6366f1',
};

const LEGACY_DEFAULT_NODE_IDS = new Set([
  'node-welcome-rect',
  'node-sticky-idea',
  'node-arch-circle',
  'node-r2-card',
]);

const HomeScreen: FC<{
  isAuthenticated: boolean;
  ownerId: string;
  onLogin: () => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  error: string;
}> = ({ isAuthenticated, ownerId, onLogin, onCreate, onOpen, error }) => {
  const [boardId, setBoardId] = useState('');
  const [boards, setBoards] = useState<Array<{ id: string; title: string }>>([]);
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/boards?ownerId=${encodeURIComponent(ownerId)}`)
      .then((res) => res.json())
      .then((data) => setBoards(data.boards || []))
      .catch(() => {});
  }, [isAuthenticated, ownerId]);
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-3xl border border-neutral-800 bg-neutral-900/90 p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl">
            ✦
          </div>
          <h1 className="text-2xl font-bold">CloudCanvas</h1>
          <p className="mt-2 text-sm text-neutral-400">多人協作無限畫布</p>
        </div>
        {!isAuthenticated ? (
          <button
            onClick={onLogin}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3 font-semibold"
          >
            使用 Google 登入後開始
          </button>
        ) : (
          <div className="space-y-4">
            <button
              onClick={onCreate}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3 font-semibold"
            >
              新增畫布
            </button>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="flex gap-2">
              <input
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                placeholder="輸入畫布 UUID"
                className="flex-1 rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 outline-none focus:border-indigo-500"
              />
              <button
                disabled={!boardId.trim()}
                onClick={() => onOpen(boardId.trim())}
                className="rounded-xl border border-neutral-700 px-4 disabled:opacity-40"
              >
                載入畫布
              </button>
            </div>
            {boards.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-neutral-400">我的舊畫布</p>
                {boards.map((board) => (
                  <button
                    key={board.id}
                    onClick={() => onOpen(board.id)}
                    className="w-full text-left rounded-xl border border-neutral-800 px-3 py-2 hover:bg-neutral-800"
                  >
                    <span className="text-sm">{board.title}</span>
                    <span className="block text-[11px] text-neutral-500">{board.id}</span>
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-neutral-500">可透過分享連結或已建立的畫布 UUID 開啟畫布。</p>
          </div>
        )}
      </div>
    </div>
  );
};

function getBoardIdFromPath(): string | null {
  if (typeof window === 'undefined') return 'default';

  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const routeBoardId = pathParts[0] === 'board' ? pathParts[1] : undefined;
  return routeBoardId || null;
}

export default function App() {
  // Board & Nodes State
  const [routeBoardId, setRouteBoardId] = useState(getBoardIdFromPath);
  const boardId = routeBoardId || 'pending';
  const [boardTitle, setBoardTitle] = useState('CloudCanvas 協作主畫布');
  const [boardOwnerId, setBoardOwnerId] = useState('');
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolMode>('select');

  // Viewport (Infinite Canvas Pan & Zoom)
  const [viewport, setViewport] = useState<Viewport>({
    x: 120,
    y: 80,
    zoom: 1,
  });

  // User Authentication & Presences
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cloudcanvas_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as UserProfile;
          if (import.meta.env.DEV || parsed.id?.startsWith('google_')) return parsed;
          localStorage.removeItem('cloudcanvas_user');
        } catch {}
      }
    }
    return GUEST_USER;
  });

  const [onlinePresences, setOnlinePresences] = useState<UserPresence[]>([]);
  const [cloudflareStatus, setCloudflareStatus] = useState<CloudflareStatus | null>(null);

  // Modals & Panels UI State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [isPropertyPanelOpen, setIsPropertyPanelOpen] = useState(true);
  const [showHoverInfo, setShowHoverInfo] = useState(true);
  const [homeError, setHomeError] = useState('');
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardListError, setBoardListError] = useState('');
  const [isCheckingBoard, setIsCheckingBoard] = useState(Boolean(routeBoardId));

  const openBoard = useCallback(async (id: string) => {
    const nextBoardId = id.trim();
    if (!nextBoardId) return;
    try {
      const res = await fetch(`/api/board/${encodeURIComponent(nextBoardId)}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error('找不到此畫布，請確認分享連結或 UUID');
      window.history.pushState({}, '', `/board/${nextBoardId}`);
      setRouteBoardId(nextBoardId);
      setBoardTitle(data.board.title);
      setBoardOwnerId(data.board.ownerId || '');
      setHomeError('');
    } catch (error) {
      setHomeError(error instanceof Error ? error.message : '找不到此畫布，請確認分享連結或 UUID');
      window.history.pushState({}, '', '/');
      setRouteBoardId(null);
    }
  }, []);

  const createBoardId = () => {
    return crypto.randomUUID();
  };

  const loadBoards = useCallback(async () => {
    if (!currentUser.id.startsWith('google_')) return;
    try {
      const res = await fetch(`/api/boards?ownerId=${encodeURIComponent(currentUser.id)}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || '載入畫布列表失敗');
      setBoards(data.boards || []);
      setBoardListError('');
    } catch (error) {
      setBoardListError(error instanceof Error ? error.message : '載入畫布列表失敗');
    }
  }, [currentUser.id]);

  const handleCreateBoard = useCallback(async () => {
    setHomeError('');
    setBoardListError('');
    const id = createBoardId();
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ownerId: currentUser.id, title: '未命名畫布' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || '建立畫布失敗');
      setBoards((prev) => [data.board, ...prev.filter((board) => board.id !== data.board.id)]);
      await openBoard(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '建立畫布失敗';
      setHomeError(message);
      setBoardListError(message);
    }
  }, [currentUser.id, openBoard]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  useEffect(() => {
    const validateRouteBoard = async () => {
      if (!routeBoardId) {
        setIsCheckingBoard(false);
        return;
      }

      setIsCheckingBoard(true);
      try {
        const res = await fetch(`/api/board/${encodeURIComponent(routeBoardId)}`);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error('找不到此畫布，請從已建立的分享連結進入');
        setBoardTitle(data.board.title);
        setBoardOwnerId(data.board.ownerId || '');
        setHomeError('');
      } catch (error) {
        setHomeError(error instanceof Error ? error.message : '找不到此畫布，請從已建立的分享連結進入');
        window.history.replaceState({}, '', '/');
        setRouteBoardId(null);
        setNodes([]);
        setSelectedNodeIds([]);
      } finally {
        setIsCheckingBoard(false);
      }
    };

    validateRouteBoard();
  }, [routeBoardId]);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<CanvasNode[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isHistoryUpdate = useRef(false);

  // Hidden file input ref for image upload tool
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadIds = useRef(new Set<string>());

  // 1. Initial Data Fetch from Cloudflare D1 API
  useEffect(() => {
    const fetchBoardData = async () => {
      if (!routeBoardId || isCheckingBoard) return;
      try {
        const res = await fetch(`/api/board/${boardId}/nodes`);
        const data = await res.json();
        if (data.success && Array.isArray(data.nodes)) {
          const loadedNodes =
            boardId === 'default'
              ? data.nodes.filter((node: CanvasNode) => !LEGACY_DEFAULT_NODE_IDS.has(node.id))
              : data.nodes;
          setNodes((prev) => {
            const remoteNodeIds = new Set(loadedNodes.map((node: CanvasNode) => node.id));
            const localUploadPreviews = prev.filter(
              (node) => pendingUploadIds.current.has(node.id) && !remoteNodeIds.has(node.id),
            );
            return [...loadedNodes, ...localUploadPreviews];
          });
          setHistory([loadedNodes]);
          setHistoryIndex(0);
        }
      } catch (err) {
        console.error('[Cloudflare D1] Failed to fetch board nodes:', err);
      }
    };

    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        setCloudflareStatus(data);
      } catch {}
    };

    fetchBoardData();
    fetchConfig();

    const interval = setInterval(fetchConfig, 10000);
    return () => clearInterval(interval);
  }, [routeBoardId, boardId, isCheckingBoard]);

  useEffect(() => {
    if (!routeBoardId || isCheckingBoard) return;
    fetch(`/api/board/${routeBoardId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          setBoardTitle(data.board.title);
          setBoardOwnerId(data.board.ownerId || '');
        }
      })
      .catch(() => {});
  }, [routeBoardId, isCheckingBoard]);

  // 2. Setup Real-time WebSocket & Broadcast Sync
  useEffect(() => {
    if (!routeBoardId || isCheckingBoard) return;
    syncService.connect(boardId, currentUser);

    const unsubCreate = syncService.onNodeCreate((newNode) => {
      setNodes((prev) => {
        if (prev.some((n) => n.id === newNode.id)) return prev;
        return [...prev, newNode];
      });
    });

    const unsubUpdate = syncService.onNodeUpdate((updatedNode) => {
      setNodes((prev) => prev.map((n) => (n.id === updatedNode.id ? updatedNode : n)));
    });

    const unsubBatch = syncService.onNodeBatchUpdate((updatedNodes) => {
      setNodes((prev) => {
        const map = new Map(prev.map((n) => [n.id, n]));
        updatedNodes.forEach((n) => map.set(n.id, n));
        return Array.from(map.values());
      });
    });

    const unsubDelete = syncService.onNodeDelete((nodeId) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setSelectedNodeIds((prev) => prev.filter((id) => id !== nodeId));
    });

    const unsubBatchDelete = syncService.onNodeBatchDelete((nodeIds) => {
      const set = new Set(nodeIds);
      setNodes((prev) => prev.filter((n) => !set.has(n.id)));
      setSelectedNodeIds((prev) => prev.filter((id) => !set.has(id)));
    });

    const unsubFull = syncService.onFullSync((allNodes) => {
      setNodes(allNodes);
    });

    const unsubPresence = syncService.onPresence((users) => {
      setOnlinePresences(users);
    });

    return () => {
      unsubCreate();
      unsubUpdate();
      unsubBatch();
      unsubDelete();
      unsubBatchDelete();
      unsubFull();
      unsubPresence();
      syncService.disconnect();
    };
  }, [routeBoardId, boardId, currentUser, isCheckingBoard]);

  // Persist user changes to localStorage
  const handleSelectUser = useCallback((user: UserProfile) => {
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cloudcanvas_user', JSON.stringify(user));
    }
    syncService.updateUserInfo(user);
  }, []);

  const handleSignOut = useCallback(() => {
    setCurrentUser(GUEST_USER);
    localStorage.removeItem('cloudcanvas_user');
    syncService.updateUserInfo(GUEST_USER);
  }, []);

  // Push to Undo / Redo history helper
  const pushHistory = (newNodes: CanvasNode[]) => {
    if (isHistoryUpdate.current) {
      isHistoryUpdate.current = false;
      return;
    }
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newNodes];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  // 3. Node Mutations (Cloudflare D1 + WebSocket Broadcast)
  const handleCreateNode = async (newNode: CanvasNode) => {
    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    pushHistory(nextNodes);

    syncService.sendNodeCreate(newNode);

    try {
      await fetch(`/api/board/${boardId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node: newNode }),
      });
    } catch (err) {
      console.error('[D1 Write Error]:', err);
    }
  };

  const handleUpdateNode = async (nodeId: string, updates: Partial<CanvasNode>) => {
    const updated = nodes.map((n) =>
      n.id === nodeId
        ? {
            ...n,
            ...updates,
            lastEditedBy: currentUser,
            lastEditedAt: Date.now(),
          }
        : n,
    );
    setNodes(updated);

    const changedNode = updated.find((n) => n.id === nodeId);
    if (changedNode) {
      syncService.sendNodeUpdate(changedNode);

      try {
        await fetch(`/api/board/${boardId}/nodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ node: changedNode }),
        });
      } catch (err) {
        console.error('[D1 Update Error]:', err);
      }
    }
  };

  // Rapid local transform during active dragging/resizing (60fps, no HTTP overhead)
  const handleLocalTransformNodes = (updatedSubset: CanvasNode[]) => {
    setNodes((prev) => {
      const map = new Map<string, CanvasNode>(prev.map((n) => [n.id, n]));
      updatedSubset.forEach((n) => map.set(n.id, n));
      return Array.from(map.values());
    });
    syncService.sendNodeBatchUpdate(updatedSubset);
  };

  // Commit transform on drag/resize release (saves to D1 + adds to history)
  const handleCommitTransformNodes = async (committedNodes: CanvasNode[]) => {
    let nextAllNodes: CanvasNode[] = [];
    setNodes((prev) => {
      const map = new Map<string, CanvasNode>(prev.map((n) => [n.id, n]));
      committedNodes.forEach((n) => map.set(n.id, n));
      nextAllNodes = Array.from(map.values());
      return nextAllNodes;
    });

    if (nextAllNodes.length > 0) {
      pushHistory(nextAllNodes);
    }

    syncService.sendNodeBatchUpdate(committedNodes);

    try {
      await fetch(`/api/board/${boardId}/nodes/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: committedNodes }),
      });
    } catch (err) {
      console.error('[D1 Batch Write Error]:', err);
    }
  };

  const handleBatchUpdateNodes = async (updatedSubset: CanvasNode[]) => {
    const map = new Map(nodes.map((n) => [n.id, n]));
    updatedSubset.forEach((n) => map.set(n.id, n));
    const nextNodes = Array.from(map.values());
    setNodes(nextNodes);

    syncService.sendNodeBatchUpdate(updatedSubset);

    try {
      await fetch(`/api/board/${boardId}/nodes/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: updatedSubset }),
      });
    } catch (err) {
      console.error('[D1 Batch Write Error]:', err);
    }
  };

  const handleDeleteNodes = async (nodeIds: string[]) => {
    const set = new Set(nodeIds);
    const nextNodes = nodes.filter((n) => !set.has(n.id));
    setNodes(nextNodes);
    setSelectedNodeIds([]);
    pushHistory(nextNodes);

    syncService.sendNodeBatchDelete(nodeIds);

    try {
      await fetch(`/api/board/${boardId}/nodes/batch-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeIds }),
      });
    } catch (err) {
      console.error('[D1 Batch Delete Error]:', err);
    }
  };

  const handleDuplicateSelected = () => {
    if (selectedNodeIds.length === 0) return;

    const toDuplicate = nodes.filter((n) => selectedNodeIds.includes(n.id));
    const newNodes = toDuplicate.map((n) => ({
      ...n,
      id: `node_${n.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: n.x + 30,
      y: n.y + 30,
      zIndex: nodes.length + 1,
      createdBy: currentUser,
      createdAt: Date.now(),
      lastEditedBy: undefined,
      lastEditedAt: undefined,
    }));

    const all = [...nodes, ...newNodes];
    setNodes(all);
    setSelectedNodeIds(newNodes.map((n) => n.id));
    pushHistory(all);

    newNodes.forEach((n) => {
      syncService.sendNodeCreate(n);
      fetch(`/api/board/${boardId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node: n }),
      });
    });
  };

  // Layer Ordering Operations
  const handleBringToFront = () => {
    if (selectedNodeIds.length === 0) return;
    const maxZ = Math.max(...nodes.map((n) => n.zIndex || 1), 1);
    const updated = nodes.map((n) =>
      selectedNodeIds.includes(n.id) ? { ...n, zIndex: maxZ + 1 } : n,
    );
    handleBatchUpdateNodes(updated.filter((n) => selectedNodeIds.includes(n.id)));
  };

  const handleSendToBack = () => {
    if (selectedNodeIds.length === 0) return;
    const minZ = Math.min(...nodes.map((n) => n.zIndex || 1), 1);
    const updated = nodes.map((n) =>
      selectedNodeIds.includes(n.id) ? { ...n, zIndex: Math.max(0, minZ - 1) } : n,
    );
    handleBatchUpdateNodes(updated.filter((n) => selectedNodeIds.includes(n.id)));
  };

  const handleBringForward = () => {
    if (selectedNodeIds.length === 0) return;
    const updated = nodes.map((n) =>
      selectedNodeIds.includes(n.id) ? { ...n, zIndex: (n.zIndex || 1) + 1 } : n,
    );
    handleBatchUpdateNodes(updated.filter((n) => selectedNodeIds.includes(n.id)));
  };

  const handleSendBackward = () => {
    if (selectedNodeIds.length === 0) return;
    const updated = nodes.map((n) =>
      selectedNodeIds.includes(n.id) ? { ...n, zIndex: Math.max(0, (n.zIndex || 1) - 1) } : n,
    );
    handleBatchUpdateNodes(updated.filter((n) => selectedNodeIds.includes(n.id)));
  };

  // 4. Cloudflare R2 Image Upload Handler
  const handleUploadImageFile = async (file: File, worldX: number, worldY: number) => {
    const tempId = `node_image_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const localPreviewUrl = URL.createObjectURL(file);
    const tempNode: CanvasNode = {
      id: tempId,
      type: 'image',
      x: worldX - 150,
      y: worldY - 100,
      width: 300,
      height: 200,
      rotation: 0,
      zIndex: nodes.length + 1,
      fillColor: '#18181b',
      strokeColor: '#f97316',
      strokeWidth: 2,
      opacity: 1,
      borderRadius: 12,
      shadow: true,
      text: file.name,
      imageUrl: localPreviewUrl,
      r2Bucket: 'canvas-assets (上傳中...)',
      createdBy: currentUser,
      createdAt: Date.now(),
    };

    // Keep the blob URL in this window only. A blob URL cannot be rendered by
    // other tabs, so it must never be sent to D1 or the collaboration channel.
    pendingUploadIds.current.add(tempId);
    setNodes((prev) => [...prev, tempNode]);
    setSelectedNodeIds([tempId]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userEmail', currentUser.email);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'R2 upload failed');
      }

      const uploadedNode: CanvasNode = {
        ...tempNode,
        imageUrl: data.url,
        r2Key: data.key,
        r2Bucket: data.bucket,
        fileSize: data.size,
        mimeType: data.mimeType,
        strokeColor: '#3f3f46',
        strokeWidth: 0,
      };

      // Replace only the local preview, then publish a node that every client
      // can fetch from R2 through the Pages storage endpoint.
      setNodes((prev) => prev.map((node) => (node.id === tempId ? uploadedNode : node)));
      pendingUploadIds.current.delete(tempId);
      URL.revokeObjectURL(localPreviewUrl);

      syncService.sendNodeCreate(uploadedNode);
      await fetch(`/api/board/${boardId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node: uploadedNode }),
      });
    } catch (err) {
      console.error('[Cloudflare R2 Upload Error]:', err);
      pendingUploadIds.current.delete(tempId);
      setNodes((prev) =>
        prev.map((node) =>
          node.id === tempId
            ? { ...node, r2Bucket: 'canvas-assets (上傳失敗)', strokeColor: '#f43f5e' }
            : node,
        ),
      );
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      isHistoryUpdate.current = true;
      const target = history[historyIndex - 1];
      setNodes(target);
      setHistoryIndex((prev) => prev - 1);
      handleBatchUpdateNodes(target);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isHistoryUpdate.current = true;
      const target = history[historyIndex + 1];
      setNodes(target);
      setHistoryIndex((prev) => prev + 1);
      handleBatchUpdateNodes(target);
    }
  };

  // Zoom Operations
  const handleZoomIn = () => {
    setViewport((prev) => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 5) }));
  };

  const handleZoomOut = () => {
    setViewport((prev) => ({ ...prev, zoom: Math.max(prev.zoom * 0.8, 0.1) }));
  };

  const handleResetZoom = () => {
    setViewport((prev) => ({ ...prev, zoom: 1 }));
  };

  const handleZoomToFit = () => {
    if (nodes.length === 0) {
      setViewport({ x: 100, y: 100, zoom: 1 });
      return;
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    nodes.forEach((n) => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const padding = 80;
    const w = maxX - minX + padding * 2;
    const h = maxY - minY + padding * 2;
    const screenW = window.innerWidth - 300;
    const screenH = window.innerHeight - 150;

    const fitZoom = Math.min(screenW / w, screenH / h, 1.5);
    const centerX = (window.innerWidth - w * fitZoom) / 2 - minX * fitZoom + padding * fitZoom;
    const centerY = (window.innerHeight - h * fitZoom) / 2 - minY * fitZoom + padding * fitZoom;

    setViewport({ x: centerX, y: centerY, zoom: fitZoom });
  };

  // Reset Board to default
  const handleResetBoard = async () => {
    try {
      const res = await fetch(`/api/board/${boardId}/reset`, { method: 'POST' });
      const data = await res.json();
      if (data.success && Array.isArray(data.nodes)) {
        setNodes(data.nodes);
        setSelectedNodeIds([]);
      }
    } catch {}
  };

  const handleUpdateBoardTitle = async (title: string) => {
    if (!routeBoardId || currentUser.id !== boardOwnerId) return;
    const res = await fetch(`/api/board/${routeBoardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId: currentUser.id, title }),
    });
    const data = await res.json();
    if (data.success) setBoardTitle(data.board.title);
  };

  const isAuthenticated = currentUser.id.startsWith('google_');
  if (!isAuthenticated || !routeBoardId || isCheckingBoard) {
    return (
      <>
        <HomeScreen
          isAuthenticated={isAuthenticated}
          ownerId={currentUser.id}
          onLogin={() => setIsAuthModalOpen(true)}
          onCreate={handleCreateBoard}
          onOpen={openBoard}
          error={isCheckingBoard ? '正在確認畫布...' : homeError}
        />
        <GoogleAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
          onSignOut={handleSignOut}
          googleClientId={cloudflareStatus?.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID}
          googleOnly
        />
      </>
    );
  }

  const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));

  return (
    <div
      id="cloudcanvas-app-root"
      className="h-screen w-screen flex flex-col bg-neutral-950 text-neutral-100 overflow-hidden font-sans"
    >
      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
            const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
            handleUploadImageFile(file, centerX, centerY);
          }
        }}
      />

      {/* Top Navigation Bar */}
      <TopNavbar
        boardId={boardId}
        boardTitle={boardTitle}
        onUpdateBoardTitle={handleUpdateBoardTitle}
        canEditBoardTitle={currentUser.id === boardOwnerId}
        boardOwnerName={
          currentUser.id === boardOwnerId ? currentUser.name : boardOwnerId || '未知使用者'
        }
        boards={boards}
        boardListError={boardListError}
        onRefreshBoards={loadBoards}
        onOpenBoard={openBoard}
        onCreateBoard={handleCreateBoard}
        onlineUsers={onlinePresences}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onResetBoard={handleResetBoard}
      />

      {/* Main Workspace (Canvas + Sidebars) */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left: Layers Panel */}
        <LayersPanel
          nodes={nodes}
          selectedNodeIds={selectedNodeIds}
          onSelectNode={(nodeId, isShift) => {
            if (isShift) {
              setSelectedNodeIds((prev) =>
                prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId],
              );
            } else {
              setSelectedNodeIds([nodeId]);
            }
          }}
          onToggleLock={(nodeId) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (node) handleUpdateNode(nodeId, { isLocked: !node.isLocked });
          }}
          onToggleHide={(nodeId) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (node) handleUpdateNode(nodeId, { isHidden: !node.isHidden });
          }}
          isOpen={isLayersPanelOpen}
          onToggleOpen={() => setIsLayersPanelOpen(!isLayersPanelOpen)}
        />

        {/* Center: Infinite Collaborative Canvas */}
        <main className="flex-1 h-full relative">
          <Canvas
            nodes={nodes}
            selectedNodeIds={selectedNodeIds}
            onSelectNodes={setSelectedNodeIds}
            onUpdateNode={handleUpdateNode}
            onBatchUpdateNodes={handleBatchUpdateNodes}
            onLocalTransformNodes={handleLocalTransformNodes}
            onCommitTransformNodes={handleCommitTransformNodes}
            onCreateNode={handleCreateNode}
            onDeleteNodes={handleDeleteNodes}
            currentTool={currentTool}
            onToolChange={setCurrentTool}
            viewport={viewport}
            onViewportChange={setViewport}
            currentUser={currentUser}
            presences={onlinePresences}
            showHoverInfo={showHoverInfo}
            onSendCursor={(cursor, selectedIds, isDragging) =>
              syncService.sendCursorMove(cursor, selectedIds, isDragging)
            }
            onUploadImageFile={handleUploadImageFile}
          />

          {/* Floating Figma-style Toolbar */}
          <Toolbar
            currentTool={currentTool}
            onSelectTool={setCurrentTool}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onUndo={handleUndo}
            onRedo={handleRedo}
            zoom={viewport.zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            onZoomToFit={handleZoomToFit}
            onTriggerImageUpload={() => fileInputRef.current?.click()}
          />

          {/* Interactive Minimap */}
          <Minimap
            nodes={nodes}
            viewport={viewport}
            canvasWidth={window.innerWidth}
            canvasHeight={window.innerHeight}
            onNavigate={(newX, newY) => setViewport((prev) => ({ ...prev, x: newX, y: newY }))}
          />
        </main>

        {/* Right: Property Inspector Sidebar */}
        <PropertyPanel
          selectedNodes={selectedNodes}
          onUpdateNode={handleUpdateNode}
          onDeleteSelected={() => handleDeleteNodes(selectedNodeIds)}
          onDuplicateSelected={handleDuplicateSelected}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          currentUser={currentUser}
          isOpen={isPropertyPanelOpen}
          onToggleOpen={() => setIsPropertyPanelOpen((open) => !open)}
          showHoverInfo={showHoverInfo}
          onToggleHoverInfo={() => setShowHoverInfo((enabled) => !enabled)}
        />
      </div>

      {/* Google Auth & Multi-User Switcher Modal */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        onSignOut={handleSignOut}
        googleClientId={cloudflareStatus?.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID}
      />
    </div>
  );
}
