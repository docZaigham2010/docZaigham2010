// The cloud container's browser does not trust the egress proxy's certificate,
// so requests are fetched by Playwright's Node side (which does) and handed back.
// Elsewhere (SHOWREEL_DIRECT=1 or no HTTPS_PROXY) the browser fetches normally.
// Prefer the cloud container's Playwright (its browser is preinstalled), else the project's.
export const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs').catch(() => import('playwright'));
const viaNode = process.env.HTTPS_PROXY && !process.env.SHOWREEL_DIRECT;
export const launch = (opts = {}) => chromium.launch({ ...opts, ...(viaNode ? { proxy: { server: process.env.HTTPS_PROXY } } : {}) });
export async function wire(context) {
  if (!viaNode) return;
  await context.route(/^https:/, async route => {
    try { await route.fulfill({ response: await route.fetch() }); } catch { await route.abort().catch(() => {}); }
  });
}
