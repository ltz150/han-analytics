export const sites = (env) => (env.CLOUDFLARE_WEBSITE_WHITELIST || '')
  .split('|').map(entry => entry.split(',').map(value => value.trim()))
  .filter(([host, id]) => host && id);
export function headers(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = origin && sites(env).some(([host]) => origin === 'https://' + host);
  return {
    ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store', Vary: 'Origin',
  };
}
export const validSite = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id);
