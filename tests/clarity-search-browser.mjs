import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:4341';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const checks=[],errors=[];
const check=async(name,run)=>{await run();checks.push(name);console.log('PASS '+name);};
try {
 const context=await browser.newContext({viewport:{width:375,height:812}});
 await context.route(/google-analytics\.com|googletagmanager\.com/,r=>r.abort());
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 await check('Chinese abbreviations, synonyms, traditional text and missing qualifiers find actual regional recipes',async()=>{
  await p.goto(base+'/zh');
  for(const [q,slug] of [['鸡翅','cn-orleans-wings'],['排骨','cn-garlic-ribs'],['地瓜','cn-whole-sweet-potato'],['雞翅','cn-orleans-wings'],['冷凍薯條','cn-frozen-thin-fries']]){
   await p.locator('#search-input').fill(q);await p.locator('#food-search').evaluate(el=>el.requestSubmit());await expect(p.locator('[data-food-row]:visible').first()).toHaveAttribute('data-slug',slug);
  }
  for(const q of ['bacon','chips','rice']){await p.locator('#search-input').fill(q);await p.locator('#food-search').evaluate(el=>el.requestSubmit());await expect(p.locator('[data-food-row]:visible')).toHaveCount(0);}
 });
 await check('English spelling mistakes, spaces, case and reordered tokens find the intended food',async()=>{
  await p.goto(base+'/');for(const [q,slug] of [['brocolli','broccoli'],['wingettes','chicken-wings'],['fries frozen','french-fries'],['ＦＲＥＮＣＨ－ＦＲＩＥＳ','french-fries']]){await p.locator('#search-input').fill(q);await p.locator('#food-search').evaluate(el=>el.requestSubmit());await expect(p.locator('[data-food-row]:visible').first()).toHaveAttribute('data-slug',slug);}
 });
 await check('category recovery keeps the query; clear and examples are keyboard accessible and preserve URL state',async()=>{
  await p.goto(base+'/zh');await p.locator('[data-category-filter=meat]').click();await p.locator('#search-input').fill('薯条');await expect(p.locator('[data-category-search-hint]')).toBeVisible();await p.locator('[data-reset-category]').click();await expect(p.locator('#search-input')).toHaveValue('薯条');await expect(p.locator('[data-food-row]:visible').first()).toHaveAttribute('data-slug','cn-frozen-thin-fries');await p.locator('[data-clear-query]').click();await expect(p.locator('#search-input')).toBeFocused();await expect(p.locator('[data-food-row]:visible')).toHaveCount(11);expect(new URL(p.url()).searchParams.has('q')).toBe(false);await p.locator('[data-search-example="鸡翅"]').focus();await p.keyboard.press('Enter');await expect(p.locator('[data-food-row]:visible')).toHaveCount(1);await p.reload();await expect(p.locator('#search-input')).toHaveValue('鸡翅');await expect(p.locator('[data-food-row]:visible')).toHaveCount(1);
 });
 await check('IME composition is not searched until the user commits the text',async()=>{
  await p.goto(base+'/zh');await p.clock.install();await p.locator('#search-input').dispatchEvent('compositionstart');await p.locator('#search-input').fill('鸡');await p.clock.runFor(1000);await expect(p.locator('[data-food-row]:visible')).toHaveCount(11);await p.locator('#search-input').fill('鸡翅');await p.locator('#search-input').dispatchEvent('compositionend');await p.clock.runFor(200);await expect(p.locator('[data-food-row]:visible')).toHaveCount(1);await p.clock.resume();
 });
 await check('first-screen settings and required preparation stay visible; equipment can be expanded',async()=>{
  await p.goto(base+'/zh');const first=await p.locator('.row-time').first().boundingBox();expect(first.y+first.height).toBeLessThanOrEqual(812);
  await p.goto(base+'/zh/china/foods/cn-orleans-wings');const box=await p.locator('.cooking-values').boundingBox();expect(box.y).toBeLessThan(800);await expect(p.locator('.recipe-alerts')).toContainText('6小时');await expect(p.locator('.cooking-values [data-temperature]')).toHaveText('200°C');await expect(p.locator('.equipment-list')).not.toHaveAttribute('open','');await p.locator('.equipment-list summary').click();await expect(p.locator('.equipment-list')).toHaveAttribute('open','');await p.goto(base+'/zh/china/foods/cn-garlic-ribs');await expect(p.locator('.recipe-alerts')).toContainText('炒锅');await expect(p.locator('.before-start')).toContainText('无法只靠空气炸锅');
 });
 await check('result measurements and complete recipes fit mobile and wide screens',async()=>{
  for(const width of [320,375,768,1440,1920]){await p.setViewportSize({width,height:900});for(const path of ['/zh','/','/zh/china/foods/cn-orleans-wings','/foods/chicken-breast']){await p.goto(base+path);expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}}
 });
 await check('without JavaScript all recipes and their quantities remain readable',async()=>{
  const c=await browser.newContext({javaScriptEnabled:false});const q=await c.newPage();await q.goto(base+'/zh');await expect(q.locator('[data-food-row]')).toHaveCount(11);await q.goto(base+'/zh/china/foods/cn-orleans-wings');await expect(q.locator('.ingredients')).toContainText('500克');await expect(q.locator('.instructions')).toBeVisible();await expect(q.locator('.without-thermometer')).toBeVisible();await c.close();
 });
 expect(errors).toEqual([]);await mkdir('output/clarity-search',{recursive:true});await writeFile('output/clarity-search/browser.json',JSON.stringify({base,checks,errors},null,2));await context.close();
} finally {await browser.close();}
