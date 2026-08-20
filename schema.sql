-- Cloudflare D1 SQL Migration Dump for CloudCanvas
-- Generated at: 2026-08-19T17:05:10.791Z

CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  node_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  type TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  width REAL NOT NULL,
  height REAL NOT NULL,
  rotation REAL DEFAULT 0,
  z_index INTEGER DEFAULT 1,
  fill_color TEXT,
  stroke_color TEXT,
  stroke_width REAL DEFAULT 1,
  opacity REAL DEFAULT 1,
  border_radius REAL DEFAULT 0,
  shadow INTEGER DEFAULT 0,
  text TEXT,
  font_size REAL,
  font_family TEXT,
  font_weight TEXT,
  text_align TEXT,
  text_color TEXT,
  image_url TEXT,
  r2_key TEXT,
  r2_bucket TEXT,
  file_size INTEGER,
  mime_type TEXT,
  aspect_ratio REAL,
  start_x REAL,
  start_y REAL,
  end_x REAL,
  end_y REAL,
  created_by TEXT,
  created_at INTEGER,
  last_edited_by TEXT,
  last_edited_at INTEGER,
  is_locked INTEGER DEFAULT 0,
  is_hidden INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  bucket TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  size INTEGER,
  url TEXT NOT NULL,
  created_by TEXT,
  created_at INTEGER
);

INSERT OR REPLACE INTO boards (id, title, created_at, updated_at, node_count) VALUES ('default', 'CloudCanvas 協作主畫布', 1787159110791, 1787159110791, 4);

INSERT OR REPLACE INTO nodes (id, board_id, type, x, y, width, height, rotation, z_index, fill_color, stroke_color, stroke_width, opacity, border_radius, shadow, text, font_size, font_family, font_weight, text_align, text_color, image_url, r2_key, r2_bucket, file_size, mime_type, aspect_ratio, created_by, created_at, last_edited_by, last_edited_at, is_locked, is_hidden) VALUES ('node-welcome-rect', 'default', 'rectangle', -43, 140, 433, 224, 0, 1, '#1e1b4b', '#6366f1', 2, 0.95, 16, 1, '🚀 CloudCanvas 歡迎！

- Figma 級無限平移與縮放
- Cloudflare D1 實時資料庫存檔
- Cloudflare R2 拖曳圖片儲存
- 多人即時同步與動態游標', 16, 'sans', 'normal', 'left', '#e0e7ff', '', '', '', 0, '', 1, '{"id":"user_owner","name":"Kevin (Owner)","email":"kevin820422@gmail.com","avatar":"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80","color":"#6366f1"}', 1787155599580, '{}', 1787158983775, 0, 0);
INSERT OR REPLACE INTO nodes (id, board_id, type, x, y, width, height, rotation, z_index, fill_color, stroke_color, stroke_width, opacity, border_radius, shadow, text, font_size, font_family, font_weight, text_align, text_color, image_url, r2_key, r2_bucket, file_size, mime_type, aspect_ratio, created_by, created_at, last_edited_by, last_edited_at, is_locked, is_hidden) VALUES ('node-sticky-idea', 'default', 'sticky', 500, 90, 220, 210, -2, 2, '#fef08a', '#facc15', 1, 1, 4, 1, '💡 提示：
拖曳任何圖片至畫布
立即自動上傳至 R2！

重整網頁後原封不動 ✨', 16, 'handwriting', 'normal', 'left', '#854d0e', '', '', '', 0, '', 1, '{"id":"user_alex","name":"Alex Design","email":"alex@design.co","avatar":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80","color":"#ec4899"}', 1787155619580, '{}', 1787159110791, 0, 0);
INSERT OR REPLACE INTO nodes (id, board_id, type, x, y, width, height, rotation, z_index, fill_color, stroke_color, stroke_width, opacity, border_radius, shadow, text, font_size, font_family, font_weight, text_align, text_color, image_url, r2_key, r2_bucket, file_size, mime_type, aspect_ratio, created_by, created_at, last_edited_by, last_edited_at, is_locked, is_hidden) VALUES ('node-arch-circle', 'default', 'circle', 180, 350, 180, 180, 0, 3, '#0f172a', '#38bdf8', 2, 0.9, 999, 1, 'Cloudflare D1
(SQLite at Edge)', 15, 'mono', 'bold', 'center', '#38bdf8', '', '', '', 0, '', 1, '{"id":"user_owner","name":"Kevin (Owner)","email":"kevin820422@gmail.com","avatar":"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80","color":"#6366f1"}', 1787155639580, '{}', 1787158365590, 0, 0);
INSERT OR REPLACE INTO nodes (id, board_id, type, x, y, width, height, rotation, z_index, fill_color, stroke_color, stroke_width, opacity, border_radius, shadow, text, font_size, font_family, font_weight, text_align, text_color, image_url, r2_key, r2_bucket, file_size, mime_type, aspect_ratio, created_by, created_at, last_edited_by, last_edited_at, is_locked, is_hidden) VALUES ('node-r2-card', 'default', 'rectangle', 420, 360, 280, 160, 0, 4, '#18181b', '#f97316', 2, 0.95, 12, 1, '📦 Cloudflare R2
S3 相容物件存儲
支援圖片快速讀取與快取', 15, 'sans', '500', 'center', '#fdba74', '', '', '', 0, '', 1, '{"id":"user_owner","name":"Kevin (Owner)","email":"kevin820422@gmail.com","avatar":"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80","color":"#6366f1"}', 1787155659580, '{}', 1787159110791, 0, 0);