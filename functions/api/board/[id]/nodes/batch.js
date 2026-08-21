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
    const body = await request.json();
    const nodes = body.nodes;

    if (!Array.isArray(nodes)) {
      return new Response(JSON.stringify({ error: 'nodes must be an array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const stmts = nodes.map((node) =>
      env.DB.prepare(
        `INSERT OR REPLACE INTO nodes (
          id, board_id, type, x, y, width, height, rotation, z_index,
          fill_color, stroke_color, stroke_width, opacity, border_radius,
          shadow, text, font_size, font_family, font_weight, text_align,
          text_color, image_url, r2_key, r2_bucket, file_size, mime_type,
          aspect_ratio, created_by, created_at, last_edited_by, last_edited_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
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
      ),
    );

    await env.DB.batch(stmts);

    return new Response(JSON.stringify({ success: true, nodes }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
