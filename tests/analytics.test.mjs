import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest as send } from '../functions/send.js';
import { onRequest as api } from '../functions/api.js';
import { formatTime } from '../functions/utils/index.js';

const envBase = { CLOUDFLARE_WEBSITE_WHITELIST: 'blog.litianzeng.cn,LTZ-Blog', CLOUDFLARE_ACCOUNT_ID: 'account', CLOUDFLARE_API_TOKEN: 'test-only' };
function context(body, method = 'POST') {
  const points = [];
  const request = new Request('https://analytics.litianzeng.cn/send', { method, headers: { Origin: 'https://blog.litianzeng.cn', 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });
  request.cf = { country: 'CN', timezone: 'Asia/Shanghai' };
  return { request, env: { ...envBase, AnalyticsBinding: { writeDataPoint: point => points.push(point) } }, points };
}
test('CORS preflight succeeds without trying to write a point', async () => {
  const c = context(null, 'OPTIONS'), res = await send(c);
  assert.equal(res.status, 204);
  assert.equal(c.points.length, 0);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://blog.litianzeng.cn');
});
test('valid production visit writes one point', async () => {
  const c = context({ host: 'blog.litianzeng.cn', website: 'LTZ-Blog', path: '/article/test', referrer: '', visitor: true, visit: true });
  assert.equal((await send(c)).status, 200);
  assert.equal(c.points.length, 1);
  assert.equal(c.points[0].blobs[0], 'LTZ-Blog');
});
test('partial domain or partial site ID cannot bypass the whitelist', async () => {
  for (const [host, website] of [['litianzeng.cn', 'LTZ'], ['blog.litianzeng.cn.evil.example', 'LTZ-Blog']]) {
    const c = context({ host, website });
    assert.equal((await send(c)).status, 403);
    assert.equal(c.points.length, 0);
  }
});
test('SQL injection and unapproved site IDs never reach Cloudflare SQL', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0; globalThis.fetch = async () => { calls++; return Response.json({ data: [] }); };
  try {
    for (const siteID of ["x' OR '1'='1", 'other-site']) {
      const res = await api(context({ type: 'visit', siteID, time: 'today' }));
      assert.ok(res.status === 400 || res.status === 403);
    }
    assert.equal(calls, 0);
  } finally { globalThis.fetch = originalFetch; }
});
test('empty analytics datasets display zero counters', async () => {
  const originalFetch = globalThis.fetch; globalThis.fetch = async () => Response.json({ data: [] });
  try {
    const res = await api(context({ type: 'visit', siteID: 'LTZ-Blog', time: 'today' }));
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).data, { visitor: 0, visit: 0, views: 0 });
  } finally { globalThis.fetch = originalFetch; }
});
test('today starts at midnight in Shanghai, including the current partial hour', () => {
  const localDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const midnight = new Date(localDay + 'T00:00:00+08:00').toISOString().slice(0, 19).replace('T', ' ');
  assert.ok(formatTime('today', 'Asia/Shanghai').includes(midnight));
});
