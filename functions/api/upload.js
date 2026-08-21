export async function onRequest(context) {
  const { env, request } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method === 'POST') {
    const formData = await request.formData();
    const file = formData.get('file');
    const userEmail = formData.get('userEmail') || 'guest';

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const key = `canvas-images/${Date.now()}-${crypto.randomUUID()}-${file.name}`;
    await env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    const publicUrl = `/api/storage/${encodeURIComponent(key)}`;

    // Record asset in D1
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await env.DB.prepare(
      `INSERT OR REPLACE INTO assets (id, key, bucket, file_name, mime_type, size, url, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        assetId,
        key,
        'canvas-assets',
        file.name,
        file.type,
        file.size,
        publicUrl,
        userEmail,
        Date.now(),
      )
      .run();

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

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
