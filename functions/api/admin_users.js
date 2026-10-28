export async function onRequest(context) {
  const { env, request } = context;
  
  // ۱. چک کردن لاگین بودن کاربر (فقط ادمین اصلی)
  const cookies = request.headers.get('Cookie') || '';
  const sessionMatch = cookies.match(/session=([^;]+)/);
  if (!sessionMatch) return json({ error: 'Not logged in' }, 401);
  
  let sessionData;
  try { sessionData = JSON.parse(atob(sessionMatch[1])); } catch { return json({ error: 'Invalid session' }, 401); }
  
  // 🌟 فقط ادمین اصلی (خودت) اجازه دیدن این پنل رو داره. آیدی گیت‌هاب خودت رو اینجا بذار.
  // (آیدی گیت‌هاب خودت رو از پروفایلت یا دیتابیس بردار)
  const ADMIN_GITHUB_ID = "337279589"; // آیدی خودت رو اینجا بذار
  
  if (sessionData.github_id !== ADMIN_GITHUB_ID) {
    return json({ error: 'Access denied. Admin only.' }, 403);
  }
  
  try {
    // ۲. گرفتن لیست کاربران از دیتابیس
    const dbUrl = env.SUPABASE_URL;
    const dbKey = env.SUPABASE_SERVICE_KEY;
    
    const res = await fetch(`${dbUrl}/rest/v1/copy_traders?is_active=eq.true&select=*`, {
      headers: { 'apikey': dbKey, 'Authorization': `Bearer ${dbKey}` }
    });
    const users = await res.json();
    
    // ۳. برای هر کاربر، اطلاعات حسابش رو از صرافی می‌گیریم
    const results = [];
    
    for (const user of users) {
      try {
        // گرفتن موجودی
        const timestamp = Date.now().toString();
        const uri = "/futures/assets";
        const payload = `${timestamp}GET${uri}`;
        
        // نکته: ساختن امضای HMAC در جاوااسکریپت برای کلودفلر کمی پیچیده است، 
        // بنابراین ما از یک ترفند استفاده می‌کنیم: این درخواست‌ها رو از سمت خود Worker به صرافی می‌فرستیم.
        // (اگر Worker نتونه امضا بسازه، باید این بخش رو در گیت‌هاب اجرا کنیم. اما فعلاً این روش رو تست می‌کنیم)
        
        // 🌟 به دلیل پیچیدگی امضای HMAC در Cloudflare، بهتره این کار رو در گیت‌هاب انجام بدیم.
        // فعلاً فقط اطلاعات پایه دیتابیس رو برمی‌گردونیم.
        
        results.push({
          id: user.id,
          user_id: user.user_id,
          api_key: user.api_key,
          is_active: user.is_active,
          created_at: user.created_at
        });
        
      } catch (err) {
        results.push({ error: err.message, user_id: user.user_id });
      }
    }
    
    return json({ ok: true, users: results });
    
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
