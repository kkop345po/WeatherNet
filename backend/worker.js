export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    const allowed = ['https://kkop345po.github.io', 'http://localhost:4200'];
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin' };
    if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const json = (body, status) => Response.json(body, { status, headers });
    if (origin && !allowed.includes(origin)) return json({error:'Origin denied'},403);
    if (new URL(request.url).pathname !== '/api/weather') return json({error:'Not found'},404);
    if (request.method !== 'GET') return json({error:'Method not allowed'},405);
    if (!env.CWA_API_KEY) return json({error:'Weather service unavailable'},503);
    const cacheKey = new Request(new URL('/api/weather', request.url).origin + '/api/weather');
    const cached = await caches.default.match(cacheKey);
    if (cached) return new Response(cached.body, { headers: {...headers, 'Cache-Control':'public, max-age=300'} });
    try {
      const url = new URL('https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-065');
      url.searchParams.set('Authorization',env.CWA_API_KEY);
      url.searchParams.set('format','JSON');
      const upstream = await fetch(url, {signal:AbortSignal.timeout(15000)});
      if (!upstream.ok) return json({error:'Weather provider unavailable'},502);
      const data = await upstream.json();
      if (!Array.isArray(data?.records?.Locations)) return json({error:'Invalid weather data'},502);
      const response = Response.json({success:data.success,records:data.records},{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=300'}});
      ctx.waitUntil(caches.default.put(cacheKey,response.clone()));
      return new Response(response.body,{headers:{...headers,'Cache-Control':'public, max-age=300'}});
    } catch { return json({error:'Weather provider unavailable'},502); }
  }
};