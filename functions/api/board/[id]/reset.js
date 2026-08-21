export async function onRequest(context) {
  const { env, params, request } = context;
  const boardId = params.id || 'default';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method === 'POST') {
    // Delete all nodes for this board
    await env.DB.prepare('DELETE FROM nodes WHERE board_id = ?').bind(boardId).run();

    // New/reset canvases are intentionally empty.
    const defaultNodes = [];
    /* const legacyDefaultNodes = [
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
        createdBy: { id: 'user_owner', name: 'Kevin (Owner)', email: 'kevin820422@gmail.com', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', color: '#6366f1' },
        createdAt: Date.now() - 100000,
      },
    ];

    const stmts = defaultNodes.map((node) =>
      env.DB.prepare(
        `INSERT OR REPLACE INTO nodes (
          id, board_id, type, x, y, width, height, rotation, z_index,
          fill_color, stroke_color, stroke_width, opacity, border_radius,
          shadow, text, font_size, font_family, font_weight, text_align,
          text_color, image_url, r2_key, r2_bucket, file_size, mime_type,
          aspect_ratio, created_by, created_at, last_edited_by, last_edited_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        node.id, boardId, node.type, node.x, node.y, node.width, node.height,
        node.rotation || 0, node.zIndex || 1, node.fillColor || '', node.strokeColor || '',
        node.strokeWidth || 1, node.opacity ?? 1, node.borderRadius || 0,
        node.shadow ? 1 : 0, node.text || '', node.fontSize || 16, node.fontFamily || 'sans',
        node.fontWeight || 'normal', node.textAlign || 'left', node.textColor || '',
        node.imageUrl || '', node.r2Key || '', node.r2Bucket || '', node.fileSize || 0,
        node.mimeType || '', node.aspectRatio || 1,
        JSON.stringify(node.createdBy || {}), node.createdAt || Date.now(),
        JSON.stringify(node.lastEditedBy || {}), Date.now()
      )
    );

    await env.DB.batch(stmts); */

    return new Response(JSON.stringify({ success: true, nodes: defaultNodes }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
