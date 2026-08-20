export async function onRequest(context) {
  const { env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const { results: nodeResults } = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM nodes'
  ).first() || { results: [{ count: 0 }] };

  const { results: assetResults } = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM assets'
  ).first() || { results: [{ count: 0 }] };

  return new Response(JSON.stringify({
    d1Connected: true,
    d1DatabaseName: 'canvas-d1-prod',
    d1NodeCount: nodeResults?.[0]?.count || 0,
    r2Configured: true,
    r2BucketName: 'canvas-assets',
    googleOAuthConfigured: Boolean(env.GOOGLE_CLIENT_ID),
    totalAssets: assetResults?.[0]?.count || 0,
    serverTime: new Date().toISOString(),
    activePeersCount: 0,
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}