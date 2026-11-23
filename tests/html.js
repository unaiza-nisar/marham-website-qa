// Small helpers to read facts out of raw HTML without a browser.
function metaRobots(html) {
  const m = html.match(/<meta[^>]+name=["']robots["'][^>]*>/i);
  if (!m) return '';
  const c = m[0].match(/content=["']([^"']*)["']/i);
  return c ? c[1].toLowerCase() : '';
}
function canonical(html) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  if (!m) return null;
  const h = m[0].match(/href=["']([^"']*)["']/i);
  return h ? h[1] : null;
}
function title(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim() : '';
}
function isNewStack(html) {
  return html.includes('/_next/static') || html.includes('self.__next_f');
}
function visibleTextLength(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}
module.exports = { metaRobots, canonical, title, isNewStack, visibleTextLength };
