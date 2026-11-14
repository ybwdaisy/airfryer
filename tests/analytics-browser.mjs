import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {analyticsOrigin,serveAnalyticsOrigin} from './analytics-fixture.mjs';
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:4338';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const passed=[],errors=[];let sdkRequests=0;
const check=async(name,run)=>{await run();passed.push(name);console.log('PASS '+name)};
async function fixture({granted=false}={}) {
 const context=await browser.newContext({viewport:{width:390,height:844}}),events=[];
 await context.exposeBinding('__recordAnalytics',(_,name,params)=>{events.push({name,params});});
 await context.addInitScript(({granted})=>{
  if(granted && !localStorage.getItem('airfryer:analytics:v1'))localStorage.setItem('airfryer:analytics:v1','granted');
  const layer=[];const push=layer.push.bind(layer);
  layer.push=(...items)=>{for(const item of items){const args=Array.from(item);if(args[0]==='event')void window.__recordAnalytics(args[1],args[2]);}return push(...items);};window.dataLayer=layer;
 },{granted});
 await context.route(/googletagmanager\.com|google-analytics\.com/,r=>{sdkRequests++;return r.fulfill({contentType:'text/javascript',body:''});});
 await serveAnalyticsOrigin(context,base);
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const count=name=>events.filter(e=>e.name===name).length;
 const close=async()=>{await context.unrouteAll({behavior:'wait'});await context.close();};
 return {context,page,events,count,close};
}
try {
 await check('unconsented reading is not replayed; direct recipe visits and post-consent instruction reading are recorded',async()=>{
  const f=await fixture();const {page:p}=f;await p.clock.install();await p.goto(analyticsOrigin+'/zh/china/foods/cn-orleans-wings?qa=1');
  await p.locator('.instructions').scrollIntoViewIfNeeded();await p.clock.runFor(12000);expect(f.events).toEqual([]);
  await p.locator('[data-consent=granted]').click();await expect.poll(()=>f.count('airfryer_guide_view')).toBe(1);expect(f.count('airfryer_guide_engaged')).toBe(0);
  await p.locator('.instructions').scrollIntoViewIfNeeded();await expect.poll(()=>f.events.some(e=>e.name==='airfryer_section_view'&&e.params.section==='instructions')).toBe(true);await p.clock.runFor(10500);await expect.poll(()=>f.count('airfryer_guide_engaged')).toBe(1);
  const e=f.events.find(e=>e.name==='airfryer_guide_engaged');expect(e.params).toMatchObject({food_collection:'cn',ui_language:'zh',measurement_units:'c',food_slug:'cn-orleans-wings',condition:'default',qa_traffic:'yes',tool_id:'airfryer',analytics_version:'2',read_seconds:10});
  await p.clock.runFor(15000);expect(f.count('airfryer_guide_engaged')).toBe(1);await f.close();
 });
 await check('stored consent resolves the URL condition before logging the first guide view',async()=>{
  const f=await fixture({granted:true});await f.page.goto(analyticsOrigin+'/foods/chicken-breast?variant=medium&unit=c');await expect.poll(()=>f.count('airfryer_guide_view')).toBe(1);expect(f.events.find(e=>e.name==='airfryer_guide_view').params).toMatchObject({condition:'medium',measurement_units:'c',ui_language:'en',food_collection:'us'});
  await f.page.locator('#variant-select').selectOption('large');await expect.poll(()=>f.count('airfryer_guide_view')).toBe(2);expect(f.events.filter(e=>e.name==='airfryer_guide_view').map(e=>e.params.condition)).toEqual(['medium','large']);await f.close();
 });
 await check('typing, submit and click share one search intent; all selection entrances are measured without raw query text',async()=>{
  const f=await fixture({granted:true});const p=f.page;await p.goto(analyticsOrigin+'/zh');await expect.poll(()=>f.count('airfryer_list_view')).toBe(1);
  await p.locator('#search-input').fill('奥尔良');await expect.poll(()=>f.count('food_search')).toBe(1);await p.locator('#food-search').evaluate(form=>form.requestSubmit());expect(f.count('food_search')).toBe(1);await p.locator('[data-food-link=cn-orleans-wings]').first().click();await expect.poll(()=>f.count('food_select')).toBe(1);expect(f.events.find(e=>e.name==='food_select').params.entry_point).toBe('search');
  const related=p.locator('.related [data-food-link]').first();await related.click();await expect.poll(()=>f.count('food_select')).toBe(2);expect(f.events.filter(e=>e.name==='food_select')[1].params.entry_point).toBe('related');
  await p.goto(analyticsOrigin+'/zh');await p.locator('.featured-link').click();await expect.poll(()=>f.count('food_select')).toBe(3);expect(f.events.filter(e=>e.name==='food_select')[2].params.entry_point).toBe('featured');
  await p.goto(analyticsOrigin+'/zh');await p.locator('#search-input').fill('private-test@example.com');await p.locator('#food-search').evaluate(form=>form.requestSubmit());await expect.poll(()=>f.count('search_no_results')).toBe(1);expect(JSON.stringify(f.events)).not.toMatch(/private-test|@example/);for(const e of f.events.filter(e=>['food_search','search_no_results'].includes(e.name)))expect(JSON.stringify(e.params)).not.toMatch(/奥尔良|private-test|@example/);await f.close();
 });
 await check('search examples deduplicate intent; query clearing and category recovery retain safe event parameters',async()=>{
  const f=await fixture({granted:true}),p=f.page;await p.goto(analyticsOrigin+'/zh');
  const example=p.locator('[data-search-example="鸡翅"]');await example.click();await expect.poll(()=>f.count('food_search')).toBe(1);await example.click();expect(f.count('food_search')).toBe(1);
  await p.locator('[data-clear-query]').click();await expect.poll(()=>f.count('search_clear')).toBe(1);await p.locator('[data-category-filter=meat]').click();await p.locator('[data-search-example="薯条"]').click();await expect(p.locator('[data-category-search-hint]')).toBeVisible();await expect.poll(()=>f.count('search_no_results')).toBe(1);await p.locator('[data-reset-category]').click();await expect.poll(()=>f.count('food_search')).toBe(2);await expect(p.locator('#search-input')).toHaveValue('薯条');expect(JSON.stringify(f.events)).not.toMatch(/鸡翅|薯条/);await f.close();
 });
 await check('language event is single and keeps current/target language separate; no-op preference clicks do not inflate counts',async()=>{
  const f=await fixture({granted:true});const p=f.page;await p.goto(analyticsOrigin+'/');await p.locator('[data-unit=f]').click();expect(f.count('unit_change')).toBe(0);await p.locator('.collection-switch [data-region-select=us]').click();expect(f.count('region_change')).toBe(0);
  await p.locator('[data-language-switch=zh]').click();await expect.poll(()=>f.count('language_change')).toBe(1);expect(f.events.find(e=>e.name==='language_change').params).toMatchObject({ui_language:'en',target_language:'zh',food_collection:'us'});await f.close();
 });
 await check('background or off-screen time cannot qualify; revocation stops observers, timers and subsequent events',async()=>{
  const f=await fixture({granted:true});const p=f.page;await p.clock.install();await p.goto(analyticsOrigin+'/zh/china/foods/cn-orleans-wings');await expect.poll(()=>f.count('airfryer_guide_view')).toBe(1);await p.clock.runFor(15000);expect(f.count('airfryer_guide_engaged')).toBe(0);
  await p.locator('.instructions').scrollIntoViewIfNeeded();await expect.poll(()=>f.events.some(e=>e.name==='airfryer_section_view'&&e.params.section==='instructions')).toBe(true);
  await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));});await p.clock.runFor(20000);expect(f.count('airfryer_guide_engaged')).toBe(0);
  await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});document.dispatchEvent(new Event('visibilitychange'));});await p.locator('[data-privacy-settings]').click();await p.locator('[data-consent=denied]').click();const before=f.events.length;await p.clock.runFor(20000);await p.locator('[data-unit=f]').click();expect(f.events.length).toBe(before);await f.close();
 });
 await check('withdrawal in another tab cancels pending navigation before destination delivery',async()=>{
  const f=await fixture({granted:true}),p=f.page;await p.goto(analyticsOrigin+'/');await expect.poll(()=>f.count('airfryer_list_view')).toBe(1);
  const other=await f.context.newPage();await other.goto(analyticsOrigin+'/foods/chicken-breast');await expect(other.locator('#google-analytics-tag')).toHaveCount(1);
  let release,arrived;const gate=new Promise(r=>release=r),entered=new Promise(r=>arrived=r);
  await f.context.route(analyticsOrigin+'/zh/us*',async route=>{arrived();await gate;await route.fallback();});
  const nav=p.locator('[data-language-switch=zh]').click();await entered;
  await other.locator('[data-privacy-settings]').click();await other.locator('[data-consent=denied]').click();await expect(other.locator('#google-analytics-tag')).toHaveCount(0);release();await nav;
  await expect(p).toHaveURL(analyticsOrigin+'/zh/us');await expect(p.locator('#google-analytics-tag')).toHaveCount(0);expect(f.count('language_change')).toBe(0);expect(await p.evaluate(()=>sessionStorage.getItem('airfryer:pending-navigation:v2'))).toBe(null);await f.close();
 });
 await check('clearing all local preferences in another tab returns analytics to opt-in',async()=>{
  const f=await fixture({granted:true}),p=f.page;await p.goto(analyticsOrigin+'/zh/china/foods/cn-orleans-wings');await expect(p.locator('#google-analytics-tag')).toHaveCount(1);
  const other=await f.context.newPage();await other.goto(analyticsOrigin+'/foods/chicken-breast');await expect(other.locator('#google-analytics-tag')).toHaveCount(1);await other.evaluate(()=>localStorage.clear());
  await expect(p.locator('#google-analytics-tag')).toHaveCount(0);await expect(p.locator('#consent-banner')).toBeVisible();const before=f.events.length;await p.locator('[data-unit=f]').click();expect(f.events.length).toBe(before);await f.close();
 });
 await check('storage-blocked navigation uses a bounded fallback and still opens the requested language',async()=>{
  const f=await fixture({granted:true});await f.context.addInitScript(()=>{Object.defineProperty(window,'sessionStorage',{get(){throw new Error('Storage blocked');}});});
  await f.page.goto(analyticsOrigin+'/');await f.page.locator('[data-language-switch=zh]').click();await expect(f.page).toHaveURL(analyticsOrigin+'/zh/us');await expect.poll(()=>f.count('language_change')).toBe(1);await f.close();
 });
 await check('sources are auxiliary interactions; only source hostname/role is sent',async()=>{
  const f=await fixture({granted:true});const p=f.page;await p.goto(analyticsOrigin+'/zh/china/foods/cn-orleans-wings');await p.locator('.source-entry').first().locator('summary').click();await expect.poll(()=>f.count('airfryer_source_open')).toBe(1);expect(f.events.find(e=>e.name==='airfryer_source_open').params.reference_role).toBe('reference');await f.close();
 });
 await check('copied production identifiers on a Vercel alias never enable collection',async()=>{
  const c=await browser.newContext();await c.addInitScript(()=>localStorage.setItem('airfryer:analytics:v1','granted'));let google=0;await c.route(/googletagmanager\.com|google-analytics\.com/,r=>{google++;return r.abort();});
  await c.route('https://airfryer-review.vercel.app/**',async route=>{const u=new URL(route.request().url()),response=await route.fetch({url:base+u.pathname+u.search});const body=await response.body();await route.fulfill({response,body:(response.headers()['content-type']||'').includes('text/html')?body.toString().replace(/<meta\b[^>]*name="ga-measurement-id"[^>]*>/,'<meta name="ga-measurement-id" content="G-B34CBGW0EF">'):body});});
  const p=await c.newPage();await p.goto('https://airfryer-review.vercel.app/');await expect(p.locator('[data-food-row]:visible')).toHaveCount(50);await expect(p.locator('#google-analytics-tag')).toHaveCount(0);expect(google).toBe(0);await c.unrouteAll({behavior:'wait'});await c.close();
 });
 expect(errors).toEqual([]);await mkdir('output/analytics-v2',{recursive:true});await writeFile('output/analytics-v2/browser.json',JSON.stringify({base,checks:passed,errors,interceptedMockSdkRequests:sdkRequests},null,2));
} finally {await browser.close();}
