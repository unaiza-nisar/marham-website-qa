// Parse GA4 web-tag beacons (/g/collect). Adapted from the analytics-tracking-testing skill:
// match the exact path on an approved host, merge each POST line over the URL query.
function parseGA4(request) {
  let url;
  try { url = new URL(request.url()); } catch { return []; }
  const approved = url.hostname === 'google-analytics.com' || url.hostname.endsWith('.google-analytics.com')
    || url.hostname === 'analytics.google.com' || url.hostname.endsWith('.analytics.google.com');
  if (!approved || url.pathname !== '/g/collect') return [];
  const lines = (request.postData() || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const events = [];
  for (const line of lines.length ? lines : ['']) {
    const params = new URLSearchParams(url.searchParams);
    for (const [k, v] of new URLSearchParams(line)) params.set(k, v);
    const name = params.get('en');
    if (name && name.trim()) events.push({ name, params: Object.fromEntries(params) });
  }
  return events;
}

// Capture GA4 events, and stop every analytics/ad beacon from reaching the real
// destinations so test visits never pollute Marham's GA4, Meta or TikTok data.
async function captureAndSilenceBeacons(page) {
  const events = [];
  await page.route(/google-analytics\.com\/g\/collect|analytics\.google\.com\/g\/collect/, async route => {
    events.push(...parseGA4(route.request()));
    await route.fulfill({ status: 204, body: '' });
  });
  await page.route(/facebook\.com\/tr|analytics\.tiktok\.com\/api|clarity\.ms\/collect|px\.ads\.linkedin\.com|bat\.bing\.com\/action/, route =>
    route.fulfill({ status: 204, body: '' }));
  return events;
}

module.exports = { parseGA4, captureAndSilenceBeacons };
