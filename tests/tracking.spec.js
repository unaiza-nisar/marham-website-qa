// GA4 tracking checks: the beacon, not the dataLayer, is the proof (analytics-tracking-testing skill).
// All beacons are captured and answered locally (204), so nothing reaches Marham's live analytics.
const { test, expect } = require('@playwright/test');
const { captureAndSilenceBeacons } = require('./ga4');

const MEASUREMENT_ID = 'G-LCWLDX7FXT';
const OBSERVE_MS = 12_000; // GTM loads 5 s after hydration; give tags time, then count

async function pageViews(page, path) {
  const events = await captureAndSilenceBeacons(page);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(OBSERVE_MS); // bounded observation window: we must also catch late duplicates
  return events.filter(e => e.name === 'page_view' && e.params.tid === MEASUREMENT_ID);
}

test('new-site listing sends exactly one GA4 page_view with site_version=next', async ({ page }, info) => {
  const pv = await pageViews(page, '/doctors/pediatrician');
  info.annotations.push({ type: 'page_views', description: String(pv.length) });
  expect(pv.length, 'page_view count').toBe(1);
  expect(pv[0].params['ep.site_version']).toBe('next');
});

test('new-site lab pages send site_version=next (known bug TR-003)', async ({ page }, info) => {
  const pv = await pageViews(page, '/labs');
  info.annotations.push({ type: 'page_views', description: pv.map(e => e.params['ep.site_version'] || '(none)').join(', ') });
  expect(pv.length, 'at least one page_view').toBeGreaterThan(0);
  expect(pv.every(e => e.params['ep.site_version'] === 'next'), 'every lab page_view carries site_version=next').toBe(true);
});

test('a 50/50 profile sends one page_view and reports which version was served', async ({ page }, info) => {
  const pv = await pageViews(page, '/doctors/lahore/dermatologist/dr-umer-mushtaq');
  info.annotations.push({ type: 'version_served', description: pv[0] ? (pv[0].params['ep.site_version'] || 'legacy') : 'no page_view' });
  expect(pv.length, 'page_view count').toBe(1);
});
