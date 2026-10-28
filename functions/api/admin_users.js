export async function onRequest(context) {
  const { env, request } = context;
  
  // ۱. چک کردن لاگین
  const cookies = request.headers.get('Cookie') || '';
  const sessionMatch = cookies.match(/session=([^;]+)/);
  if (!sessionMatch) return json({ error: 'Not logged in' }, 401);
  
  let sessionData;
  try { sessionData = JSON.parse(atob(sessionMatch[1])); } catch { return json({ error: 'Invalid session' }, 401); }
  
  // ۲. چک کردن ادمین بودن (آیدی خودت)
  const ADMIN_GITHUB_ID = "337279589"; // 👈 آیدی گیت‌هاب خودت
  if (sessionData.github_id !== ADMIN_GITHUB_ID) {
    return json({ error: 'Access denied' }, 403);
  }
  
  try {
    const dbUrl = env.SUPABASE_URL;
    const dbKey = env.SUPABASE_SERVICE_KEY;
    
    // ۳. خواندن اطلاعات از جدول آمار
    const res = await fetch(`${dbUrl}/rest/v1/admin_stats?select=*&order=updated_at.desc`, {
      headers: { 'apikey': dbKey, 'Authorization': `Bearer ${dbKey}` }
    });
    const stats = await res.json();
    
    return json({ ok: true, stats: stats });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
