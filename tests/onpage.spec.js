// On-page SEO checks for the key pages (playbook section 11.4). HTTP only, no browser.
// Each rule is a soft check, so one page can report several problems in one run.
const { test, expect } = require('@playwright/test');
const { KEY_PAGES } = require('./urls');
const { title, decodeEntities } = require('./html');

const MAX_HTML_KB = 600;

function metaDescription(html) {
  const m = html.match(/<meta[^>]+name=["']description["'][^>]*>/i);
  if (!m) return '';
  const c = m[0].match(/content=["']([^"']*)["']/i);
  return c ? decodeEntities(c[1]).replace(/\s+/g, ' ').trim() : '';
}

// A title whose words have run together ("BestGynecologistsinPakistan2026"):
// the part before the first "|" is long but has no space in it.
function wordsRunTogether(t) {
  const first = t.split('|')[0].trim();
  return first.length > 15 && !/\s/.test(first);
}

for (const path of KEY_PAGES) {
  test(`on-page SEO: ${path}`, async ({ request }, info) => {
    const res = await request.get(path, { maxRedirects: 5 });
    const html = await res.text();
    const t = title(html);
    const desc = metaDescription(html);
    const h1s = (html.match(/<h1[\s>]/gi) || []).length;
    const kb = Math.round(Buffer.byteLength(html) / 1024);
    const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
    const badLd = ld.filter(s => { try { JSON.parse(s); return false; } catch { return true; } }).length;
    const body = html.replace(/<script[\s\S]*?<\/script>/gi, '');

    info.annotations.push(
      { type: 'title', description: t },
      { type: 'title_chars', description: String(t.length) },
      { type: 'description_chars', description: String(desc.length) },
      { type: 'h1_count', description: String(h1s) },
      { type: 'html_kb', description: String(kb) },
      { type: 'jsonld_blocks', description: String(ld.length) },
    );

    expect(res.status(), 'HTTP 200').toBe(200);
    expect.soft(wordsRunTogether(t), `title words run together: "${t}"`).toBe(false);
    expect.soft(t.length, 'title 30-65 characters').toBeGreaterThanOrEqual(30);
    expect.soft(t.length, 'title 30-65 characters').toBeLessThanOrEqual(65);
    expect.soft(desc.length, 'meta description 70-160 characters').toBeGreaterThanOrEqual(70);
    expect.soft(desc.length, 'meta description 70-160 characters').toBeLessThanOrEqual(160);
    expect.soft(h1s, 'exactly one H1').toBe(1);
    expect.soft(badLd, 'every JSON-LD block parses').toBe(0);
    expect.soft(/\{\{[^}]*\}\}/.test(body) || /\{\{[^}]*\}\}/.test(t), 'no unfilled {{placeholders}}').toBe(false);
    expect.soft(kb, `HTML under ${MAX_HTML_KB} KB`).toBeLessThanOrEqual(MAX_HTML_KB);
  });
}
