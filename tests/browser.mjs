import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4327';
const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ ...(existsSync(executablePath) ? { executablePath } : {}), headless: true });
const errors = [];
const results = [];
const check = async (name, run) => { await run(); results.push(name); console.log(`PASS ${name}`); };
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  let googleRequests = 0;
  await context.route(/google-analytics\.com|googletagmanager\.com/, route => { googleRequests++; return route.fulfill({ contentType: 'text/javascript', body: '' }); });
  await check('50 food rows load; local preview does not load analytics', async () => {
    await page.goto(base);
    await expect(page.locator('[data-food-row]:visible')).toHaveCount(50);
    await expect(page.locator('.unit-switch')).toBeVisible();
    expect(googleRequests).toBe(0);
  });
  await check('alias, typo, ambiguous term and empty search', async () => {
    const input = page.locator('#search-input');
    await input.fill('wingettes'); await page.locator('#food-search').evaluate(form => form.requestSubmit());
    await expect(page.locator('[data-food-row]:visible')).toHaveCount(1);
    await expect(page.locator('[data-food-row]:visible')).toHaveAttribute('data-slug', 'chicken-wings');
    await input.fill('brocolli'); await page.locator('#food-search').evaluate(form => form.requestSubmit());
    await expect(page.locator('[data-food-row]:visible')).toHaveAttribute('data-slug', 'broccoli');
    await input.fill('chicken'); await page.locator('#food-search').evaluate(form => form.requestSubmit());
    expect(await page.locator('[data-food-row]:visible').count()).toBeGreaterThan(1);
    await input.fill('zzzzzznonexistent'); await page.locator('#food-search').evaluate(form => form.requestSubmit());
    await expect(page.locator('#search-empty')).toBeVisible();
    await page.locator('[data-clear-search]').click();
    await expect(page.locator('[data-food-row]:visible')).toHaveCount(50);
  });
  await check('category and unit survive navigation and URL reload', async () => {
    await page.locator('[data-category-filter="frozen"]').click();
    await expect(page.locator('[data-food-row]:visible')).toHaveCount(10);
    await page.locator('[data-unit="c"]').click();
    await page.reload();
    await expect(page.locator('[data-food-row]:visible')).toHaveCount(10);
    await expect(page.locator('[data-unit="c"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-food-link="french-fries"]').click();
    await expect(page.locator('.cooking-values [data-temperature]').first()).toHaveText('205°C');
  });
  await check('sourced condition, fallback and source anchor', async () => {
    await page.goto(`${base}/foods/chicken-breast?variant=medium&unit=f`);
    await expect(page.locator('#variant-select')).toHaveValue('medium');
    await expect(page.locator('[data-variant-panel]:visible')).toHaveCount(1);
    await page.locator('#variant-select').selectOption('large');
    await expect(page).toHaveURL(/variant=large/);
    await page.locator('[data-variant-panel]:visible .source-summary a').click();
    await expect(page).toHaveURL(/#sources-large$/);
    await page.goto(`${base}/foods/chicken-breast?variant=unavailable`);
    await expect(page.locator('#variant-select')).toHaveValue('small');
    await page.goto(`${base}/foods/fish-sticks`);
    await expect(page.locator('.safety-note')).toContainText('165');
    await expect(page.locator('.safety-note')).not.toContainText('145');
  });
  await check('keyboard focus, no horizontal overflow and document metadata', async () => {
    for (const width of [320, 375, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/', '/foods/chicken-breast', '/categories/frozen', '/methodology']) {
        await page.goto(`${base}${path}`);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://airfryer.ybwdaisy.com${path}`);
      }
    }
    await page.goto(base); await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    expect(await page.locator('.skip-link').evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  });
  await check('static guides and alternate conditions remain readable without JavaScript', async () => {
    const nojs = await browser.newContext({ javaScriptEnabled: false });
    const p = await nojs.newPage();
    await p.goto(`${base}/foods/chicken-breast`);
    await expect(p.locator('[data-variant-panel]:visible')).toHaveCount(3);
    await p.goto(`${base}/categories/frozen`);
    await expect(p.locator('[data-food-row]:visible')).toHaveCount(10);
    await nojs.close();
  });
  await check('404, sitemap and preview noindex', async () => {
    const response = await page.goto(`${base}/not-a-food`);
    expect(response.status()).toBe(404);
    await page.goto(base);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    const sitemap = await context.request.get(`${base}/sitemap.xml`);
    expect((await sitemap.text()).match(/<loc>/g)).toHaveLength(118);
  });
  await check('consent gates tag loading; withdrawal stops events; raw search text is excluded', async () => {
    const c = await browser.newContext();
    const p = await c.newPage();
    let requests = 0;
    await c.route(/googletagmanager\.com|google-analytics\.com/, route => { requests++; return route.fulfill({ contentType: 'text/javascript', body: '' }); });
    // Inject the real-production public identifier into preview HTML only, intercepting every Google request.
    await c.route(`${base}/**`, async route => {
      const response = await route.fetch();
      if ((response.headers()['content-type'] || '').includes('text/html')) {
        const body = (await response.text()).replace(/<meta\b[^>]*name="ga-measurement-id"[^>]*>/, '<meta name="ga-measurement-id" content="G-B34CBGW0EF">');
        expect(body).toContain('content="G-B34CBGW0EF"');
        await route.fulfill({ response, body });
      } else await route.fulfill({ response });
    });
    await p.goto(base);
    await expect(p.locator('#consent-banner')).toBeVisible();
    expect(requests).toBe(0);
    await p.locator('[data-consent="denied"]').click(); await p.reload();
    await expect(p.locator('#consent-banner')).toBeHidden(); expect(requests).toBe(0);
    await p.locator('[data-privacy-settings]').click(); await p.locator('[data-consent="granted"]').click();
    await expect(p.locator('#google-analytics-tag')).toHaveCount(1);
    await p.locator('#search-input').fill('private-test@example.com');
    await p.locator('#food-search').evaluate(form => form.requestSubmit());
    const queue = await p.evaluate(() => window.dataLayer.map(args => Array.from(args)));
    expect(JSON.stringify(queue)).not.toContain('private-test');
    expect(JSON.stringify(queue)).toContain('search_no_results');
    await p.locator('[data-privacy-settings]').click(); await p.locator('[data-consent="denied"]').click();
    const before = await p.evaluate(() => window.dataLayer.length);
    await p.locator('[data-unit="c"]').click();
    expect(await p.evaluate(() => window.dataLayer.length)).toBe(before);
    await p.reload(); await expect(p.locator('#google-analytics-tag')).toHaveCount(0);
    await c.close();
  });
  expect(errors).toEqual([]);
  await mkdir('output', { recursive: true });
  await writeFile('output/browser-results.json', JSON.stringify({ base, checks: results, pageErrors: errors, googleRequestsInPreview: googleRequests }, null, 2));
} finally { await browser.close(); }
