import fs from 'fs';
import path from 'path';
import { CanvasNode, Board, UserProfile } from '../src/types.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'd1_storage.json');

interface DatabaseSchema {
  boards: Record<string, Board>;
  nodes: Record<string, CanvasNode[]>; // boardId -> CanvasNode[]
  assets: Array<{
    id: string;
    key: string;
    bucket: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
    createdBy: string;
    createdAt: number;
  }>;
}

// Initial demo nodes to make the canvas exciting and immediately usable
const DEFAULT_USER: UserProfile = {
  id: 'user_owner',
  name: 'Kevin (Owner)',
  email: 'kevin820422@gmail.com',
  avatar:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  color: '#6366f1',
};

const DEFAULT_NODES: CanvasNode[] = [
  {
    id: 'node-welcome-rect',
    type: 'rectangle',
    x: 80,
    y: 80,
    width: 380,
    height: 220,
    rotation: 0,
    zIndex: 1,
    fillColor: '#1e1b4b',
    strokeColor: '#6366f1',
    strokeWidth: 2,
    opacity: 0.95,
    borderRadius: 16,
    shadow: true,
    text: '🚀 CloudCanvas 歡迎！\n\n- Figma 級無限平移與縮放\n- Cloudflare D1 實時資料庫存檔\n- Cloudflare R2 拖曳圖片儲存\n- 多人即時同步與動態游標',
    fontSize: 16,
    fontFamily: 'sans',
    fontWeight: 'normal',
    textAlign: 'left',
    textColor: '#e0e7ff',
    createdBy: DEFAULT_USER,
    createdAt: Date.now() - 100000,
  },
  {
    id: 'node-sticky-idea',
    type: 'sticky',
    x: 500,
    y: 90,
    width: 220,
    height: 210,
    rotation: -2,
    zIndex: 2,
    fillColor: '#fef08a',
    strokeColor: '#facc15',
    strokeWidth: 1,
    opacity: 1,
    borderRadius: 4,
    shadow: true,
    text: '💡 提示：\n拖曳任何圖片至畫布\n立即自動上傳至 R2！\n\n重整網頁後原封不動 ✨',
    fontSize: 16,
    fontFamily: 'handwriting',
    fontWeight: 'normal',
    textAlign: 'left',
    textColor: '#854d0e',
    createdBy: {
      id: 'user_alex',
      name: 'Alex Design',
      email: 'alex@design.co',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      color: '#ec4899',
    },
    createdAt: Date.now() - 80000,
  },
  {
    id: 'node-arch-circle',
    type: 'circle',
    x: 180,
    y: 350,
    width: 180,
    height: 180,
    rotation: 0,
    zIndex: 3,
    fillColor: '#0f172a',
    strokeColor: '#38bdf8',
    strokeWidth: 2,
    opacity: 0.9,
    borderRadius: 999,
    shadow: true,
    text: 'Cloudflare D1\n(SQLite at Edge)',
    fontSize: 15,
    fontFamily: 'mono',
    fontWeight: 'bold',
    textAlign: 'center',
    textColor: '#38bdf8',
    createdBy: DEFAULT_USER,
    createdAt: Date.now() - 60000,
  },
  {
    id: 'node-r2-card',
    type: 'rectangle',
    x: 420,
    y: 360,
    width: 280,
    height: 160,
    rotation: 0,
    zIndex: 4,
    fillColor: '#18181b',
    strokeColor: '#f97316',
    strokeWidth: 2,
    opacity: 0.95,
    borderRadius: 12,
    shadow: true,
    text: '📦 Cloudflare R2\nS3 相容物件存儲\n支援圖片快速讀取與快取',
    fontSize: 15,
    fontFamily: 'sans',
    fontWeight: '500',
    textAlign: 'center',
    textColor: '#fdba74',
    createdBy: DEFAULT_USER,
    createdAt: Date.now() - 40000,
  },
];

class D1DatabaseService {
  private data: DatabaseSchema = {
    boards: {},
    nodes: {},
    assets: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        Object.values(this.data.boards).forEach((board) => {
          if (!board.ownerId) board.ownerId = '';
        });
      } else {
        // Initialize default board
        const defaultBoardId = 'default';
        this.data.boards[defaultBoardId] = {
          id: defaultBoardId,
          title: 'CloudCanvas 協作主畫布',
          ownerId: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          nodeCount: 0,
        };
        this.data.nodes[defaultBoardId] = [];
        this.save();
      }
    } catch (err) {
      console.error('[D1 DB] Error loading database file:', err);
      // Fallback
      this.data.nodes['default'] = [...DEFAULT_NODES];
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[D1 DB] Error saving database file:', err);
    }
  }

  public getBoardNodes(boardId: string): CanvasNode[] {
    if (!this.data.nodes[boardId]) {
      this.data.nodes[boardId] = [];
    }
    return this.data.nodes[boardId] || [];
  }

  public saveNode(boardId: string, node: CanvasNode): CanvasNode {
    const nodes = this.getBoardNodes(boardId);
    const index = nodes.findIndex((n) => n.id === node.id);

    if (index >= 0) {
      nodes[index] = {
        ...nodes[index],
        ...node,
        lastEditedAt: Date.now(),
      };
    } else {
      nodes.push(node);
    }

    this.data.nodes[boardId] = nodes;
    this.updateBoardMetadata(boardId);
    this.save();
    return node;
  }

  public batchSaveNodes(boardId: string, updatedNodes: CanvasNode[]): CanvasNode[] {
    const nodes = this.getBoardNodes(boardId);
    const nodeMap = new Map<string, CanvasNode>(nodes.map((n) => [n.id, n]));

    for (const node of updatedNodes) {
      const existing = nodeMap.get(node.id);
      if (existing) {
        nodeMap.set(node.id, {
          ...existing,
          ...node,
          lastEditedAt: Date.now(),
        });
      } else {
        nodeMap.set(node.id, node);
      }
    }

    this.data.nodes[boardId] = Array.from(nodeMap.values());
    this.updateBoardMetadata(boardId);
    this.save();
    return this.data.nodes[boardId];
  }

  public deleteNode(boardId: string, nodeId: string): boolean {
    const nodes = this.getBoardNodes(boardId);
    const filtered = nodes.filter((n) => n.id !== nodeId);
    if (filtered.length !== nodes.length) {
      this.data.nodes[boardId] = filtered;
      this.updateBoardMetadata(boardId);
      this.save();
      return true;
    }
    return false;
  }

  public batchDeleteNodes(boardId: string, nodeIds: string[]): boolean {
    const set = new Set(nodeIds);
    const nodes = this.getBoardNodes(boardId);
    this.data.nodes[boardId] = nodes.filter((n) => !set.has(n.id));
    this.updateBoardMetadata(boardId);
    this.save();
    return true;
  }

  public clearBoard(boardId: string): void {
    this.data.nodes[boardId] = [];
    this.updateBoardMetadata(boardId);
    this.save();
  }

  public resetToDefault(boardId: string): CanvasNode[] {
    this.data.nodes[boardId] = [];
    this.updateBoardMetadata(boardId);
    this.save();
    return this.data.nodes[boardId];
  }

  public recordAsset(asset: {
    id: string;
    key: string;
    bucket: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
    createdBy: string;
  }) {
    this.data.assets.push({
      ...asset,
      createdAt: Date.now(),
    });
    this.save();
  }

  public getStats() {
    let totalNodes = 0;
    for (const key in this.data.nodes) {
      totalNodes += this.data.nodes[key].length;
    }
    return {
      d1Connected: true,
      d1DatabaseName: 'canvas_d1_prod',
      d1NodeCount: totalNodes,
      totalAssets: this.data.assets.length,
      serverTime: new Date().toISOString(),
    };
  }

  private updateBoardMetadata(boardId: string) {
    if (!this.data.boards[boardId]) {
      this.data.boards[boardId] = {
        id: boardId,
        title: boardId === 'default' ? 'CloudCanvas 協作主畫布' : `畫布 ${boardId}`,
        ownerId: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodeCount: 0,
      };
    }
    this.data.boards[boardId].updatedAt = Date.now();
    this.data.boards[boardId].nodeCount = this.data.nodes[boardId]?.length || 0;
  }

  public getBoard(boardId: string): Board | null {
    return this.data.boards[boardId] || null;
  }

  public createBoard(boardId: string, ownerId: string, title = '未命名畫布'): Board {
    const now = Date.now();
    const board: Board = {
      id: boardId,
      title,
      ownerId,
      createdAt: now,
      updatedAt: now,
      nodeCount: 0,
    };
    this.data.boards[boardId] = board;
    this.data.nodes[boardId] = [];
    this.save();
    return board;
  }

  public updateBoardTitle(boardId: string, ownerId: string, title: string): Board | null {
    const board = this.data.boards[boardId];
    if (!board || board.ownerId !== ownerId) return null;
    board.title = title.trim() || board.title;
    board.updatedAt = Date.now();
    this.save();
    return board;
  }

  public listBoards(ownerId: string): Board[] {
    return Object.values(this.data.boards).filter((board) => board.ownerId === ownerId);
  }

  public generateD1SqlDump(boardId: string = 'default'): string {
    const nodes = this.getBoardNodes(boardId);
    const lines = [
      '-- Cloudflare D1 SQL Migration Dump for CloudCanvas',
      `-- Generated at: ${new Date().toISOString()}`,
      '',
      'CREATE TABLE IF NOT EXISTS boards (',
      '  id TEXT PRIMARY KEY,',
      '  title TEXT NOT NULL,',
      '  created_at INTEGER NOT NULL,',
      '  updated_at INTEGER NOT NULL,',
      '  node_count INTEGER DEFAULT 0',
      ');',
      '',
      'CREATE TABLE IF NOT EXISTS nodes (',
      '  id TEXT PRIMARY KEY,',
      '  board_id TEXT NOT NULL,',
      '  type TEXT NOT NULL,',
      '  x REAL NOT NULL,',
      '  y REAL NOT NULL,',
      '  width REAL NOT NULL,',
      '  height REAL NOT NULL,',
      '  rotation REAL DEFAULT 0,',
      '  z_index INTEGER DEFAULT 1,',
      '  fill_color TEXT,',
      '  stroke_color TEXT,',
      '  stroke_width REAL DEFAULT 1,',
      '  opacity REAL DEFAULT 1,',
      '  border_radius REAL DEFAULT 0,',
      '  shadow INTEGER DEFAULT 0,',
      '  text TEXT,',
      '  font_size REAL,',
      '  font_family TEXT,',
      '  font_weight TEXT,',
      '  text_align TEXT,',
      '  text_color TEXT,',
      '  image_url TEXT,',
      '  r2_key TEXT,',
      '  r2_bucket TEXT,',
      '  file_size INTEGER,',
      '  mime_type TEXT,',
      '  aspect_ratio REAL,',
      '  start_x REAL,',
      '  start_y REAL,',
      '  end_x REAL,',
      '  end_y REAL,',
      '  created_by TEXT,',
      '  created_at INTEGER,',
      '  last_edited_by TEXT,',
      '  last_edited_at INTEGER,',
      '  is_locked INTEGER DEFAULT 0,',
      '  is_hidden INTEGER DEFAULT 0',
      ');',
      '',
      'CREATE TABLE IF NOT EXISTS assets (',
      '  id TEXT PRIMARY KEY,',
      '  key TEXT NOT NULL,',
      '  bucket TEXT NOT NULL,',
      '  file_name TEXT,',
      '  mime_type TEXT,',
      '  size INTEGER,',
      '  url TEXT NOT NULL,',
      '  created_by TEXT,',
      '  created_at INTEGER',
      ');',
      '',
      `INSERT OR REPLACE INTO boards (id, title, created_at, updated_at, node_count) VALUES ('${boardId}', 'CloudCanvas 協作主畫布', ${Date.now()}, ${Date.now()}, ${nodes.length});`,
      '',
    ];

    for (const n of nodes) {
      const escape = (str?: string) => (str ? str.replace(/'/g, "''") : '');
      const createdByJson = escape(JSON.stringify(n.createdBy || {}));
      const lastEditedByJson = escape(JSON.stringify(n.lastEditedBy || {}));

      lines.push(
        `INSERT OR REPLACE INTO nodes (id, board_id, type, x, y, width, height, rotation, z_index, fill_color, stroke_color, stroke_width, opacity, border_radius, shadow, text, font_size, font_family, font_weight, text_align, text_color, image_url, r2_key, r2_bucket, file_size, mime_type, aspect_ratio, created_by, created_at, last_edited_by, last_edited_at, is_locked, is_hidden) VALUES (` +
          `'${n.id}', '${boardId}', '${n.type}', ${n.x}, ${n.y}, ${n.width}, ${n.height}, ${n.rotation || 0}, ${n.zIndex || 1}, '${escape(n.fillColor)}', '${escape(n.strokeColor)}', ${n.strokeWidth || 1}, ${n.opacity ?? 1}, ${n.borderRadius || 0}, ${n.shadow ? 1 : 0}, '${escape(n.text)}', ${n.fontSize || 16}, '${escape(n.fontFamily)}', '${escape(n.fontWeight)}', '${escape(n.textAlign)}', '${escape(n.textColor)}', '${escape(n.imageUrl)}', '${escape(n.r2Key)}', '${escape(n.r2Bucket)}', ${n.fileSize || 0}, '${escape(n.mimeType)}', ${n.aspectRatio || 1}, '${createdByJson}', ${n.createdAt || Date.now()}, '${lastEditedByJson}', ${n.lastEditedAt || Date.now()}, ${n.isLocked ? 1 : 0}, ${n.isHidden ? 1 : 0});`,
      );
    }

    return lines.join('\n');
  }
}

export const dbService = new D1DatabaseService();
