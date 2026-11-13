import {chromium, expect} from '@playwright/test';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4338';
const browser = await chromium.launch({executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true});
const results=[], errors=[], layout=[]; let google=0;
const check=async(name,run)=>{await run();results.push(name);console.log('PASS '+name);};
await mkdir('output/regional-review',{recursive:true});
try {
 const c=await browser.newContext({locale:'zh-CN'});
 await c.route(/googletagmanager\.com|google-analytics\.com/,r=>{google++;return r.fulfill({body:''});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await check('fresh entry: English US, direct Chinese entry: China with Celsius and grams',async()=>{
  await p.goto(base);await expect(p.locator('html')).toHaveAttribute('lang','en');await expect(p.locator('[data-food-row]:visible')).toHaveCount(50);
  await p.goto(base+'/zh');await expect(p.locator('html')).toHaveAttribute('data-region','cn');await expect(p.locator('[data-food-row]:visible')).toHaveCount(11);await expect(p.locator('[data-unit=c]')).toHaveAttribute('aria-pressed','true');
  await p.locator('[data-food-link="cn-orleans-wings"]').click();await expect(p.locator('.ingredients')).toContainText('500克');await expect(p.locator('.cooking-values [data-temperature]')).toHaveText('200°C');await expect(p.locator('.without-thermometer')).toBeVisible();
 });
 await check('ribs disclose hob, braising and two heating phases before the cooking steps',async()=>{
  await p.goto(base+'/zh/china/foods/cn-garlic-ribs');await expect(p.locator('.before-start')).toContainText('无法只靠空气炸锅');await expect(p.locator('.recipe-timeline')).toContainText('15分钟');await expect(p.locator('.recipe-timeline')).toContainText('180°C');await expect(p.locator('.cooking-values')).toContainText('7');
  expect(await p.locator('.dependency-note').evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('.instructions')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 });
 await check('language retains collection and measurements; changing collection is explicit and remembered',async()=>{
  await p.goto(base+'/zh?q=红薯&category=vegetables');await p.locator('[data-language-switch=en]').click();await expect(p).toHaveURL(/\/china\?q=.*category=vegetables/);await expect(p.locator('html')).toHaveAttribute('data-region','cn');await expect(p.locator('[data-food-row]:visible')).toHaveCount(1);
  await p.locator('[data-unit=f]').click();await p.locator('.collection-switch [data-region-select=us]').click();await expect(p).toHaveURL(/\/\?unit=f&q=.*category=vegetables/);await expect(p.locator('html')).toHaveAttribute('data-region','us');
  await p.locator('[data-language-switch=zh]').click();await expect(p).toHaveURL(/\/zh\/us\?/);await expect(p.locator('[data-unit=f]')).toHaveAttribute('aria-pressed','true');
  await p.goto(base);await expect(p).toHaveURL(/\/zh\/us$/);
 });
 await check('old Chinese share link keeps original US condition and language switch keeps its query and source anchor',async()=>{
  await p.goto(base+'/zh/foods/chicken-breast?variant=medium&unit=c#sources-medium');await expect(p.locator('#variant-select')).toHaveValue('medium');await expect(p.locator('[data-variant-panel]:visible .cooking-values [data-temperature]')).toHaveText('193.3°C');await expect(p.locator('html')).toHaveAttribute('data-region','us');
  await p.locator('[data-language-switch=en]').click();await expect(p).toHaveURL(/\/foods\/chicken-breast\?variant=medium&unit=c#sources-medium$/);await expect(p.locator('#variant-select')).toHaveValue('medium');
  await p.goto(base+'/foods/chicken-breast?variant=small&unit=f#sources');expect(await p.locator('#sources').evaluate(el=>el.closest('[data-variant-panel]').getAttribute('data-variant-panel'))).toBe('small');
  await p.locator('.wordmark').click();await expect(p.locator('html')).toHaveAttribute('data-region','us');await expect(p.locator('[data-food-row]:visible')).toHaveCount(50);
 });
 await check('new seasoned breast exposes marinade, complete quantities and thermometer dependency',async()=>{
  await p.goto(base+'/foods/chicken-breast?unit=f');await expect(p.locator('#variant-select')).toHaveValue('seasoned-6oz');const panel=p.locator('[data-variant-panel]:visible');await expect(panel.locator('.advance-preparation')).toContainText('30 minutes');await expect(panel.locator('.ingredients')).toContainText('paprika');await expect(panel.locator('.before-start')).toContainText('thermometer');await expect(panel.locator('[data-temperature]')).toHaveText('375°F');
  await p.locator('[data-unit=c]').click();await expect(panel.locator('.ingredients')).not.toContainText('oz');await expect(panel.locator('.conversion-note')).toBeVisible();await expect(panel.locator('[data-temperature]')).toHaveText('190.6°C');await expect(panel.locator('[data-converted-label]')).toBeVisible();await panel.locator('[data-show-native-unit]').click();await expect(panel.locator('[data-temperature]')).toHaveText('375°F');
 });
 const raw=(await Promise.all(['a','b','cn'].map(x=>readFile(`src/data/foods-${x}.json`,'utf8').then(JSON.parse)))).flat();
 const sweep=[];
 await check('every recipe in both languages has one consistent measurement system in cooking guidance',async()=>{
  for(const lang of ['en','zh']) for(const unit of ['c','f']) for(const food of raw) {
   const path=`${lang==='zh'?'/zh':''}${food.region==='cn'?'/china':''}/foods/${food.slug}?unit=${unit}`;
   await p.goto(base+path);await expect(p.locator('[data-unit='+unit+']')).toHaveAttribute('aria-pressed','true');
   for(const panel of await p.locator('[data-variant-panel]').all()) {
    // Hidden alternatives are also converted, so choosing one cannot reveal stale units.
    const text=await panel.locator('.cooking-guidance').textContent();
    if(unit==='c') expect(text, path).not.toMatch(/°F|\b\d+(?:\.\d+)?\s*(?:oz|lbs?|inches|inch)\b|\d\s*(?:磅|盎司|英寸)/i);
    else expect(text, path).not.toMatch(/°C|\b\d+(?:\.\d+)?\s*(?:kg|grams?|cm|mm)\b|\d\s*(?:克|厘米|毫米)/i);
   }
   sweep.push(path);
  }
 });
 await writeFile('output/regional-review/unit-sweep.json',JSON.stringify(sweep,null,2));
 await check('mobile and desktop: controls, ingredients and all category choices fit',async()=>{
  await p.evaluate(()=>localStorage.clear());
  const paths=['/','/zh','/zh/china/foods/cn-orleans-wings','/zh/china/foods/cn-garlic-ribs','/foods/chicken-breast?unit=f','/foods/chicken-breast?unit=c','/zh/china/foods/cn-garlic-ribs?unit=f','/zh/us?unit=c'];
  for(const width of [320,375,390,768,1440,1920]) for(const path of paths) {
   await p.setViewportSize({width,height:900});await p.goto(base+path);await p.evaluate(()=>document.fonts.ready);
   const dimensions=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,font:document.fonts.check('500 16px "DM Sans"')}));expect(dimensions.scroll).toBeLessThanOrEqual(width);expect(dimensions.font).toBe(true);
   for(const selector of ['.header-controls','.collection-switch','.category-filter a']) for(const el of await p.locator(selector).all()) { const box=await el.boundingBox();if(box){expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);} }
   layout.push({path,width,...dimensions});
   if([375,1440].includes(width)) await p.screenshot({path:`output/regional-review/${path.split('?')[0].replaceAll('/','-')||'home'}${path.includes('?unit=')?'-'+path.split('?unit=')[1]:''}-${width}.png`,fullPage:true});
  }
 });
 await check('Chinese category descriptions match their own collection, not US ingredients',async()=>{
  await p.goto(base+'/zh/china/categories/bakery');await expect(p.locator('.page-intro')).toContainText('馒头片');await expect(p.locator('.page-intro')).not.toContainText('蒜香面包');
  await p.goto(base+'/china/categories/bakery');await expect(p.locator('.page-intro')).toContainText('mantou');
 });
 await check('no JavaScript: China metric instructions and US legacy options remain readable',async()=>{
  const nj=await browser.newContext({javaScriptEnabled:false});const pg=await nj.newPage();await pg.goto(base+'/zh/china/foods/cn-orleans-wings');await expect(pg.locator('.ingredients')).toContainText('500克');await expect(pg.locator('.cooking-values')).toContainText('200°C');await expect(pg.locator('.without-thermometer')).toBeVisible();await pg.goto(base+'/foods/chicken-breast');await expect(pg.locator('[data-variant-panel]:visible')).toHaveCount(4);await nj.close();
 });
 expect(errors).toEqual([]);expect(google).toBe(0);
 await writeFile('output/regional-review/results.json',JSON.stringify({base,checks:results,errors,googleRequests:google,layout},null,2));
} finally {await browser.close();}
