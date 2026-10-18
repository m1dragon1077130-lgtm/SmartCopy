export async function onRequest(context) {
  const { env, request } = context;
  
  // ۱. چک کردن لاگین بودن کاربر
  const cookies = request.headers.get('Cookie') || '';
  const sessionMatch = cookies.match(/session=([^;]+)/);
  if (!sessionMatch) return json({ error: 'Not logged in' }, 401);
  
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  
  // ۲. دریافت دستور (open یا close)
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  
  const { action } = body; 
  if (!action) return json({ error: 'Action is required' }, 400);
  
  const workflowFile = action === 'open' ? 'copy_open.yml' : 'copy_close.yml';
  
  try {
    // ۳. ارسال دستور به گیت‌هاب برای اجرای ربات
    const ghRes = await fetch(`https://api.github.com/repos/m1dragon1077130-lgtm/copy-trading-bot/actions/workflows/${workflowFile}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${env.GITHUB_PAT}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SmartCopy',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ref: 'main' })
    });

    if (ghRes.status === 204) {
      return json({ ok: true, message: `عملیات کپی با موفقیت استارت خورد.` });
    } else {
      const errText = await ghRes.text();
      return json({ error: `خطای گیت‌هاب: ${ghRes.status} - ${errText}` }, 500);
    }
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
