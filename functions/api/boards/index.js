export async function onRequest(context) {
  const { env, request } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const ownerId = url.searchParams.get('ownerId') || '';
    const result = await env.DB.prepare(
      'SELECT id, title, owner_id, created_at, updated_at, node_count FROM boards WHERE owner_id = ? ORDER BY updated_at DESC',
    )
      .bind(ownerId)
      .all();
    const boards = (result.results || []).map((board) => ({
      id: board.id,
      title: board.title,
      ownerId: board.owner_id || '',
      createdAt: board.created_at,
      updatedAt: board.updated_at,
      nodeCount: board.node_count || 0,
    }));
    return new Response(JSON.stringify({ success: true, boards }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (request.method !== 'POST')
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  const { id, ownerId, title } = await request.json();
  if (!id || !ownerId)
    return new Response(JSON.stringify({ success: false, error: 'id and ownerId are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  try {
    await env.DB.prepare("ALTER TABLE boards ADD COLUMN owner_id TEXT NOT NULL DEFAULT ''").run();
  } catch {
    // Column already exists on databases initialized with the latest schema.
  }
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO boards (id, title, owner_id, created_at, updated_at, node_count) VALUES (?, ?, ?, ?, ?, 0)',
  )
    .bind(id, title || '未命名畫布', ownerId, now, now)
    .run();
  const board = await env.DB.prepare('SELECT * FROM boards WHERE id = ?').bind(id).first();
  return new Response(
    JSON.stringify({
      success: true,
      board: {
        id: board.id,
        title: board.title,
        ownerId: board.owner_id,
        createdAt: board.created_at,
        updatedAt: board.updated_at,
        nodeCount: 0,
      },
    }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
  );
}
