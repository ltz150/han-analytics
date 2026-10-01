import { UAParser } from 'ua-parser-js';
import { sites, headers, validSite } from './utils/http.js';
export async function onRequest({ request, env }) {
  const cors = headers(request, env);
  const json = (data, status = 200) => Response.json(data, { status, headers: cors });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405);
  let data;
  try { data = await request.json(); } catch { return json({ success: false, message: 'Invalid JSON' }, 400); }
  if (!data || !validSite(data.website) || typeof data.host !== 'string') return json({ success: false, message: 'Invalid site' }, 400);
  const { host, website, visitor, visit } = data;
  if (!sites(env).some(([domain, id]) => domain === host && id === website)) return json({ success: false, message: 'Site not allowed' }, 403);
  if (request.headers.get('Origin') !== 'https://' + host) return json({ success: false, message: 'Origin not allowed' }, 403);
  if (!env.AnalyticsBinding) return json({ success: false, message: 'Analytics binding not configured' }, 503);
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 512);
  const { browser, os } = new UAParser(userAgent).getResult();
  let path = '/', referrer = '';
  try {
    const page = new URL(data.path || '/', 'https://' + host);
    if (page.hostname !== host) return json({ success: false, message: 'Invalid page' }, 400);
    path = page.pathname.slice(0, 2048);
    if (data.referrer) {
      const source = new URL(data.referrer);
      if (['https:', 'http:'].includes(source.protocol) && source.hostname !== host) referrer = source.origin;
    }
  } catch { return json({ success: false, message: 'Invalid URL' }, 400); }
  try {
    env.AnalyticsBinding.writeDataPoint({
      indexes: [website],
      blobs: [website, host, path, referrer, os.name || 'Unknown', browser.name === 'Chrome WebView' ? 'Chrome' : (browser.name || 'Unknown'), request.cf?.country || 'Unknown', userAgent],
      doubles: [visitor === true ? 1 : 0, visit === true ? 1 : 0],
    });
    return json({ success: true });
  } catch { return json({ success: false, message: 'Analytics unavailable' }, 503); }
}
