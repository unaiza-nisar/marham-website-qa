// Every key page, 50/50 profile and test profile: loads, is indexable, has the right canonical.
// HTTP only (no browser), so it is fast and never runs page scripts or tracking.
const { test, expect } = require('@playwright/test');
const { KEY_PAGES, AB_PROFILES, TEST_PROFILES, EXPECT_NEW_STACK } = require('./urls');
const { metaRobots, canonical, title, isNewStack, visibleTextLength } = require('./html');

const ALL = [...new Set([...KEY_PAGES, ...AB_PROFILES])];

for (const path of ALL) {
  test(`page loads and is indexable: ${path}`, async ({ request }, info) => {
    const started = Date.now();
    const res = await request.get(path, { maxRedirects: 5 });
    const ms = Date.now() - started;
    const html = await res.text();
    info.annotations.push(
      { type: 'status', description: String(res.status()) },
      { type: 'ms', description: String(ms) },
      { type: 'stack', description: isNewStack(html) ? 'next' : 'legacy' },
      { type: 'text_chars', description: String(visibleTextLength(html)) },
      { type: 'final_url', description: res.url() },
    );

    expect(res.status(), `HTTP status for ${path}`).toBe(200);
    expect(title(html).length, 'page has a <title>').toBeGreaterThan(10);
    expect(metaRobots(html), 'live page must not be noindex').not.toContain('noindex');

    const canon = canonical(html);
    expect(canon, 'page has a canonical link').toBeTruthy();
    const u = new URL(canon, 'https://www.marham.pk');
    expect(u.hostname, 'canonical points to www.marham.pk').toBe('www.marham.pk');
    expect(u.pathname, 'canonical is lower-case').toBe(u.pathname.toLowerCase());

    if (EXPECT_NEW_STACK.includes(path)) {
      expect(isNewStack(html), `${path} should be served by the new site`).toBe(true);
    }
    expect(ms, 'response under 8 s').toBeLessThan(8000);
  });
}

for (const path of TEST_PROFILES) {
  test(`test profile is reachable: ${path}`, async ({ request }, info) => {
    const res = await request.get(path);
    info.annotations.push({ type: 'status', description: String(res.status()) });
    expect(res.status()).toBe(200);
  });
}
