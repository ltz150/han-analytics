((window) => {
  const { document, location } = window;
  const script = document.currentScript;
  if (!script || window.__ltzHanAnalytics) return;
  const website = script.getAttribute('data-website-id');
  const allowedHost = script.getAttribute('data-host');
  if (!website || (allowedHost && allowedHost !== location.hostname)) return;
  window.__ltzHanAnalytics = true;
  const endpoint = new URL(script.src).origin + '/send';
  const memory = {};
  const read = key => { try { return window.localStorage.getItem(key) ?? memory[key]; } catch { return memory[key]; } };
  const write = (key, value) => { memory[key] = String(value); try { window.localStorage.setItem(key, value); } catch { /* private browsing */ } };
  let lastPath;
  const track = () => {
    const path = location.pathname;
    if (lastPath === path) return;
    lastPath = path;
    const now = Date.now();
    const date = new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
    const key = '_ltzHan:' + website;
    let visits = {};
    try { visits = JSON.parse(read(key + ':pages') || '{}'); } catch { /* malformed cache */ }
    if (!visits || typeof visits !== 'object' || Array.isArray(visits)) visits = {};
    const visitor = read(key + ':day') !== date;
    const visit = now - Number(visits[path] || 0) >= 30 * 60 * 1000;
    if (visitor) write(key + ':day', date);
    if (visit) visits[path] = now;
    for (const item of Object.keys(visits)) if (now - Number(visits[item]) > 86400000) delete visits[item];
    write(key + ':pages', JSON.stringify(visits));
    let referrer = '';
    try {
      const source = new URL(document.referrer);
      if (source.hostname !== location.hostname && ['https:', 'http:'].includes(source.protocol)) referrer = source.origin;
    } catch { /* direct visit */ }
    fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ website, host: location.hostname, path, referrer, visitor, visit }),
    }).catch(() => {});
  };
  document.addEventListener('swup:page:view', track);
  track();
})(window);
