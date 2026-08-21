export async function onRequest(context) {
  const { env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const nodeResult = await env.DB.prepare('SELECT COUNT(*) as count FROM nodes').first();

  const assetResult = await env.DB.prepare('SELECT COUNT(*) as count FROM assets').first();

  return new Response(
    JSON.stringify({
      d1Connected: true,
      d1DatabaseName: 'canvas-d1-prod',
      d1NodeCount: nodeResult?.count || 0,
      r2Configured: true,
      r2BucketName: 'canvas-assets',
      googleOAuthConfigured: Boolean(env.GOOGLE_CLIENT_ID),
      googleClientId: env.GOOGLE_CLIENT_ID || '',
      totalAssets: assetResult?.count || 0,
      serverTime: new Date().toISOString(),
      activePeersCount: 0,
    }),
    {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    },
  );
}
