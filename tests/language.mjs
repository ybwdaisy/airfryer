import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4328';
const production = process.env.TEST_PRODUCTION === '1';
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const results=[];
const check=async(name,run)=>{await run();results.push(name);console.log('PASS '+name);};
try {
  const context=await browser.newContext({locale:'zh-CN'});
  let requests=0; const errors=[];
  await context.route(/googletagmanager\.com|google-analytics\.com/,route=>{requests++;return route.fulfill({contentType:'text/javascript',body:''});});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await check('fresh Chinese browser still defaults to English',async()=>{
    await page.goto(base);
    await expect(page.locator('html')).toHaveAttribute('lang','en');
    await expect(page.locator('h1')).toHaveText('What’s going in the air fryer?');
    await expect(page.locator('[data-food-row]:visible')).toHaveCount(50);
  });
  await check('language switch retains search, category, unit and selected condition',async()=>{
    await page.goto(base+'/?q=薯条&category=frozen&unit=c');
    await expect(page.locator('[data-food-row]:visible')).toHaveCount(1);
    await page.locator('[data-language-switch="zh"]').click();
    await expect(page).toHaveURL(/\/zh\/us\?q=.*category=frozen&unit=c/);
    await expect(page.locator('html')).toHaveAttribute('lang','zh-CN');
    await expect(page.locator('[data-food-row]:visible')).toHaveCount(1);
    await expect(page.locator('[data-food-row]:visible .food-name > span')).toHaveText('薯条');
    await page.locator('[data-food-link="french-fries"]').click();
    await expect(page).toHaveURL(/\/zh\/foods\/french-fries\?unit=c/);
    await page.locator('#variant-select').selectOption('shoestring');
    await page.locator('[data-variant-panel]:visible .source-summary a').click();
    await page.locator('[data-language-switch="en"]').click();
    await expect(page).toHaveURL(/\/foods\/french-fries\?unit=c&variant=shoestring#sources-shoestring$/);
    await expect(page.locator('#variant-select')).toHaveValue('shoestring');
    await expect(page.locator('h1')).toHaveText('French fries');
    await expect(page.locator('[data-unit="c"]')).toHaveAttribute('aria-pressed','true');
  });
  await check('explicit choice is remembered; Chinese search supports single characters and English aliases',async()=>{
    await page.goto(base);await expect(page.locator('html')).toHaveAttribute('lang','en');
    await page.locator('[data-language-switch="zh"]').click();
    await page.goto(base);await expect(page).toHaveURL(/\/zh\/us$/);
    await page.locator('#search-input').fill('虾');await page.locator('#food-search').evaluate(f=>f.requestSubmit());
    await expect(page.locator('[data-food-row]:visible')).toHaveCount(1);
    await expect(page.locator('[data-food-row]:visible')).toHaveAttribute('data-slug','shrimp');
    await page.locator('#search-input').fill('wingettes');await page.locator('#food-search').evaluate(f=>f.requestSubmit());
    await expect(page.locator('[data-food-row]:visible')).toHaveAttribute('data-slug','chicken-wings');
    await page.locator('[data-language-switch="en"]').click();
    await page.goto(base);await expect(page.locator('html')).toHaveAttribute('lang','en');
  });
  await check('Chinese safety, privacy, canonical and alternate-language metadata',async()=>{
    await page.goto(base+'/zh/foods/fish-sticks');
    await expect(page.locator('.safety-note')).toContainText('165°F');
    await expect(page.locator('.safety-note')).not.toContainText('145');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://airfryer.ybwdaisy.com/zh/foods/fish-sticks');
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href','https://airfryer.ybwdaisy.com/foods/fish-sticks');
    await page.goto(base+'/zh/privacy');
    await expect(page.locator('#analytics-status')).toContainText(production ? '您尚未选择是否允许统计' : '当前未启用统计');
    await expect(page.locator('article')).toContainText('计量单位、食物集合、语言及统计偏好');
    expect(requests).toBe(0);
  });
  await check('both languages fit mobile and desktop with an accessible visible switch',async()=>{
    await mkdir('output',{recursive:true});
    for(const width of [320,375,768,1280,1920]) {
      await page.setViewportSize({width,height:900});
      for(const path of ['/','/zh','/zh/foods/chicken-breast','/zh/categories/frozen','/zh/methodology']) {
        await page.goto(base+path);
        await expect(page.locator('.language-toggle')).toBeVisible();
        const box=await page.locator('.header-controls').boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        if(width===1280&&path==='/zh')await page.screenshot({path:'output/chinese-home-desktop.png'});
        if(width===375&&path==='/zh/foods/chicken-breast')await page.screenshot({path:'output/chinese-detail-mobile.png'});
      }
    }
  });
  await check('missing-page language switch uses the localized error page',async()=>{
    const response=await page.goto(base+'/missing-guide');expect(response.status()).toBe(404);
    await page.locator('[data-language-switch="zh"]').click();
    await expect(page).toHaveURL(/\/zh\/404$/);
    await expect(page.locator('h1')).toHaveText('这里还没有这条烹饪参考。');
    await page.locator('[data-language-switch="en"]').click();
    await expect(page).toHaveURL(/\/404$/);
    await expect(page.locator('h1')).toHaveText('That guide isn’t on the shelf.');
  });
  await check('Chinese content and links work without JavaScript or local storage',async()=>{
    const c=await browser.newContext({javaScriptEnabled:false});const p=await c.newPage();
    await p.goto(base+'/zh/foods/chicken-breast');
    await expect(p.locator('[data-variant-panel]:visible')).toHaveCount(4);
    await expect(p.locator('h1')).toHaveText('鸡胸肉');
    await p.locator('[data-language-switch="en"]').click();await expect(p.locator('h1')).toHaveText('Chicken breast');
    await c.close();
    const blocked=await browser.newContext();await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked');}});});
    const p2=await blocked.newPage();await p2.goto(base);await p2.locator('[data-language-switch="zh"]').click();
    await expect(p2.locator('h1')).toHaveText('今天用空气炸锅做什么？');await blocked.close();
  });
  await check('analytics consent remains shared across language routes and translated',async()=>{
    const c=await browser.newContext();let google=0;
    await c.route(/googletagmanager\.com|google-analytics\.com/,r=>{google++;return r.fulfill({contentType:'text/javascript',body:''});});
    await c.route(base+'/**',async route=>{
      if(route.request().resourceType() !== 'document') return route.continue();
      const response=await route.fetch();
      if((response.headers()['content-type']||'').includes('text/html'))await route.fulfill({response,body:(await response.text()).replace(/<meta\b[^>]*name="ga-measurement-id"[^>]*>/,'<meta name="ga-measurement-id" content="G-B34CBGW0EF">')});
      else await route.fulfill({response});
    });
    const p=await c.newPage();await p.goto(base+'/zh');expect(google).toBe(0);
    await p.getByRole('button',{name:'允许统计',exact:true}).click();
    await expect(p.locator('#google-analytics-tag')).toHaveCount(1);
    await p.locator('[data-language-switch="en"]').click();await expect(p.locator('#consent-banner')).toBeHidden();
    await p.locator('[data-privacy-settings]').click();await p.getByRole('button',{name:'Reject analytics',exact:true}).click();
    const before=google;await p.goto(base+'/zh/privacy');
    await expect(p.locator('#analytics-status')).toHaveText('您当前的选择：拒绝统计。');expect(google).toBe(before);
    await c.unrouteAll({behavior:'wait'});await c.close();
  });
  expect(errors).toEqual([]);
  await writeFile('output/language-results.json',JSON.stringify({base,checks:results,pageErrors:errors,googleRequests:requests},null,2));
} finally { await Promise.allSettled(browser.contexts().map(c=>c.unrouteAll({behavior:'wait'})));await browser.close(); }
