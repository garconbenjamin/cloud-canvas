import { CanvasNode, UserPresence, SyncMessage, UserProfile } from '../types.ts';

type SyncCallback<T> = (data: T) => void;

class SyncService {
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private boardId: string = 'default';
  private currentUser: UserProfile | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: any = null;
  private lastCursorSendTime: number = 0;
  private pendingCursorMsg: any = null;

  private clientId: string = `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Listeners
  private nodeCreateListeners: Set<SyncCallback<CanvasNode>> = new Set();
  private nodeUpdateListeners: Set<SyncCallback<CanvasNode>> = new Set();
  private nodeBatchUpdateListeners: Set<SyncCallback<CanvasNode[]>> = new Set();
  private nodeDeleteListeners: Set<SyncCallback<string>> = new Set();
  private nodeBatchDeleteListeners: Set<SyncCallback<string[]>> = new Set();
  private fullSyncListeners: Set<SyncCallback<CanvasNode[]>> = new Set();
  private presenceListeners: Set<SyncCallback<UserPresence[]>> = new Set();
  private cursorListeners: Set<SyncCallback<{ sender: UserProfile; cursor: { x: number; y: number } | null; selectedNodeIds: string[]; isDragging?: boolean }>> = new Set();
  private reactionListeners: Set<SyncCallback<{ sender: UserProfile; emoji: string; x: number; y: number }>> = new Set();
  private statusListeners: Set<SyncCallback<boolean>> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('cloudcanvas_sync_channel');
      this.broadcastChannel.onmessage = (event) => {
        this.handleIncomingMessage(event.data, false);
      };
    }
  }

  public connect(boardId: string, user: UserProfile) {
    this.boardId = boardId;
    this.currentUser = user;

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }

    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const params = new URLSearchParams({
      boardId,
      userId: user.id,
      clientId: this.clientId,
      userName: user.name,
      userEmail: user.email,
      userColor: user.color,
      userAvatar: user.avatar,
    });

    const wsUrl = `${protocol}//${host}/ws?${params.toString()}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notifyStatus(true);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: SyncMessage = JSON.parse(event.data);
          this.handleIncomingMessage(msg, true);
        } catch (err) {
          console.error('[SyncService] Failed to parse message', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyStatus(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[SyncService] WebSocket error, will reconnect', err);
        this.isConnected = false;
        this.notifyStatus(false);
      };
    } catch (err) {
      console.warn('[SyncService] Could not establish WebSocket', err);
      this.scheduleReconnect();
    }
  }

  public updateUserInfo(user: UserProfile) {
    this.currentUser = user;
    this.send({
      type: 'user_state',
      boardId: this.boardId,
      sender: user,
      timestamp: Date.now(),
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.currentUser) {
        this.connect(this.boardId, this.currentUser);
      }
    }, 2500);
  }

  private send(msg: SyncMessage, sendToBroadcastChannel: boolean = true) {
    const raw = JSON.stringify(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(raw);
    }
    if (sendToBroadcastChannel && this.broadcastChannel) {
      this.broadcastChannel.postMessage(msg);
    }
  }

  private handleIncomingMessage(msg: SyncMessage, fromWebSocket: boolean) {
    // Ignore messages from self if they originate from broadcast channel
    if (!fromWebSocket && this.currentUser && msg.sender?.id === this.currentUser.id) {
      return;
    }

    switch (msg.type) {
      case 'cursor_move':
        this.cursorListeners.forEach((fn) =>
          fn({
            sender: msg.sender,
            cursor: msg.payload?.cursor || null,
            selectedNodeIds: msg.payload?.selectedNodeIds || [],
            isDragging: msg.payload?.isDragging,
          })
        );
        break;

      case 'node_create':
        this.nodeCreateListeners.forEach((fn) => fn(msg.payload?.node));
        break;

      case 'node_update':
        this.nodeUpdateListeners.forEach((fn) => fn(msg.payload?.node));
        break;

      case 'node_batch_update':
        this.nodeBatchUpdateListeners.forEach((fn) => fn(msg.payload?.nodes || []));
        break;

      case 'node_delete':
        this.nodeDeleteListeners.forEach((fn) => fn(msg.payload?.nodeId));
        break;

      case 'node_batch_delete':
        this.nodeBatchDeleteListeners.forEach((fn) => fn(msg.payload?.nodeIds || []));
        break;

      case 'full_sync':
        this.fullSyncListeners.forEach((fn) => fn(msg.payload?.nodes || []));
        break;

      case 'user_state':
        if (msg.payload?.users) {
          this.presenceListeners.forEach((fn) => fn(msg.payload.users));
        }
        break;

      case 'reaction':
        this.reactionListeners.forEach((fn) =>
          fn({
            sender: msg.sender,
            emoji: msg.payload?.emoji,
            x: msg.payload?.x,
            y: msg.payload?.y,
          })
        );
        break;
    }
  }

  // Public Broadcast API
  public sendCursorMove(cursor: { x: number; y: number } | null, selectedNodeIds: string[] = [], isDragging: boolean = false) {
    if (!this.currentUser) return;
    const now = Date.now();

    const msg: SyncMessage = {
      type: 'cursor_move',
      boardId: this.boardId,
      sender: this.currentUser,
      payload: { cursor, selectedNodeIds, isDragging },
      timestamp: now,
    };

    // Throttle cursor movements to ~40fps (25ms) for buttery smooth performance without flooding
    if (now - this.lastCursorSendTime > 25) {
      this.lastCursorSendTime = now;
      this.send(msg);
      this.pendingCursorMsg = null;
    } else {
      this.pendingCursorMsg = msg;
      setTimeout(() => {
        if (this.pendingCursorMsg === msg) {
          this.send(msg);
          this.lastCursorSendTime = Date.now();
          this.pendingCursorMsg = null;
        }
      }, 30);
    }
  }

  public sendNodeCreate(node: CanvasNode) {
    if (!this.currentUser) return;
    this.send({
      type: 'node_create',
      boardId: this.boardId,
      sender: this.currentUser,
      payload: { node },
      timestamp: Date.now(),
    });
  }

  public sendNodeUpdate(node: CanvasNode) {
    if (!this.currentUser) return;
    this.send({
      type: 'node_update',
      boardId: this.boardId,
      sender: this.currentUser,
      payload: { node },
      timestamp: Date.now(),
    });
  }

  public sendNodeBatchUpdate(nodes: CanvasNode[]) {
    if (!this.currentUser) return;
    this.send({
      type: 'node_batch_update',
      boardId: this.boardId,
      sender: this.currentUser,
      payload: { nodes },
      timestamp: Date.now(),
    });
  }

  public sendNodeDelete(nodeId: string) {
    if (!this.currentUser) return;
    this.send({
      type: 'node_delete',
      boardId: this.boardId,
      sender: this.currentUser,
      payload: { nodeId },
      timestamp: Date.now(),
    });
  }

  public sendNodeBatchDelete(nodeIds: string[]) {
    if (!this.currentUser) return;
    this.send({
      type: 'node_batch_delete',
      boardId: this.boardId,
      sender: this.currentUser,
      payload: { nodeIds },
      timestamp: Date.now(),
    });
  }

  public sendReaction(emoji: string, x: number, y: number) {
    if (!this.currentUser) return;
    this.send({
      type: 'reaction',
      boardId: this.boardId,
      sender: this.currentUser,
      payload: { emoji, x, y },
      timestamp: Date.now(),
    });
  }

  // Subscription methods
  public onNodeCreate(cb: SyncCallback<CanvasNode>) {
    this.nodeCreateListeners.add(cb);
    return () => this.nodeCreateListeners.delete(cb);
  }

  public onNodeUpdate(cb: SyncCallback<CanvasNode>) {
    this.nodeUpdateListeners.add(cb);
    return () => this.nodeUpdateListeners.delete(cb);
  }

  public onNodeBatchUpdate(cb: SyncCallback<CanvasNode[]>) {
    this.nodeBatchUpdateListeners.add(cb);
    return () => this.nodeBatchUpdateListeners.delete(cb);
  }

  public onNodeDelete(cb: SyncCallback<string>) {
    this.nodeDeleteListeners.add(cb);
    return () => this.nodeDeleteListeners.delete(cb);
  }

  public onNodeBatchDelete(cb: SyncCallback<string[]>) {
    this.nodeBatchDeleteListeners.add(cb);
    return () => this.nodeBatchDeleteListeners.delete(cb);
  }

  public onFullSync(cb: SyncCallback<CanvasNode[]>) {
    this.fullSyncListeners.add(cb);
    return () => this.fullSyncListeners.delete(cb);
  }

  public onPresence(cb: SyncCallback<UserPresence[]>) {
    this.presenceListeners.add(cb);
    return () => this.presenceListeners.delete(cb);
  }

  public onCursor(cb: SyncCallback<{ sender: UserProfile; cursor: { x: number; y: number } | null; selectedNodeIds: string[]; isDragging?: boolean }>) {
    this.cursorListeners.add(cb);
    return () => this.cursorListeners.delete(cb);
  }

  public onReaction(cb: SyncCallback<{ sender: UserProfile; emoji: string; x: number; y: number }>) {
    this.reactionListeners.add(cb);
    return () => this.reactionListeners.delete(cb);
  }

  public onStatus(cb: SyncCallback<boolean>) {
    this.statusListeners.add(cb);
    cb(this.isConnected);
    return () => this.statusListeners.delete(cb);
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((fn) => fn(connected));
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const syncService = new SyncService();
