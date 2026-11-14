import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:4341';
const recipes=[['cn-frozen-youtiao','油条'],['cn-brown-sugar-ciba','红糖糍粑'],['cn-frozen-hash-browns','薯饼'],['cn-egg-shouzhua-pancake','手抓饼'],['cn-garlic-pumpkin','南瓜'],['cn-sauced-enoki','金针菇'],['cn-roasted-peanuts','花生'],['cn-pepper-broccoli','西兰花'],['cn-crispy-banana','香蕉'],['cn-butter-sugar-toast','吐司'],['cn-frozen-popcorn-chicken','鸡米花']];
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const checks=[],errors=[];
const check=async(name,run)=>{await run();checks.push(name);console.log('PASS '+name);};
await mkdir('output/cn-expansion',{recursive:true});
try {
 const c=await browser.newContext({viewport:{width:375,height:812}});
 await c.route(/google-analytics\.com|googletagmanager\.com/,r=>r.abort());
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await check('China has 22 guides and all 11 additions are discoverable by everyday and traditional names',async()=>{
  await p.goto(base+'/zh');await expect(p.locator('[data-food-row]:visible')).toHaveCount(22);
  for(const [slug,q] of [...recipes,['cn-frozen-youtiao','油條'],['cn-brown-sugar-ciba','紅糖糍粑'],['cn-frozen-hash-browns','薯餅'],['cn-egg-shouzhua-pancake','手抓餅']]) {
   await p.locator('#search-input').fill(q);await p.locator('#food-search').evaluate(f=>f.requestSubmit());await expect(p.locator('[data-food-row]:visible').first()).toHaveAttribute('data-slug',slug);
  }
  await p.goto(base+'/china');for(const [q,slug] of [['youtiao','cn-frozen-youtiao'],['rice cakes','cn-brown-sugar-ciba'],['hash browns','cn-frozen-hash-browns'],['shouzhua','cn-egg-shouzhua-pancake'],['enoki','cn-sauced-enoki']]){await p.locator('#search-input').fill(q);await p.locator('#food-search').evaluate(f=>f.requestSubmit());await expect(p.locator('[data-food-row]:visible').first()).toHaveAttribute('data-slug',slug);}
  await p.goto(base+'/');await expect(p.locator('[data-food-row]:visible')).toHaveCount(50);
 });
 await check('two-stage ciba and hash browns show both real settings and separate stage times, including converted display',async()=>{
  for(const [slug,temps,times,total] of [['cn-brown-sugar-ciba',['180°C','200°C'],['8','6'],'14'],['cn-frozen-hash-browns',['160°C','180°C'],['10','5'],'15']]){
   await p.goto(base+'/zh/china/foods/'+slug);await p.locator('[data-unit=c]').click();await expect(p.locator('.cooking-values [data-temperature]')).toHaveText(temps);
   const values=await p.locator('.cooking-values > div:nth-child(2) dd').allTextContents();expect(values.map(v=>v.replace(/\D/g,''))).toEqual(times);await expect(p.locator('.phase-total')).toContainText(total);
   await p.locator('[data-unit=f]').click();await expect(p.locator('.cooking-values [data-temperature]')).toHaveText(temps.map(t=>`${Number(t.replace('°C',''))*9/5+32}°F`));await expect(p.locator('.conversion-note')).toBeVisible();await p.locator('[data-show-native-unit=c]').click();await expect(p.locator('.cooking-values [data-temperature]')).toHaveText(temps);
  }
  await p.goto(base+'/zh');await expect(p.locator('[data-slug=cn-brown-sugar-ciba] [data-temperature]')).toHaveText(['180°C','200°C']);await expect(p.locator('[data-slug=cn-brown-sugar-ciba] .row-time')).toContainText('气炸合计');
 });
 await check('every new guide has complete bilingual materials, steps, source records and consistent unit display',async()=>{
  for(const [slug] of recipes)for(const prefix of ['/zh/china/foods/','/china/foods/'])for(const unit of ['c','f']){
   await p.goto(base+prefix+slug+'?unit='+unit);await p.locator(`[data-unit=${unit}]`).click();await expect(p.locator('.ingredients li').first()).toBeVisible();expect(await p.locator('.instructions li').count()).toBeGreaterThanOrEqual(3);await expect(p.locator('.completion-check')).toBeVisible();expect(await p.locator('.source-entry').count()).toBeGreaterThanOrEqual(2);
   const text=await p.locator('.cooking-guidance').innerText();expect(text).not.toMatch(unit==='c'?/\d\s*°F|\d\s*(?:oz|inches)\b/:/\d\s*°C|\d\s*(?:克|grams?|厘米|cm)\b/);
  }
 });
 await check('packaging, syrup timing, no-preheat and chicken centre checks are actionable and visible',async()=>{
  await p.goto(base+'/zh/china/foods/cn-frozen-youtiao?unit=c');await p.locator('[data-unit=c]').click();await expect(p.locator('.cooking-guidance')).toContainText('思念');await expect(p.locator('.instructions')).toContainText('180°C');
  await p.goto(base+'/zh/china/foods/cn-brown-sugar-ciba');await expect(p.locator('.instructions li').last()).toContainText('出锅，再淋红糖浆');
  await p.goto(base+'/zh/china/foods/cn-frozen-hash-browns');await expect(p.locator('.cooking-facts')).toContainText('不预热');
  await p.goto(base+'/zh/china/foods/cn-frozen-popcorn-chicken');await expect(p.locator('.without-thermometer')).toContainText('中心也要冒热气');await expect(p.locator('.instructions')).toContainText('包装');
 });
 await check('stage measurements and longer ingredient names fit phones and desktop',async()=>{
  for(const width of [320,375,768,1440,1920]){await p.setViewportSize({width,height:900});for(const path of ['/zh','/china','/zh/china/foods/cn-brown-sugar-ciba','/china/foods/cn-frozen-hash-browns']){
   await p.goto(base+path);expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   expect(await p.locator('.row-temperature,.row-time,.cooking-values').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth+1))).toBe(true);
  }}
  await p.setViewportSize({width:375,height:812});await p.goto(base+'/zh/china/foods/cn-brown-sugar-ciba');await p.screenshot({path:'output/cn-expansion/ciba-mobile.png',fullPage:true});
  await p.setViewportSize({width:1440,height:900});await p.goto(base+'/zh');await p.screenshot({path:'output/cn-expansion/library-desktop.png',fullPage:true});
 });
 await check('no JavaScript still exposes both stages, ingredients and original sources',async()=>{
  const nojs=await browser.newContext({javaScriptEnabled:false}),q=await nojs.newPage();await q.goto(base+'/zh/china/foods/cn-brown-sugar-ciba');await expect(q.locator('.cooking-values [data-temperature]')).toHaveText(['180°C','200°C']);await expect(q.locator('.ingredients')).toContainText('红糖浆');await q.locator('.source-entry').first().locator('summary').click();await expect(q.locator('.source-entry').first()).toHaveAttribute('open','');await nojs.close();
 });
 expect(errors).toEqual([]);await writeFile('output/cn-expansion/results.json',JSON.stringify({base,checks,errors,newRecipes:recipes.length},null,2));await c.close();
} finally {await browser.close();}
