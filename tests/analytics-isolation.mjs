import {chromium, expect} from '@playwright/test';
import {analyticsOrigin, serveAnalyticsOrigin} from './analytics-fixture.mjs';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4338';
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
  for (const human of [true, false]) {
    const context = await browser.newContext();
    const requests = [];
    await context.route(/googletagmanager\.com|google-analytics\.com|googleadservices\.com|doubleclick\.net/, route => {
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
  console.log('PASS QA and automation: settings still work, sticky mode across navigation/tabs, no SDK or collection requests');
} finally { await browser.close(); }
