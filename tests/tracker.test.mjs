import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const code = readFileSync(new URL('../public/tracker.js', import.meta.url), 'utf8');
function browser({ blockedStorage = false, host = 'blog.litianzeng.cn' } = {}) {
  const requests = [], events = {}, values = new Map();
  const attrs = { 'data-website-id': 'LTZ-Blog', 'data-host': 'blog.litianzeng.cn' };
  const document = {
    currentScript: { src: 'https://analytics.litianzeng.cn/tracker.js', getAttribute: key => attrs[key] },
    referrer: 'https://example.org/search?private=value',
    addEventListener: (name, fn) => { (events[name] ||= []).push(fn); },
  };
  const storage = {
    getItem: key => { if (blockedStorage) throw Error('denied'); return values.get(key) ?? null; },
    setItem: (key, value) => { if (blockedStorage) throw Error('denied'); values.set(key, String(value)); },
    removeItem: key => values.delete(key),
  };
  const window = { document, navigator: { userAgent: 'Mozilla/5.0 Chrome' }, location: { hostname: host, pathname: '/' }, localStorage: storage };
  const context = { window, document, navigator: window.navigator, location: window.location, localStorage: storage, URL, Date, JSON, fetch: async (url, options) => { requests.push({ url, data: JSON.parse(options.body) }); return { ok: true }; } };
  vm.runInNewContext(code, context);
  return { window, requests, runAgain: () => vm.runInNewContext(code, context), emit: name => (events[name] || []).forEach(fn => fn()) };
}
test('reports each Swup page navigation exactly once', () => {
  const b = browser();
  assert.equal(b.requests.length, 1);
  b.emit('swup:page:view');
  assert.equal(b.requests.length, 1);
  b.window.location.pathname = '/article/test';
  b.emit('swup:page:view');
  assert.equal(b.requests.length, 2);
  assert.equal(b.requests[1].data.path, '/article/test');
  b.emit('swup:page:view');
  assert.equal(b.requests.length, 2);
  b.window.location.pathname = '/';
  b.emit('swup:page:view');
  assert.equal(b.requests.length, 3);
  assert.equal(b.requests[2].data.visit, false);
});
test('still records a page when localStorage is blocked', () => {
  const b = browser({ blockedStorage: true });
  assert.equal(b.requests.length, 1);
});
test('never records development or preview domains', () => {
  assert.equal(browser({ host: 'localhost' }).requests.length, 0);
});
test('strips private query strings from referring URLs', () => {
  assert.equal(browser().requests[0].data.referrer, 'https://example.org');
});
test('reloading the tracker does not double record or register listeners', () => {
  const b = browser(); b.runAgain();
  assert.equal(b.requests.length, 1);
  b.window.location.pathname = '/article/test'; b.emit('swup:page:view');
  assert.equal(b.requests.length, 2);
});
