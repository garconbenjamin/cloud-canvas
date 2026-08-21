/**
 * Cloudflare Worker / Pages Functions API Handler
 * Handles Cloudflare D1 SQL queries, R2 uploads/downloads, and real-time syncing.
 */

export interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  GOOGLE_CLIENT_ID?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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

    if (url.pathname === '/api/config' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          d1Connected: Boolean(env.DB),
          d1DatabaseName: 'canvas-d1-prod',
          d1NodeCount: 0,
          r2Configured: Boolean(env.R2_BUCKET),
          r2BucketName: 'canvas-assets',
          googleOAuthConfigured: Boolean(env.GOOGLE_CLIENT_ID),
          googleClientId: env.GOOGLE_CLIENT_ID || '',
          totalAssets: 0,
          serverTime: new Date().toISOString(),
          activePeersCount: 0,
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    // 1. Get Board Nodes from D1
    if (url.pathname.match(/^\/api\/board\/([^\/]+)\/nodes$/) && request.method === 'GET') {
      const boardId = url.pathname.split('/')[3] || 'default';
      const { results } = await env.DB.prepare(
        'SELECT * FROM nodes WHERE board_id = ? ORDER BY z_index ASC',
      )
        .bind(boardId)
        .all();

      const parsedNodes = (results || []).map(mapNodeRow);

      return new Response(JSON.stringify({ success: true, nodes: parsedNodes }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2. Save Node to D1
    if (url.pathname.match(/^\/api\/board\/([^\/]+)\/nodes$/) && request.method === 'POST') {
      const boardId = url.pathname.split('/')[3] || 'default';
      const body = (await request.json()) as any;
      const node = body.node;

      await env.DB.prepare(
        `INSERT OR REPLACE INTO nodes (
          id, board_id, type, x, y, width, height, rotation, z_index,
          fill_color, stroke_color, stroke_width, opacity, border_radius,
          shadow, text, font_size, font_family, font_weight, text_align,
          text_color, image_url, r2_key, r2_bucket, file_size, mime_type,
          aspect_ratio, created_by, created_at, last_edited_by, last_edited_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          node.id,
          boardId,
          node.type,
          node.x,
          node.y,
          node.width,
          node.height,
          node.rotation || 0,
          node.zIndex || 1,
          node.fillColor || '',
          node.strokeColor || '',
          node.strokeWidth || 1,
          node.opacity ?? 1,
          node.borderRadius || 0,
          node.shadow ? 1 : 0,
          node.text || '',
          node.fontSize || 16,
          node.fontFamily || 'sans',
          node.fontWeight || 'normal',
          node.textAlign || 'left',
          node.textColor || '',
          node.imageUrl || '',
          node.r2Key || '',
          node.r2Bucket || '',
          node.fileSize || 0,
          node.mimeType || '',
          node.aspectRatio || 1,
          JSON.stringify(node.createdBy || {}),
          node.createdAt || Date.now(),
          JSON.stringify(node.lastEditedBy || {}),
          Date.now(),
        )
        .run();

      return new Response(JSON.stringify({ success: true, node }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 3. Upload File to Cloudflare R2
    if (url.pathname === '/api/upload' && request.method === 'POST') {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const key = `canvas-images/${Date.now()}-${crypto.randomUUID()}-${file.name}`;
      await env.R2_BUCKET.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type },
      });

      const publicUrl = `/api/storage/${encodeURIComponent(key)}`;
      return new Response(
        JSON.stringify({
          success: true,
          url: publicUrl,
          key,
          bucket: 'canvas-assets',
          size: file.size,
          mimeType: file.type,
          isR2: true,
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    // 4. Serve File from Cloudflare R2
    if (url.pathname.startsWith('/api/storage/')) {
      const key = decodeURIComponent(url.pathname.replace('/api/storage/', ''));
      const object = await env.R2_BUCKET.get(key);
      if (!object) {
        return new Response('Not found in R2', { status: 404 });
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000');
      return new Response(object.body, { headers });
    }

    return new Response(JSON.stringify({ message: 'Cloudflare Worker CloudCanvas API ready' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  },
};

function parseUser(value: unknown) {
  if (typeof value !== 'string' || !value) return undefined;
  try {
    const user = JSON.parse(value);
    return user?.id ? user : undefined;
  } catch {
    return undefined;
  }
}

function mapNodeRow(row: any) {
  return {
    id: row.id,
    type: row.type,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    rotation: row.rotation,
    zIndex: row.z_index,
    fillColor: row.fill_color,
    strokeColor: row.stroke_color,
    strokeWidth: row.stroke_width,
    opacity: row.opacity,
    borderRadius: row.border_radius,
    shadow: Boolean(row.shadow),
    text: row.text,
    fontSize: row.font_size,
    fontFamily: row.font_family,
    fontWeight: row.font_weight,
    textAlign: row.text_align,
    textColor: row.text_color,
    imageUrl: row.image_url,
    r2Key: row.r2_key,
    r2Bucket: row.r2_bucket,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    aspectRatio: row.aspect_ratio,
    startX: row.start_x,
    startY: row.start_y,
    endX: row.end_x,
    endY: row.end_y,
    createdBy: parseUser(row.created_by) || {},
    createdAt: row.created_at,
    lastEditedBy: parseUser(row.last_edited_by),
    lastEditedAt: row.last_edited_at || undefined,
    isLocked: Boolean(row.is_locked),
    isHidden: Boolean(row.is_hidden),
  };
}
