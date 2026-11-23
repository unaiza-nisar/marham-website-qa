// Phone speed (lab) and first-screen booking checks (playbook section 11.2).
// Read-only: opens pages, never clicks Book. All analytics/ad beacons are silenced.
// Lab numbers from a GitHub runner are a trend signal, not Google's field data (CrUX).
const { test, expect } = require('@playwright/test');
const { captureAndSilenceBeacons } = require('./ga4');

// One page per updated template, plus an old-site control.
const PAGES = [
  { path: '/doctors/lahore/pediatrician', listing: true },
  { path: '/doctors/karachi/gastroenterologist', listing: true },
  { path: '/doctors/lahore/urologist', listing: true },
  { path: '/doctors/gynecologist', listing: true },
  { path: '/doctors/lahore/dermatologist', listing: true, control: true },
  { path: '/medicines', listing: false },
];

// Largest Contentful Paint and Cumulative Layout Shift from the browser's own observers.
async function readVitals(page) {
  return page.evaluate(() => new Promise((resolve) => {
    let lcp = 0;
    let cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) lcp = Math.max(lcp, e.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
    // Let late layout shifts land before reading (in-page timer, not a test sleep).
    setTimeout(() => resolve({ lcp: Math.round(lcp), cls: Math.round(cls * 1000) / 1000 }), 3000);
  }));
}

for (const { path, listing, control } of PAGES) {
  test(`phone speed and first screen: ${path}`, async ({ page }, info) => {
    await captureAndSilenceBeacons(page);
    const res = await page.goto(path, { waitUntil: 'load' });
    expect(res.status(), 'HTTP 200').toBe(200);

    const { lcp, cls } = await readVitals(page);
    const viewport = page.viewportSize();
    info.annotations.push(
      { type: 'lab_lcp_ms', description: String(lcp) },
      { type: 'lab_cls', description: String(cls) },
      { type: 'viewport', description: `${viewport.width}x${viewport.height}` },
    );
    if (control) info.annotations.push({ type: 'role', description: 'old-site control' });

    // Lab thresholds: Google's "good" lines. A runner is slower and noisier than a phone
    // on Wi-Fi, so read these as trends across days, not as a pass/fail for Google.
    expect.soft(lcp, 'lab LCP 2.5 s or less').toBeLessThanOrEqual(2500);
    expect.soft(cls, 'CLS 0.1 or less').toBeLessThanOrEqual(0.1);

    // Nothing may scroll the whole page sideways (chip rows scroll inside their own box).
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    info.annotations.push({ type: 'sideways_px', description: String(sideways) });
    expect.soft(sideways, 'no sideways page scroll').toBeLessThanOrEqual(1);

    if (listing) {
      // Main action on the first screen, or a sticky Book bar (CLAUDE.md mobile-first rule).
      const book = page.getByRole('button', { name: /book (appointment|video)/i })
        .or(page.getByRole('link', { name: /book (appointment|video)/i })).first();
      await expect(book, 'a Book button exists').toBeVisible();
      const box = await book.boundingBox();
      const bottom = box ? Math.round(box.y + box.height) : null;
      const sticky = await book.evaluate((el) => {
        for (let n = el; n; n = n.parentElement) {
          const p = getComputedStyle(n).position;
          if (p === 'fixed' || p === 'sticky') return true;
        }
        return false;
      });
      info.annotations.push(
        { type: 'first_book_bottom_px', description: String(bottom) },
        { type: 'first_book_sticky', description: String(sticky) },
      );
      expect.soft(sticky || (bottom !== null && bottom <= viewport.height),
        `first Book button on the first screen (bottom ${bottom}px, screen ${viewport.height}px) or sticky`).toBe(true);
    }
  });
}
