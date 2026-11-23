import {chromium, expect} from '@playwright/test';
import {analyticsOrigin, serveAnalyticsOrigin} from './analytics-fixture.mjs';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4338';
const browser = await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE_PATH || (process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined),headless:true});
try {
  for (const human of [true, false]) {
    const context = await browser.newContext({serviceWorkers:'block'});
    const requests = [];
    await context.route(/googletagmanager\.com|google-analytics\.com|googleadservices\.com|doubleclick\.net|google\.com/, route => {
      requests.push(route.request().url());
      return route.fulfill({contentType:'application/javascript',body:''});
    });
    await serveAnalyticsOrigin(context, base);
    await context.addInitScript(human => {
      if (human) Object.defineProperty(navigator,'webdriver',{get:()=>false});
      localStorage.setItem('airfryer:analytics:v1','granted');
    }, human);
    const page = await context.newPage();
    await page.goto(analyticsOrigin + (human ? '/?analytics_test=1' : '/?analytics_test=0'));
    await page.locator('[data-kitchen-settings]').click();
    await page.locator('[name=preset]').selectOption('metric');
    await page.locator('#kitchen-settings').evaluate(form => form.requestSubmit());
    await expect(page).toHaveURL(analyticsOrigin + '/');
    await page.reload();
    await page.waitForTimeout(500);
    expect(requests).toEqual([]);
    expect(await page.evaluate(() => window.dataLayer ?? [])).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('airfryer:analytics:qa'))).toBe('1');
    const tab = await context.newPage();
    await tab.goto(analyticsOrigin + '/settings');
    await expect(tab.locator('#kitchen-settings')).toBeVisible();
    expect(await tab.evaluate(() => window.dataLayer ?? [])).toEqual([]);
    expect(requests).toEqual([]);
    await context.close();
  }
  // Manual QA before consent, with normal-visitor reset tested only against the local fixture.
  const context = await browser.newContext({serviceWorkers:'block'});
  const requests = [];
  await context.route(/googletagmanager\.com|google-analytics\.com|googleadservices\.com|doubleclick\.net|google\.com/, route => {
    requests.push(route.request().url());
    return route.fulfill({contentType:'application/javascript',body:''});
  });
  await serveAnalyticsOrigin(context, base);
  await context.addInitScript(() => Object.defineProperty(navigator,'webdriver',{get:()=>false}));
  const page = await context.newPage();
  await page.goto(analyticsOrigin+'/?analytics_test=1');
  expect(await page.evaluate(() => localStorage.getItem('airfryer:analytics:v1'))).toBeNull();
  for (const store of ['sessionStorage','localStorage']) {
    expect(await page.evaluate(store => window[store].getItem('airfryer:analytics:qa'),store)).toBe('1');
  }
  await page.locator('[data-kitchen-settings]').click();
  await page.goto(analyticsOrigin+'/');
  await page.locator('[data-consent=granted]').click();
  expect(await page.evaluate(() => window.dataLayer ?? [])).toEqual([]);
  expect(requests).toEqual([]);
  const tab = await context.newPage();
  await tab.goto(analyticsOrigin+'/settings');
  expect(await tab.evaluate(() => window.dataLayer ?? [])).toEqual([]);
  expect(requests).toEqual([]);
  await tab.close();
  await page.goto(analyticsOrigin+'/?analytics_test=0');
  for (const store of ['sessionStorage','localStorage']) {
    expect(await page.evaluate(store => window[store].getItem('airfryer:analytics:qa'),store)).toBeNull();
  }
  await expect(page.locator('#google-analytics-tag')).toHaveCount(1);
  const events = await page.evaluate(() => (window.dataLayer ?? []).map(entry => Array.from(entry)).filter(entry => entry[0]==='event'));
  expect(events.some(entry => entry[1]==='page_view' && entry[2].qa_traffic==='no')).toBe(true);
  expect(requests).toHaveLength(1);
  expect(requests[0]).toContain('googletagmanager.com/gtag/js');
  await context.close();
  console.log('PASS QA and automation: zero SDK/events across consent, navigation and tabs; human reset verified offline with all Google transport intercepted');
} finally { await browser.close(); }
