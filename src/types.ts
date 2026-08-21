export type NodeType = 'rectangle' | 'circle' | 'text' | 'image' | 'sticky' | 'arrow';

export type ToolMode =
  'select' | 'hand' | 'rectangle' | 'circle' | 'text' | 'image' | 'sticky' | 'arrow';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  color: string;
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;

  // Style properties
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  borderRadius: number;
  shadow: boolean;

  // Text specific properties
  text?: string;
  fontSize?: number;
  fontFamily?: 'sans' | 'mono' | 'handwriting';
  fontWeight?: 'normal' | 'bold' | '500' | '600' | '700';
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;

  // Image / Cloudflare R2 specific properties
  imageUrl?: string;
  r2Key?: string;
  r2Bucket?: string;
  fileSize?: number;
  mimeType?: string;
  aspectRatio?: number;

  // Arrow specific properties
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;

  // Metadata & Multi-user attribution
  createdBy: UserProfile;
  createdAt: number;
  lastEditedBy?: UserProfile;
  lastEditedAt?: number;
  isLocked?: boolean;
  isHidden?: boolean;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface UserPresence {
  id: string;
  connectionId?: string;
  name: string;
  email: string;
  avatar: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeIds: string[];
  isDragging?: boolean;
  lastActive: number;
  reaction?: {
    emoji: string;
    timestamp: number;
    x: number;
    y: number;
  };
}

export interface SyncMessage {
  type:
    | 'join'
    | 'leave'
    | 'cursor_move'
    | 'node_create'
    | 'node_update'
    | 'node_batch_update'
    | 'node_delete'
    | 'node_batch_delete'
    | 'reaction'
    | 'user_state'
    | 'full_sync';
  boardId: string;
  sender: UserProfile;
  payload?: any;
  timestamp: number;
}

export interface CloudflareStatus {
  d1Connected: boolean;
  d1DatabaseName: string;
  d1NodeCount: number;
  r2Configured: boolean;
  r2BucketName: string;
  googleOAuthConfigured: boolean;
  googleClientId?: string;
  totalAssets: number;
  serverTime: string;
  activePeersCount: number;
}

export interface Board {
  id: string;
  title: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  nodeCount: number;
}
