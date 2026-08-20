/**
 * CloudCanvas Durable Objects Worker
 * Handles WebSocket connections for real-time collaboration
 */

export class BoardSync {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.boardId = '';
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      this.boardId = url.searchParams.get('boardId') || 'default';
      const userId = url.searchParams.get('userId') || `guest_${Math.random().toString(36).slice(2, 8)}`;
      const connectionId = url.searchParams.get('clientId') || `conn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const userName = url.searchParams.get('userName') || `訪客 ${userId.slice(0, 4)}`;
      const userEmail = url.searchParams.get('userEmail') || `${userId}@user.local`;
      const userColor = url.searchParams.get('userColor') || '#6366f1';
      const userAvatar = url.searchParams.get('userAvatar') || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      await this.handleSession(server, {
        id: userId,
        connectionId,
        name: userName,
        email: userEmail,
        avatar: userAvatar,
        color: userColor,
        cursor: null,
        selectedNodeIds: [],
        lastActive: Date.now(),
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Not found', { status: 404 });
  }

  async handleSession(ws, user) {
    this.sessions.set(ws, { ws, user, boardId: this.boardId });

    // Broadcast presence to all clients on this board
    this.broadcastPresenceList();

    ws.addEventListener('message', async (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'cursor_move') {
          const session = this.sessions.get(ws);
          if (session) {
            session.user.cursor = msg.payload.cursor;
            session.user.selectedNodeIds = msg.payload.selectedNodeIds || [];
            session.user.isDragging = msg.payload.isDragging || false;
            session.user.lastActive = Date.now();
            this.broadcastToBoard(msg, ws);
          }
        } else if (msg.type === 'node_create' || msg.type === 'node_update') {
          this.broadcastToBoard(msg, ws);
        } else if (msg.type === 'node_batch_update') {
          this.broadcastToBoard(msg, ws);
        } else if (msg.type === 'node_delete' || msg.type === 'node_delete_batch') {
          this.broadcastToBoard(msg, ws);
        } else if (msg.type === 'reaction') {
          this.broadcastToBoard(msg, ws);
        } else if (msg.type === 'user_state') {
          const session = this.sessions.get(ws);
          if (session && msg.sender) {
            session.user = {
              ...session.user,
              name: msg.sender.name || session.user.name,
              email: msg.sender.email || session.user.email,
              avatar: msg.sender.avatar || session.user.avatar,
              color: msg.sender.color || session.user.color,
            };
            this.broadcastPresenceList();
          }
        }
      } catch (err) {
        console.error('[BoardSync] Message parse error:', err);
      }
    });

    ws.addEventListener('close', () => {
      this.sessions.delete(ws);
      this.broadcastPresenceList();
    });

    ws.addEventListener('error', (err) => {
      console.warn('[BoardSync] Client connection error:', err);
      this.sessions.delete(ws);
    });
  }

  broadcastToBoard(message, senderWs) {
    const data = JSON.stringify(message);
    for (const [ws, session] of this.sessions.entries()) {
      if (session.boardId === this.boardId && ws !== senderWs && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  broadcastPresenceList() {
    const presenceList = [];
    for (const session of this.sessions.values()) {
      if (session.boardId === this.boardId) {
        presenceList.push(session.user);
      }
    }

    const message = {
      type: 'user_state',
      boardId: this.boardId,
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
    for (const [ws, session] of this.sessions.entries()) {
      if (session.boardId === this.boardId && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // WebSocket endpoint
    if (url.pathname === '/ws') {
      // Forward to Durable Object
      const boardId = url.searchParams.get('boardId') || 'default';
      const id = env.BOARD_SYNC.idFromName(boardId);
      const stub = env.BOARD_SYNC.get(id);
      return stub.fetch(request);
    }

    return new Response(JSON.stringify({ message: 'CloudCanvas Durable Objects Worker' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  },
};
