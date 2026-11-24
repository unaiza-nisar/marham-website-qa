// Phone speed (lab) and first-screen booking checks (playbook section 11.2).
// Read-only: opens pages, never clicks Book. All analytics/ad beacons are silenced.
// Lab numbers from a GitHub runner are a trend signal, not Google's field data (CrUX).
// High-priority checks: a video is kept when one fails, and every problem gets a red-boxed screenshot.
const { test, expect } = require('./fixtures');
const { markBug } = require('./mark');
const { captureAndSilenceBeacons } = require('./ga4');

test.use({ video: 'retain-on-failure' });

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
// Also tags the LCP element (data-qa-lcp) and the elements that moved most (data-qa-cls),
// so a failed check can box them.
async function readVitals(page) {
  return page.evaluate(() => new Promise((resolve) => {
    let lcp = 0;
    let lcpEl = null;
    let cls = 0;
    const movers = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (e.startTime >= lcp) { lcp = e.startTime; lcpEl = e.element || lcpEl; }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        cls += e.value;
        for (const s of e.sources || []) if (s.node && s.node.nodeType === 1) movers.push({ node: s.node, v: e.value });
      }
    }).observe({ type: 'layout-shift', buffered: true });
    // Let late layout shifts land before reading (in-page timer, not a test sleep).
    setTimeout(() => {
      if (lcpEl && lcpEl.isConnected) lcpEl.setAttribute('data-qa-lcp', '1');
      movers.sort((a, b) => b.v - a.v).slice(0, 3).forEach((m) => m.node.isConnected && m.node.setAttribute('data-qa-cls', '1'));
      resolve({ lcp: Math.round(lcp), cls: Math.round(cls * 1000) / 1000 });
    }, 3000);
  }));
}

// Elements that stick out past the right edge of the screen (outside any scroll box of their own).
async function tagWideElements(page) {
  return page.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const scrolls = (el) => {
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const o = getComputedStyle(n).overflowX;
        if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true;
      }
      return false;
    };
    const wide = Array.from(document.body.querySelectorAll('*')).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.right > cw + 1;
    });
    const set = new Set(wide);
    const outer = wide.filter((el) => !set.has(el.parentElement) && !scrolls(el)).slice(0, 3);
    outer.forEach((el) => el.setAttribute('data-qa-wide', '1'));
    return outer.length;
  });
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
    if (lcp > 2500) await markBug(page, info, '[data-qa-lcp]', `Main content (boxed) appeared after ${(lcp / 1000).toFixed(1)} s; target 2.5 s`);
    if (cls > 0.1) await markBug(page, info, '[data-qa-cls]', `Layout shift ${cls} (target 0.1); boxed = what moved most`);
    expect.soft(lcp, 'lab LCP 2.5 s or less').toBeLessThanOrEqual(2500);
    expect.soft(cls, 'CLS 0.1 or less').toBeLessThanOrEqual(0.1);

    // Nothing may scroll the whole page sideways (chip rows scroll inside their own box).
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    info.annotations.push({ type: 'sideways_px', description: String(sideways) });
    if (sideways > 1) {
      await tagWideElements(page);
      await markBug(page, info, '[data-qa-wide]', `Page scrolls ${sideways}px sideways; boxed = what sticks out`);
    }
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
      const ok = sticky || (bottom !== null && bottom <= viewport.height);
      if (!ok) await markBug(page, info, book, `First Book button is ${bottom}px down; the first screen ends at ${viewport.height}px`, { foldLine: true });
      expect.soft(ok, `first Book button on the first screen (bottom ${bottom}px, screen ${viewport.height}px) or sticky`).toBe(true);
    }
  });
}
