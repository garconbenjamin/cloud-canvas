import http from 'http';
import path from 'path';
import express, { Request, Response } from 'express';
import multer from 'multer';
import { WebSocketServer, WebSocket } from 'ws';
import { dbService } from './server/db.ts';
import { r2Service } from './server/r2.ts';
import { getWranglerToml, getWorkerTypeScript, getDeployGuideMarkdown } from './server/cloudflare-templates.ts';
import { CanvasNode, UserPresence, SyncMessage } from './src/types.ts';

const app = express();
const PORT = 3000;

// Setup middlewares
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Setup Multer for memory upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max file size
  },
});

// Create HTTP and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface ClientSession {
  ws: WebSocket;
  boardId: string;
  user: UserPresence;
}

const clients = new Map<WebSocket, ClientSession>();

// Helper to broadcast message to other clients on the same board
function broadcastToBoard(boardId: string, message: SyncMessage, senderWs?: WebSocket) {
  const data = JSON.stringify(message);
  for (const [ws, session] of clients.entries()) {
    if (session.boardId === boardId && ws !== senderWs && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

// Helper to send active user list to a board
function broadcastPresenceList(boardId: string) {
  const presenceList: UserPresence[] = [];
  for (const session of clients.values()) {
    if (session.boardId === boardId) {
      presenceList.push(session.user);
    }
  }

  const message: SyncMessage = {
    type: 'user_state',
    boardId,
    sender: {
      id: 'system',
      name: 'System',
      email: '',
      avatar: '',
      color: '#6366f1',
    },
    payload: { users: presenceList },
    timestamp: Date.now(),
  };

  const data = JSON.stringify(message);
  for (const [ws, session] of clients.entries()) {
    if (session.boardId === boardId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

// WebSocket Connection Management
wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const boardId = url.searchParams.get('boardId') || 'default';
  const userId = url.searchParams.get('userId') || `guest_${Math.random().toString(36).slice(2, 8)}`;
  const connectionId = url.searchParams.get('clientId') || `conn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const userName = url.searchParams.get('userName') || `訪客 ${userId.slice(0, 4)}`;
  const userEmail = url.searchParams.get('userEmail') || `${userId}@user.local`;
  const userColor = url.searchParams.get('userColor') || '#6366f1';
  const userAvatar = url.searchParams.get('userAvatar') || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

  const userPresence: UserPresence = {
    id: userId,
    connectionId,
    name: userName,
    email: userEmail,
    avatar: userAvatar,
    color: userColor,
    cursor: null,
    selectedNodeIds: [],
    lastActive: Date.now(),
  };

  clients.set(ws, { ws, boardId, user: userPresence });

  // Notify everyone of new user join
  broadcastPresenceList(boardId);

  ws.on('message', (rawData) => {
    try {
      const msg: SyncMessage = JSON.parse(rawData.toString());

      if (msg.type === 'cursor_move') {
        const session = clients.get(ws);
        if (session) {
          session.user.cursor = msg.payload.cursor;
          session.user.selectedNodeIds = msg.payload.selectedNodeIds || [];
          session.user.isDragging = msg.payload.isDragging || false;
          session.user.lastActive = Date.now();
          broadcastToBoard(boardId, msg, ws);
        }
      } else if (msg.type === 'node_create') {
        const node: CanvasNode = msg.payload.node;
        dbService.saveNode(boardId, node);
        broadcastToBoard(boardId, msg, ws);
      } else if (msg.type === 'node_update') {
        const node: CanvasNode = msg.payload.node;
        dbService.saveNode(boardId, node);
        broadcastToBoard(boardId, msg, ws);
      } else if (msg.type === 'node_batch_update') {
        const nodes: CanvasNode[] = msg.payload.nodes;
        dbService.batchSaveNodes(boardId, nodes);
        broadcastToBoard(boardId, msg, ws);
      } else if (msg.type === 'node_delete') {
        const nodeId: string = msg.payload.nodeId;
        dbService.deleteNode(boardId, nodeId);
        broadcastToBoard(boardId, msg, ws);
      } else if (msg.type === 'node_batch_delete') {
        const nodeIds: string[] = msg.payload.nodeIds;
        dbService.batchDeleteNodes(boardId, nodeIds);
        broadcastToBoard(boardId, msg, ws);
      } else if (msg.type === 'reaction') {
        broadcastToBoard(boardId, msg, ws);
      } else if (msg.type === 'user_state') {
        const session = clients.get(ws);
        if (session && msg.sender) {
          session.user = {
            ...session.user,
            name: msg.sender.name || session.user.name,
            email: msg.sender.email || session.user.email,
            avatar: msg.sender.avatar || session.user.avatar,
            color: msg.sender.color || session.user.color,
          };
          broadcastPresenceList(boardId);
        }
      }
    } catch (err) {
      console.error('[WebSocket] Message parse error:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    broadcastPresenceList(boardId);
  });

  ws.on('error', (err) => {
    console.warn('[WebSocket] Client connection error:', err);
    clients.delete(ws);
  });
});

// ==========================================
// REST API Routes (Cloudflare D1 & R2)
// ==========================================

app.get('/api/board/:id', (req: Request, res: Response) => {
  const board = dbService.getBoard(req.params.id);
  if (!board) return res.status(404).json({ success: false, error: 'Board not found' });
  return res.json({ success: true, board });
});

app.post('/api/boards', (req: Request, res: Response) => {
  const { id, ownerId, title } = req.body || {};
  if (!id || !ownerId) return res.status(400).json({ success: false, error: 'id and ownerId are required' });
  return res.json({ success: true, board: dbService.createBoard(id, ownerId, title) });
});

app.get('/api/boards', (req: Request, res: Response) => {
  const ownerId = String(req.query.ownerId || '');
  return res.json({ success: true, boards: ownerId ? dbService.listBoards(ownerId) : [] });
});

app.patch('/api/board/:id', (req: Request, res: Response) => {
  const { ownerId, title } = req.body || {};
  const board = dbService.updateBoardTitle(req.params.id, ownerId, title || '');
  if (!board) return res.status(403).json({ success: false, error: 'Only the board owner can rename it' });
  return res.json({ success: true, board });
});

// 1. Health & Config status
app.get('/api/config', (req: Request, res: Response) => {
  const r2Status = r2Service.getStatus();
  const d1Stats = dbService.getStats();

  let activePeers = 0;
  for (const session of clients.values()) {
    if (session.boardId === 'default') activePeers++;
  }

  res.json({
    d1Connected: d1Stats.d1Connected,
    d1DatabaseName: d1Stats.d1DatabaseName,
    d1NodeCount: d1Stats.d1NodeCount,
    r2Configured: r2Status.r2Configured,
    r2BucketName: r2Status.r2BucketName,
    googleOAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID),
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    totalAssets: d1Stats.totalAssets,
    serverTime: d1Stats.serverTime,
    activePeersCount: activePeers,
  });
});

// 2. Fetch Board Nodes (Cloudflare D1)
app.get('/api/board/:id/nodes', (req: Request, res: Response) => {
  const boardId = req.params.id || 'default';
  const nodes = dbService.getBoardNodes(boardId);
  res.json({ success: true, nodes });
});

// 3. Save / Update Node (Cloudflare D1)
app.post('/api/board/:id/nodes', (req: Request, res: Response) => {
  const boardId = req.params.id || 'default';
  const { node } = req.body;
  if (!node || !node.id) {
    return res.status(400).json({ success: false, error: 'Invalid node payload' });
  }

  const saved = dbService.saveNode(boardId, node);
  res.json({ success: true, node: saved });
});

// 4. Batch Save Nodes (Cloudflare D1)
app.post('/api/board/:id/nodes/batch', (req: Request, res: Response) => {
  const boardId = req.params.id || 'default';
  const { nodes } = req.body;
  if (!Array.isArray(nodes)) {
    return res.status(400).json({ success: false, error: 'Nodes must be an array' });
  }

  const result = dbService.batchSaveNodes(boardId, nodes);
  res.json({ success: true, nodes: result });
});

// 5. Delete Node (Cloudflare D1)
app.delete('/api/board/:id/nodes/:nodeId', (req: Request, res: Response) => {
  const boardId = req.params.id || 'default';
  const nodeId = req.params.nodeId;
  const deleted = dbService.deleteNode(boardId, nodeId);
  res.json({ success: deleted });
});

// 6. Batch Delete Nodes (Cloudflare D1)
app.post('/api/board/:id/nodes/batch-delete', (req: Request, res: Response) => {
  const boardId = req.params.id || 'default';
  const { nodeIds } = req.body;
  if (!Array.isArray(nodeIds)) {
    return res.status(400).json({ success: false, error: 'nodeIds must be an array' });
  }
  const deleted = dbService.batchDeleteNodes(boardId, nodeIds);
  res.json({ success: deleted });
});

// 7. Reset Board
app.post('/api/board/:id/reset', (req: Request, res: Response) => {
  const boardId = req.params.id || 'default';
  const nodes = dbService.resetToDefault(boardId);
  broadcastToBoard(boardId, {
    type: 'full_sync',
    boardId,
    sender: { id: 'system', name: 'System', email: '', avatar: '', color: '#6366f1' },
    payload: { nodes },
    timestamp: Date.now(),
  });
  res.json({ success: true, nodes });
});

// 8. Image Upload to Cloudflare R2 / Storage
app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '請提供要上傳的圖片檔案' });
    }

    const originalName = req.file.originalname || 'upload.png';
    const mimeType = req.file.mimetype || 'image/png';
    const buffer = req.file.buffer;

    const result = await r2Service.uploadBuffer(buffer, originalName, mimeType);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error || 'Upload failed' });
    }

    // Record asset into D1 assets database table
    dbService.recordAsset({
      id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      key: result.key,
      bucket: result.bucket,
      fileName: result.fileName,
      mimeType: result.mimeType,
      size: result.size,
      url: result.url,
      createdBy: (req.body.userEmail as string) || 'guest',
    });

    res.json(result);
  } catch (err: any) {
    console.error('[Upload API Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Server upload error' });
  }
});

// 9. Serve Local Storage Files (fallback if R2 credentials not passed yet)
app.get('/api/storage/:key', (req: Request, res: Response) => {
  const rawKey = req.params.key;
  const decodedKey = decodeURIComponent(rawKey);
  const fileInfo = r2Service.getLocalFile(decodedKey);

  if (!fileInfo.exists) {
    return res.status(404).send('File not found in storage');
  }

  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(fileInfo.filePath);
});

// 10. Cloudflare Deployment Artifacts APIs
app.get('/api/cloudflare/d1-dump', (req: Request, res: Response) => {
  const sql = dbService.generateD1SqlDump('default');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="schema.sql"');
  res.send(sql);
});

app.get('/api/cloudflare/wrangler-toml', (req: Request, res: Response) => {
  const toml = getWranglerToml();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="wrangler.toml"');
  res.send(toml);
});

app.get('/api/cloudflare/worker-ts', (req: Request, res: Response) => {
  const code = getWorkerTypeScript();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="worker.ts"');
  res.send(code);
});

app.get('/api/cloudflare/deploy-guide', (req: Request, res: Response) => {
  const md = getDeployGuideMarkdown();
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.send(md);
});

// ==========================================
// Vite / Static SPA Handler
// ==========================================
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CloudCanvas Server running at http://0.0.0.0:${PORT}`);
    console.log(`📦 Cloudflare D1 & R2 Ready with WebSocket support.`);
  });
}

start();
