# marham-website-qa

Read-only checks for www.marham.pk, run by GitHub Actions every day at 06:40 PKT and on demand.
The Marham QA agent reads `qa-results.json` from the latest run at 07:25 PKT and reports to the QA Command Center.

What it checks:
- **smoke**: key pages and the 19 profiles under 50/50 testing load (200), are indexable, have a lower-case www canonical, and new-site pages are still on the new site.
- **seo**: robots.txt, the sitemaps, upper-case URL redirects, http/non-www redirects, CDN caching.
- **tracking**: the GA4 page_view beacon fires once with `site_version=next` on new pages. All beacons are answered locally, so test visits never reach Marham's analytics or ad accounts.
- **onpage**: title readable (words not run together), title 30-65 and description 70-160 characters, one H1, valid JSON-LD, no `{{placeholders}}`, HTML under 600 KB.
- **speed** (phone): lab LCP and CLS, no sideways scrolling, and the first Book button on the first screen or in a sticky bar. Lab numbers are a daily trend, not Google's real-user data.
- **booking**: on the 3 test profiles only, at phone size: the Book button is on the first screen, and the fee on the booking step matches the profile. It never submits, and never types a phone number or OTP.

Rules: this repo never changes the website. No secrets are stored here yet. When OTP testing is agreed, a test phone and OTP method will be added as repository secrets.

Run locally: `npm install && npx playwright install chromium && npx playwright test`.
