// Turn Playwright's JSON report into a small, stable file the QA agent reads:
// results/qa-results.json = { run_at, sha, counts, tests: [{ file, project, title, status, error, annotations }] }
import fs from 'node:fs';
const raw = JSON.parse(fs.readFileSync('results/results.json', 'utf8'));
const tests = [];
function walk(suite, file) {
  for (const s of suite.suites || []) walk(s, s.file || file);
  for (const spec of suite.specs || []) {
    for (const t of spec.tests || []) {
      const last = t.results[t.results.length - 1] || {};
      const status = t.status === 'expected' ? 'pass' : t.status === 'skipped' ? 'not_run' : t.status === 'flaky' ? 'flaky' : 'fail';
      tests.push({
        file: spec.file || file, project: t.projectName, title: spec.title, status,
        error: last.error ? String(last.error.message || '').replace(/\u001b\[[0-9;]*m/g, '').slice(0, 600) : null,
        annotations: (t.annotations || []).concat(last.annotations || []),
        duration_ms: last.duration,
      });
    }
  }
}
for (const s of raw.suites || []) walk(s, s.file);
const counts = tests.reduce((a, t) => (a[t.status] = (a[t.status] || 0) + 1, a), {});
const screens = [];
for (const proj of ['mobile', 'desktop']) { const d = `results/screens/${proj}`; if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) screens.push(`screens/${proj}/${f}`); }
const out = { run_at: new Date().toISOString(), sha: process.env.GITHUB_SHA || null, base_url: process.env.BASE_URL || 'https://www.marham.pk', counts, tests, screens };
fs.writeFileSync('results/qa-results.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(counts));
