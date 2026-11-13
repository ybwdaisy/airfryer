import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {analyticsOrigin,serveAnalyticsOrigin} from './analytics-fixture.mjs';
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:4338';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const packets=[],sdk=[],errors=[];
const events=()=>packets.flatMap(p=>p.events);
const count=name=>events().filter(e=>e.en===name).length;
try {
 const c=await browser.newContext({viewport:{width:390,height:844}});
 await serveAnalyticsOrigin(c,base);
 // Fetch the actual public Google SDK. Block collection BEFORE dispatch, including unload beacons.
 await c.route(/google-analytics\.com|googleadservices\.com|doubleclick\.net/,async route=>{
  const req=route.request(),u=new URL(req.url()),lines=(req.postData()||'').split(/\r?\n/).filter(Boolean);
  const parsed=(lines.length?lines:['']).map(line=>Object.fromEntries([...u.searchParams,...new URLSearchParams(line)]));
  packets.push({host:u.hostname,path:u.pathname,method:req.method(),events:parsed});
  await route.fulfill({status:204,body:''});
 });
 c.on('request',r=>{if(r.url().includes('googletagmanager.com'))sdk.push({url:r.url(),referer:r.headers().referer ?? ''});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 const privateMarker='private-sdk-check@example.com';
 await p.goto(analyticsOrigin+'/zh/china/foods/cn-orleans-wings?qa=1&q='+encodeURIComponent(privateMarker));await expect(p.locator('#consent-banner')).toBeVisible();expect(sdk).toHaveLength(0);expect(packets).toHaveLength(0);
 await p.locator('[data-consent=denied]').click();await p.reload();await expect(p.locator('#consent-banner')).toBeHidden();expect(sdk).toHaveLength(0);expect(packets).toHaveLength(0);
 await p.locator('[data-privacy-settings]').click();await p.locator('[data-consent=granted]').click();await expect.poll(()=>count('page_view'),{timeout:20000}).toBe(1);await expect.poll(()=>count('airfryer_guide_view'),{timeout:15000}).toBe(1);
 await p.locator('.instructions').scrollIntoViewIfNeeded();await expect.poll(()=>count('airfryer_guide_engaged'),{timeout:18000}).toBe(1);
 await p.locator('[data-unit=f]').click();await expect.poll(()=>count('unit_change'),{timeout:10000}).toBe(1);
 await p.locator('[data-language-switch=en]').click();await expect.poll(()=>count('language_change'),{timeout:10000}).toBe(1);await expect.poll(()=>count('page_view'),{timeout:15000}).toBe(2);
 await p.locator('.source-entry summary').first().click();await expect.poll(()=>count('airfryer_source_open'),{timeout:10000}).toBe(1);
 await p.goto(analyticsOrigin+'/not-found-'+privateMarker);await expect.poll(()=>events().some(e=>e.en==='page_view'&&e.dl===analyticsOrigin+'/404'),{timeout:15000}).toBe(true);
 await p.goto(analyticsOrigin+'/china');await expect.poll(()=>count('airfryer_list_view'),{timeout:15000}).toBe(1);await p.locator('#search-input').fill('Orleans');await p.locator('.food-rows [data-food-link=cn-orleans-wings]').click();await expect.poll(()=>count('food_select'),{timeout:15000}).toBe(1);await expect.poll(()=>count('food_search'),{timeout:15000}).toBe(1);
 const core=events().filter(e=>['page_view','airfryer_guide_view','airfryer_guide_engaged','unit_change','language_change','airfryer_source_open','food_select','food_search'].includes(e.en));
 expect(core.length).toBeGreaterThanOrEqual(8);
 for(const e of core){expect(e.tid).toBe('G-B34CBGW0EF');expect(e.cg1 ?? e['ep.content_group']).toBe('airfryer_qa');expect(e['ep.tool_id']).toBe('airfryer');expect(e['ep.analytics_version']).toBe('2');expect(e['ep.qa_traffic']).toBe('yes');expect(e.dl).not.toContain('?');expect(e['ep.ui_language']).toMatch(/^(zh|en)$/);expect(e['ep.food_collection']).toBe('cn');}
 expect(JSON.stringify({packets,sdk})).not.toMatch(/private-sdk-check|%40example|q=private/);
 await p.locator('[data-privacy-settings]').click();await p.locator('[data-consent=denied]').click();const before=packets.length;
 await p.locator('[data-unit=c]').click();await p.locator('.instructions').scrollIntoViewIfNeeded();await expect(p.locator('#google-analytics-tag')).toHaveCount(0);
 // Use real wall-clock time to include the SDK's own batching timers after withdrawal.
 await new Promise(resolve=>setTimeout(resolve,2500));expect(packets.length).toBe(before);
 expect(errors).toEqual([]);await mkdir('output/analytics-v2',{recursive:true});await writeFile('output/analytics-v2/real-sdk.json',JSON.stringify({checkedAt:new Date().toISOString(),source:'Local build served at canonical origin; real Google SDK, collection transport intercepted before network dispatch.',sdk,counts:Object.fromEntries([...new Set(events().map(e=>e.en).filter(Boolean))].map(n=>[n,count(n)])),packets,errors,ingestionVerified:false},null,2));
 console.log('PASS actual Google SDK: complete v2 event parameters, no query leakage, no duplicate page views, no requests before consent or after withdrawal; all collection blocked');
 await c.unrouteAll({behavior:'wait'});await c.close();
} catch(error) {await mkdir('output/analytics-v2',{recursive:true});await writeFile('output/analytics-v2/real-sdk-failure.json',JSON.stringify({sdk,packets,errors,error:String(error)},null,2));throw error;} finally {await browser.close();}
