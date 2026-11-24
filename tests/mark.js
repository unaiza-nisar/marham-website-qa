// Red boxes on bug screenshots.
// markBug() draws a red box around the element(s) a failed check is about, adds a red label
// with the problem in plain words, saves a screenshot under results/screens/bugs/<project>/,
// attaches it to the HTML report and records it for the QA agent (annotation "bug_screenshot").
// With no element (target = null) it frames the whole screen in red instead.
// It never throws: a marking problem must not hide or change the real test result.
const fs = require('node:fs');
const path = require('node:path');

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const MAX_SHOT_PX = 6000; // tallest screenshot we keep (a full listing page can be 20,000 px)

async function drawMarks(page, { selector, label, foldLine }) {
  return page.evaluate(({ selector, label, foldLine }) => {
    const old = document.getElementById('__qa_marks');
    if (old) old.remove();
    const layer = document.createElement('div');
    layer.id = '__qa_marks';
    layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none';
    document.body.appendChild(layer);
    const add = (css, text) => {
      const d = document.createElement('div');
      d.style.cssText = css;
      if (text) d.textContent = text;
      layer.appendChild(d);
      return d;
    };
    const els = selector ? Array.from(document.querySelectorAll(selector)) : [];
    let top = Infinity;
    let bottom = 0;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const y = r.top + window.scrollY;
      const x = r.left + window.scrollX;
      add(`position:absolute;left:${x - 5}px;top:${y - 5}px;width:${r.width + 10}px;height:${r.height + 10}px;`
        + 'border:4px solid #e00000;border-radius:6px;box-sizing:border-box;box-shadow:0 0 0 2px #fff');
      top = Math.min(top, y - 5);
      bottom = Math.max(bottom, y + r.height + 5);
    }
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    if (!els.length) {
      add(`position:absolute;left:0;top:${window.scrollY}px;width:${vw}px;height:${vh}px;`
        + 'border:6px solid #e00000;box-sizing:border-box');
    }
    if (foldLine) {
      add(`position:absolute;left:0;top:${vh}px;width:${vw}px;border-top:3px dashed #e00000`);
      add(`position:absolute;right:6px;top:${vh + 4}px;background:#e00000;color:#fff;font:bold 12px/1.3 sans-serif;padding:2px 6px;border-radius:3px`,
        'End of the first screen');
    }
    // The label sits just above the box (or below it if there is no room), never on top of it.
    const tag = add(`position:absolute;left:8px;top:0;width:max-content;max-width:${vw - 24}px;background:#e00000;color:#fff;`
      + 'font:bold 14px/1.3 sans-serif;padding:5px 9px;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.4)', label);
    const h = tag.offsetHeight;
    let labelTop = window.scrollY + 8;
    if (els.length) labelTop = top - h - 6 >= 0 ? top - h - 6 : bottom + 6;
    tag.style.top = `${labelTop}px`;
    if (els.length && labelTop > bottom) bottom = labelTop + h; else if (els.length) top = Math.min(top, labelTop);
    return { found: els.length, top: Number.isFinite(top) ? Math.floor(top) : 0, bottom: Math.ceil(bottom), vw, vh,
      docH: document.documentElement.scrollHeight };
  }, { selector, label, foldLine });
}

async function clearMarks(page) {
  await page.evaluate(() => {
    const l = document.getElementById('__qa_marks');
    if (l) l.remove();
    for (const el of document.querySelectorAll('[data-qa-bug]')) el.removeAttribute('data-qa-bug');
  }).catch(() => {});
}

/**
 * @param page   Playwright page
 * @param info   testInfo
 * @param target a Locator, a CSS selector string, or null (frame the whole screen)
 * @param note   the problem in plain words, shown on the screenshot
 * @param opts   { foldLine: true } draws the end of the first screen and keeps the shot from the top
 */
async function markBug(page, info, target, note, opts = {}) {
  try {
    if (page.isClosed()) return null;
    let selector = null;
    if (typeof target === 'string') selector = target;
    else if (target && typeof target.evaluateAll === 'function') {
      const n = await target.evaluateAll((els) => { els.forEach((e) => e.setAttribute('data-qa-bug', '1')); return els.length; });
      if (n) selector = '[data-qa-bug]';
    }
    if (selector && !opts.foldLine) {
      await page.locator(selector).first().scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
    }
    const m = await drawMarks(page, { selector, label: note, foldLine: !!opts.foldLine });

    const n = info.annotations.filter((a) => a.type === 'bug_screenshot').length + 1;
    const rel = path.posix.join('screens', 'bugs', info.project.name, `${slug(info.title)}-r${info.retry}-${n}.jpg`);
    const file = path.join('results', rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });

    const shot = { path: file, type: 'jpeg', quality: 75 };
    if (opts.foldLine && m.found) {
      // Show from the top of the page down to just below the marked element,
      // so the first screen and where the element really is are both visible.
      shot.fullPage = true;
      shot.clip = { x: 0, y: 0, width: m.vw, height: Math.min(m.docH, Math.max(m.vh + 60, m.bottom + 60), MAX_SHOT_PX) };
    } else if (m.found && m.bottom - m.top > m.vh) {
      shot.fullPage = true;
      const y = Math.max(0, m.top - 50);
      shot.clip = { x: 0, y, width: m.vw, height: Math.min(m.docH - y, m.bottom - m.top + 100, MAX_SHOT_PX) };
    }
    await page.screenshot(shot);
    await clearMarks(page);

    await info.attach(`bug ${n}: ${note}`, { path: file, contentType: 'image/jpeg' });
    info.annotations.push({ type: 'bug_screenshot', description: `${rel} :: ${note}` });
    return rel;
  } catch (e) {
    info.annotations.push({ type: 'bug_screenshot_error', description: String(e && e.message || e).slice(0, 200) });
    await clearMarks(page);
    return null;
  }
}

module.exports = { markBug };
