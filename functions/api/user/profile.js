export async function onRequest(context) {
  const { env, request } = context;
  const cookies = request.headers.get('Cookie') || '';
  const sessionMatch = cookies.match(/session=([^;]+)/);

  if (!sessionMatch) return json({ error: 'Not logged in' }, 401);

  let sessionData;
  try { sessionData = JSON.parse(atob(sessionMatch[1])); } catch { return json({ error: 'Invalid session' }, 401); }

  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/users?github_id=eq.${sessionData.github_id}`, {
      headers: { 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}` }
    });
    const users = await res.json();

    if (users.length === 0) return json({ error: 'User not found' }, 404);

    return json({ ok: true, user: users[0] });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
