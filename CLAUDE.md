# marham-website-qa — rules for any agent working here

This repo holds the read-only Playwright checks for www.marham.pk run by GitHub Actions for the
Marham Website QA agent (owner: Unaiza Nisar, SQA Lead).

## Skills are mandatory (owner's standing rule)
Before changing or reviewing anything in this repo, load and follow these skills:
- QA (github.com/petrkindlmann/qa-skills @ 5087a3461d49da76b1e794d9b0bfbd23f38dc75b):
  qa-do, playwright-automation, analytics-tracking-testing, mobile-testing, visual-testing,
  accessibility-testing, cross-browser-testing, test-reliability, selector-drift-recovery,
  ci-cd-integration, ai-qa-review, synthetic-monitoring, ai-bug-triage, bug-reproduction,
  qa-report-humanizer.
- Marketing (github.com/coreyhaines31/marketingskills @ 73573e94a06a39965978b3fa1f9c1eace8cebc7c):
  seo-audit, ai-seo, schema, cro, analytics, conversion-tracking.
If a skill isn't installed, install both libraries at those commits (see the project doc
`claude/qa-agent/skills-policy.md` for the commands). If a required skill can't be loaded,
stop and say so; don't work around it.

## Hard rules
- Tests are read-only: never submit a booking past the details step, never type an OTP,
  password, card or real patient data. Booking tests only on the 3 test profiles in tests/urls.js.
- GA4/pixel beacons are always intercepted (route.fulfill 204) so test visits never reach live analytics.
- Never change the live site, GTM or GA4 from here.
