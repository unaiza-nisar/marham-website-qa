// Shared test object for the browser checks (mobile and desktop projects).
// After any failed browser check that did not already mark its own bug, take one screenshot
// with the screen framed in red and the failed check written on it, so every bug
// screenshot in the report is marked. HTTP-only checks have no page, so they keep using
// '@playwright/test' directly and report in text.
const base = require('@playwright/test');
const { markBug } = require('./mark');

const strip = (s) => String(s || '').replace(/\u001b\[[0-9;]*m/g, '');

const test = base.test.extend({
  bugShot: [async ({ page }, use, info) => {
    await use();
    const failed = info.status !== info.expectedStatus || info.errors.length > 0;
    const marked = info.annotations.some((a) => a.type === 'bug_screenshot');
    if (failed && !marked && !page.isClosed()) {
      const msg = strip(info.errors[0] && info.errors[0].message).split('\n').find((l) => l.trim()) || 'check failed';
      await markBug(page, info, null, `FAILED: ${msg.trim().replace(/^Error:\s*/, '')}`.slice(0, 180));
    }
  }, { auto: true }],
});

module.exports = { test, expect: base.expect };
