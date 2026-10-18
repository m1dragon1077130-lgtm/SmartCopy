export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) return new Response('No code provided', { status: 400 });

  try {
    // ۱. گرفتن Access Token از گیت‌هاب
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: code
      })
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) return new Response('Authentication failed', { status: 401 });

    // ۲. گرفتن اطلاعات کاربر از گیت‌هاب
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${accessToken}`, 'User-Agent': 'SmartCopy' }
    });
    const userData = await userRes.json();

    // ۳. ذخیره یا آپدیت کاربر در Supabase
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_KEY;

    // چک میکنیم کاربر هست یا نه
    const checkRes = await fetch(`${supabaseUrl}/rest/v1/users?github_id=eq.${userData.id}`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const existing = await checkRes.json();

    if (existing.length === 0) {
      // اگر نبود، بساز
      await fetch(`${supabaseUrl}/rest/v1/users`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_id: userData.id.toString(),
          username: userData.login,
          avatar: userData.avatar_url,
          is_active: true 
        })
      });
    }

    // ۴. ساخت سشن (کوکی)
    const sessionData = btoa(JSON.stringify({
      github_id: userData.id.toString(),
      username: userData.login,
      gh_token: accessToken
    }));

    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/dashboard.html',
        'Set-Cookie': `session=${sessionData}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
      }
    });

  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}
