# marham-website-qa

Read-only checks for www.marham.pk, run by GitHub Actions every day at 06:40 PKT and on demand.
The Marham QA agent reads `qa-results.json` from the latest run at 07:25 PKT and reports to the QA Command Center.

**Latest report (always the newest run):** https://unaiza-nisar.github.io/marham-website-qa/
This link is public. It only shows public pages of www.marham.pk; nothing private is tested or stored.

What the report shows for a failed check:
- **Red-boxed screenshot**: the problem is boxed in red with a short note (for example the Book button, the wrong fee, what sticks out sideways). Failures with no single element get the whole screen framed in red with the failed check written on it. HTTP-only checks (titles, sitemap, robots.txt, headers) have no page to show, so they report in text.
- **Video**: kept only for the high-priority browser checks (booking flow and phone first-screen/speed), and only when they fail.
- **Trace**: a step-by-step replay of every failed browser check (open the test, then "Trace").

What it checks:
- **smoke**: key pages and the 19 profiles under 50/50 testing load (200), are indexable, have a lower-case www canonical, and new-site pages are still on the new site.
- **seo**: robots.txt, the sitemaps, upper-case URLs (a 301 to lower-case or a 404 is fine; a duplicate 200 page is not), http/non-www redirects, CDN caching.
- **tracking**: the GA4 page_view beacon fires once with `site_version=next` on new pages. All beacons are answered locally, so test visits never reach Marham's analytics or ad accounts.
- **onpage**: title readable (words not run together), title 30-65 and description 70-160 characters, one H1, valid JSON-LD, no `{{placeholders}}`, HTML under 600 KB.
- **speed** (phone): lab LCP and CLS, no sideways scrolling, and the first Book button on the first screen or in a sticky bar. Lab numbers are a daily trend, not Google's real-user data.
- **booking**: on the 3 test profiles only, at phone size: the Book button is on the first screen, and the fee on the booking step matches the profile. It never submits, and never types a phone number or OTP.

Rules: this repo never changes the website. No secrets are stored here yet. When OTP testing is agreed, a test phone and OTP method will be added as repository secrets.

Run locally: `npm install && npx playwright install chromium && npx playwright test`.
