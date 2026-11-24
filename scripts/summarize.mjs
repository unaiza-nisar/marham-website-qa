// Turn Playwright's JSON report into a small, stable file the QA agent reads:
// results/qa-results.json = { run_at, sha, report_url, counts, tests: [...], screens: [...] }
// Each test: { file, project, title, status, error, annotations, bug_screenshots: [{file, note}], has_video, has_trace, duration_ms }
import fs from 'node:fs';
import path from 'node:path';

const raw = JSON.parse(fs.readFileSync('results/results.json', 'utf8'));
const strip = (s) => String(s || '').replace(/\u001b\[[0-9;]*m/g, '');
const tests = [];

function walk(suite, file) {
  for (const s of suite.suites || []) walk(s, s.file || file);
  for (const spec of suite.specs || []) {
    for (const t of spec.tests || []) {
      const last = t.results[t.results.length - 1] || {};
      const status = t.status === 'expected' ? 'pass' : t.status === 'skipped' ? 'not_run' : t.status === 'flaky' ? 'flaky' : 'fail';
      // Annotations of the last attempt only (older versions listed them twice after a retry).
      const annotations = (last.annotations && last.annotations.length ? last.annotations : t.annotations) || [];
      const bug_screenshots = annotations.filter((a) => a.type === 'bug_screenshot').map((a) => {
        const [file, ...note] = String(a.description).split(' :: ');
        return { file, note: note.join(' :: ') };
      });
      const att = last.attachments || [];
      tests.push({
        file: spec.file || file, project: t.projectName, title: spec.title, status,
        error: last.error ? strip(last.error.message).slice(0, 600) : null,
        annotations: annotations.filter((a) => a.type !== 'bug_screenshot'),
        bug_screenshots,
        has_video: att.some((a) => a.name === 'video'),
        has_trace: att.some((a) => a.name === 'trace'),
        duration_ms: last.duration,
      });
    }
  }
}
for (const s of raw.suites || []) walk(s, s.file);

const counts = tests.reduce((a, t) => (a[t.status] = (a[t.status] || 0) + 1, a), {});
const screens = [];
const list = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.posix.join(dir, f);
    if (fs.statSync(p).isDirectory()) list(p);
    else screens.push(path.posix.relative('results', p));
  }
};
list('results/screens');

const out = {
  run_at: new Date().toISOString(),
  sha: process.env.GITHUB_SHA || null,
  run_url: process.env.GITHUB_RUN_URL || null,
  report_url: process.env.REPORT_URL || null,
  base_url: process.env.BASE_URL || 'https://www.marham.pk',
  counts, tests, screens,
};
fs.writeFileSync('results/qa-results.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(counts));
