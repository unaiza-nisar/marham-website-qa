// Technical SEO checks that matter for the 27 Nov cutover. HTTP only.
const { test, expect } = require('@playwright/test');
const { canonical } = require('./html');

const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended'];

test('robots.txt is served and lists a sitemap', async ({ request }, info) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body.toLowerCase()).toContain('sitemap:');
  expect(body, 'robots.txt must not block the whole site').not.toMatch(/User-agent:\s*\*\s*\n\s*Disallow:\s*\/\s*(\n|$)/i);
  const missing = AI_BOTS.filter(b => !body.includes(b));
  info.annotations.push({ type: 'ai_bots_not_named', description: missing.join(', ') || 'none' });
});

test('robots.txt names the AI assistants (soft check)', async ({ request }) => {
  const body = await (await request.get('/robots.txt')).text();
  const missing = AI_BOTS.filter(b => !body.includes(b));
  expect.soft(missing, 'AI crawlers not named in robots.txt').toEqual([]);
});

test('sitemap index and every child sitemap load as XML', async ({ request }, info) => {
  const robots = await (await request.get('/robots.txt')).text();
  const listed = [...robots.matchAll(/^sitemap:\s*(\S+)/gim)].map(m => m[1]);
  const index = listed[0] || 'https://www.marham.pk/sitemap.xml';
  const res = await request.get(index);
  expect(res.status(), `status of ${index}`).toBe(200);
  const xml = await res.text();
  const children = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
  const isIndex = /<sitemapindex/i.test(xml);
  info.annotations.push({ type: 'sitemap', description: `${index} (${isIndex ? 'index' : 'urlset'}, ${children.length} entries)` });
  if (!isIndex) return;
  const broken = [];
  const lastmods = new Set();
  for (const child of children) {
    const r = await request.get(child);
    const body = await r.text();
    const ok = r.status() === 200 && /<urlset|<sitemapindex/i.test(body);
    if (!ok) broken.push(`${child} → ${r.status()}`);
    for (const m of body.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) lastmods.add(m[1].slice(0, 10));
  }
  info.annotations.push({ type: 'broken_sitemaps', description: broken.join(' | ') || 'none' });
  info.annotations.push({ type: 'distinct_lastmod_days', description: String(lastmods.size) });
  expect(broken, 'child sitemaps that fail').toEqual([]);
  expect.soft(lastmods.size, 'lastmod should reflect real change dates, not always today').toBeGreaterThan(1);
});

// An upper-case address must not become a second copy of the page.
// Pass: 301/308 to the lower-case address (best), or 404 (fine: Google sees no duplicate).
// Fail: 200 without a lower-case canonical (a duplicate page), a temporary redirect (302/307),
// a redirect somewhere else, or a server error.
test('upper-case URLs do not create duplicate pages', async ({ request }, info) => {
  const res = await request.get('/doctors/Lahore/Dermatologist', { maxRedirects: 0 });
  const status = res.status();
  const loc = res.headers()['location'] || '';
  info.annotations.push({ type: 'status', description: loc ? `${status} -> ${loc}` : String(status) });
  if (status === 404) {
    info.annotations.push({ type: 'note', description: '404: no duplicate page. A 301 to the lower-case address would be slightly better (keeps any links).' });
    return;
  }
  if (status === 200) {
    const canon = canonical(await res.text()) || '';
    info.annotations.push({ type: 'canonical', description: canon || 'none' });
    expect(new URL(canon || '/', 'https://www.marham.pk').pathname, 'a 200 upper-case page must point its canonical at the lower-case address')
      .toBe('/doctors/lahore/dermatologist');
    return;
  }
  expect([301, 308], 'a redirect must be permanent (301/308)').toContain(status);
  expect(loc, 'redirect goes to the lower-case address').toMatch(/\/doctors\/lahore\/dermatologist\/?$/);
});

test('new listing pages can be cached by the CDN', async ({ request }, info) => {
  const res = await request.get('/doctors/lahore/pediatrician');
  const cc = res.headers()['cache-control'] || '';
  info.annotations.push({ type: 'cache-control', description: cc });
  expect.soft(cc, 'cache-control should not be private on public listing pages').not.toContain('private');
});

test('http and non-www redirect to https://www in one hop', async ({ request }, info) => {
  for (const start of ['http://www.marham.pk/', 'https://marham.pk/']) {
    const res = await request.get(start, { maxRedirects: 0 });
    const loc = res.headers()['location'] || '';
    info.annotations.push({ type: start, description: `${res.status()} → ${loc}` });
    expect([301, 308]).toContain(res.status());
    expect(loc).toMatch(/^https:\/\/www\.marham\.pk\//);
  }
});
