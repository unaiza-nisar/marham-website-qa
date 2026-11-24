// Booking flow on the 3 TEST profiles only, at phone size, up to (never past) the details/OTP step.
// Rules: never a real doctor, never submit, never type a phone number or OTP.
// High-priority checks: a video is kept when one fails, and every problem gets a red-boxed screenshot.
const { test, expect } = require('./fixtures');
const { markBug } = require('./mark');
const { TEST_PROFILES } = require('./urls');
const { captureAndSilenceBeacons } = require('./ga4');

test.use({ video: 'retain-on-failure' });

const FEE = /Rs\.?\s?([\d,]{3,})/g;
const fees = text => [...new Set([...text.matchAll(FEE)].map(m => Number(m[1].replace(/,/g, ''))))].sort((a, b) => a - b);
// "Rs 2,500", "Rs.2500" and "Rs 2500" all match the same fee.
const feeText = f => new RegExp(`Rs\\.?\\s?${String(f).replace(/\B(?=(\d{3})+(?!\d))/g, ',?')}\\b`);

for (const path of TEST_PROFILES) {
  test.describe(`booking flow: ${path}`, () => {
    test.beforeEach(async ({ page }) => { await captureAndSilenceBeacons(page); });

    test('Book Appointment is visible on the first screen (or in a sticky bar)', async ({ page }, info) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const book = page.getByRole('link', { name: /book appointment/i })
        .or(page.getByRole('button', { name: /book appointment/i })).first();
      await expect(book).toBeVisible();
      const box = await book.boundingBox();
      const vh = page.viewportSize().height;
      const bottom = Math.round(box.y + box.height);
      info.annotations.push({ type: 'book_button_y', description: `${Math.round(box.y)} of viewport ${vh}` });
      if (bottom > vh) {
        await markBug(page, info, book, `Book Appointment is ${bottom}px down; the first screen ends at ${vh}px`, { foldLine: true });
      }
      expect(bottom, 'Book Appointment within the first screen').toBeLessThanOrEqual(vh);
    });

    test('fee on the booking page matches a fee shown on the profile', async ({ page }, info) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const profileFees = fees(await page.locator('body').innerText());
      const book = page.getByRole('link', { name: /book appointment/i })
        .or(page.getByRole('button', { name: /book appointment/i })).first();
      await book.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);
      const bookingText = await page.locator('body').innerText();
      const bookingFees = fees(bookingText);
      info.annotations.push(
        { type: 'profile_fees', description: profileFees.join(', ') || 'none found' },
        { type: 'booking_fees', description: bookingFees.join(', ') || 'none found' },
        { type: 'booking_url', description: page.url() },
      );

      const wrong = bookingFees.filter(f => !profileFees.includes(f));
      for (const f of wrong) {
        await markBug(page, info, page.getByText(feeText(f)).first(),
          `Fee Rs ${f} on the booking step is not shown on the profile (profile: ${profileFees.join(', ') || 'none'})`);
      }
      const paysAtClinic = /pay at (the )?clinic/i.test(bookingText);
      if (bookingFees.length && !paysAtClinic) {
        await markBug(page, info, page.getByText(FEE).first(), 'No "pay at clinic" note next to the fee on the booking step');
      }

      expect(bookingFees.length, 'booking step shows a fee').toBeGreaterThan(0);
      for (const f of bookingFees) expect.soft(profileFees, `fee Rs ${f} on booking step also shown on profile`).toContain(f);
      expect.soft(paysAtClinic, 'in-clinic booking explains payment').toBe(true);
    });
  });
}
