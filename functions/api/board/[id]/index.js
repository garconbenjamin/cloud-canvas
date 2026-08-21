export async function onRequest(context) {
  const { env, params, request } = context;
  const boardId = params.id;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (request.method === 'GET') {
    const board = await env.DB.prepare('SELECT * FROM boards WHERE id = ?').bind(boardId).first();
    if (!board) return new Response(JSON.stringify({ success: false, error: 'Board not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    return new Response(JSON.stringify({ success: true, board: mapBoard(board) }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }

  if (request.method === 'PATCH') {
    const { ownerId, title } = await request.json();
    const board = await env.DB.prepare('SELECT * FROM boards WHERE id = ?').bind(boardId).first();
    if (!board || board.owner_id !== ownerId) return new Response(JSON.stringify({ success: false, error: 'Only the board owner can rename it' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    await env.DB.prepare('UPDATE boards SET title = ?, updated_at = ? WHERE id = ?').bind(String(title || '').trim() || board.title, Date.now(), boardId).run();
    const updated = await env.DB.prepare('SELECT * FROM boards WHERE id = ?').bind(boardId).first();
    return new Response(JSON.stringify({ success: true, board: mapBoard(updated) }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}

function mapBoard(row) {
  return {
    id: row.id,
    title: row.title,
    ownerId: row.owner_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    nodeCount: row.node_count || 0,
  };
}
