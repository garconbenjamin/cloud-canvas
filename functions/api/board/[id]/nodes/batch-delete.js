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
    const nodeIds = body.nodeIds;

    if (!Array.isArray(nodeIds)) {
      return new Response(JSON.stringify({ error: 'nodeIds must be an array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const stmts = nodeIds.map((nodeId) =>
      env.DB.prepare('DELETE FROM nodes WHERE id = ? AND board_id = ?').bind(nodeId, boardId),
    );

    await env.DB.batch(stmts);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
