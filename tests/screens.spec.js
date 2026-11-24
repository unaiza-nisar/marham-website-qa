// First-screen screenshots of key pages, saved on every run (pass or fail),
// so the daily report and bug cards can show what a patient actually saw.
// Read-only: opens pages, never clicks Book, never submits anything.
const { test } = require('./fixtures');
const { KEY_PAGES, TEST_PROFILES } = require('./urls');

const PAGES = KEY_PAGES.concat(TEST_PROFILES.slice(0, 1));
const slug = (p) => (p === '/' ? 'home' : p.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-'));

for (const path of PAGES) {
  test(`screenshot ${path}`, async ({ page }, info) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `results/screens/${info.project.name}/${slug(path)}.jpg`, type: 'jpeg', quality: 70 });
  });
}
