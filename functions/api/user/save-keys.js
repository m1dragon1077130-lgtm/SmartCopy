export async function onRequest(context) {
  const { env, request } = context;
  
  const cookies = request.headers.get('Cookie') || '';
  const sessionMatch = cookies.match(/session=([^;]+)/);
  if (!sessionMatch) return json({ error: 'Not logged in' }, 401);
  
  let sessionData;
  try { sessionData = JSON.parse(atob(sessionMatch[1])); } catch { return json({ error: 'Invalid session' }, 401); }
  
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  
  const { api_key, api_secret } = body;
  if (!api_key || !api_secret) return json({ error: 'API Key و Secret الزامی هستن' }, 400);
  
  try {
    const dbUrl = env.SUPABASE_URL;
    const dbKey = env.SUPABASE_SERVICE_KEY;
    
    // چک میکنیم کاربر قبلا کلید ثبت کرده یا نه
    const checkUrl = `${dbUrl}/rest/v1/copy_traders?user_id=eq.${sessionData.github_id}`;
    const checkRes = await fetch(checkUrl, {
      headers: { 'apikey': dbKey, 'Authorization': `Bearer ${dbKey}` }
    });
    const existing = await checkRes.json();
    
    let dbRes;
    if (existing.length > 0) {
      dbRes = await fetch(`${dbUrl}/rest/v1/copy_traders?user_id=eq.${sessionData.github_id}`, {
        method: 'PATCH',
        headers: { 'apikey': dbKey, 'Authorization': `Bearer ${dbKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ api_key, api_secret, is_active: true })
      });
    } else {
      dbRes = await fetch(`${dbUrl}/rest/v1/copy_traders`, {
        method: 'POST',
        headers: { 'apikey': dbKey, 'Authorization': `Bearer ${dbKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ user_id: sessionData.github_id, api_key, api_secret, is_active: true })
      });
    }
    
    // 👇 اینجا چک میکنیم که آیا دیتابیس خطا داده یا نه
    if (!dbRes.ok) {
      const errText = await dbRes.text();
      return json({ error: `خطای دیتابیس: ${dbRes.status} - ${errText}` }, 500);
    }

    const resultData = await dbRes.json();
    return json({ ok: true, message: 'کلیدها ذخیره شدند.', data: resultData });
    
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
