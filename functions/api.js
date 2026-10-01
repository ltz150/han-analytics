import { vh_INIT } from './utils/init.js';
import { headers, sites, validSite } from './utils/http.js';
export async function onRequest({ request, env }) {
  const cors = headers(request, env);
  const json = (data, status = 200) => Response.json(data, { status, headers: cors });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405);
  let body;
  try { body = await request.json(); } catch { return json({ success: false, message: 'Invalid JSON' }, 400); }
  if (!body || typeof body !== 'object') return json({ success: false, message: 'Invalid body' }, 400);
  let { time, siteID, type, session } = body;
  if (env.CLOUDFLARE_WEBSITE_PWD) {
    if (session !== env.CLOUDFLARE_WEBSITE_PWD) return json({ success: false, code: 401, message: '密码校验失败' }, 401);
    if (type === 'Login') return json({ success: true });
  }
  if (!['visit', 'list', 'path', 'referrer', 'os', 'soft', 'area', 'echarts'].includes(type)) return json({ success: false, message: 'Invalid type' }, 400);
  if (type !== 'list') {
    if (!validSite(siteID)) return json({ success: false, message: 'Invalid site ID' }, 400);
    if (!sites(env).some(([, id]) => id === siteID)) return json({ success: false, message: 'Site not allowed' }, 403);
  }
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) return json({ success: false, message: '统计服务尚未配置读取凭据' }, 503);
  if (!['today', '1d', '7d', '30d', '60d', '90d'].includes(time)) time = 'today';
  try {
    const data = await vh_INIT(env, time, siteID, 'Asia/Shanghai', type);
    return json({ success: true, data });
  } catch { return json({ success: false, message: '统计查询暂不可用，请稍后重试' }, 503); }
}
