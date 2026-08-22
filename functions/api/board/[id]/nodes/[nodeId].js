export async function onRequest(context) {
  const { env, params, request } = context;
  const boardId = params.id || 'default';
  const nodeId = params.nodeId;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const board = await env.DB.prepare('SELECT id FROM boards WHERE id = ?').bind(boardId).first();
  if (!board) {
    return new Response(JSON.stringify({ success: false, error: 'Board not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (request.method === 'DELETE') {
    const { results } = await env.DB.prepare(
      'DELETE FROM nodes WHERE id = ? AND board_id = ? RETURNING id',
    )
      .bind(nodeId, boardId)
      .all();

    return new Response(JSON.stringify({ success: results.length > 0 }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
