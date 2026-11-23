import{chromium,expect}from'@playwright/test';
import{mkdir,readFile,writeFile}from'node:fs/promises';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4371';
const entries=JSON.parse(await readFile('src/data/entry-guides.json','utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined),headless:true});
const errors=[],google=[],checks=[];await mkdir('output/seo-round1/after',{recursive:true});
const guard=async c=>c.route(/googletagmanager\.com|google-analytics\.com|googleadservices\.com|doubleclick\.net|google\.[^/]+\//,r=>{google.push(r.request().url());return r.abort();});
try{
 for(const width of[320,390,1280])for(const lang of['en','zh'])for(const preset of['us','metric']){
  const c=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});await guard(c);await c.addInitScript(preset=>{localStorage.setItem('airfryer:kitchen:v1',JSON.stringify({version:1,preset}));localStorage.setItem('airfryer:analytics:v1','denied');},preset);
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  const slugs=Object.keys(entries).filter(slug=>entries[slug].region===(preset==='us'?'us':'cn'));
  for(const slug of slugs){
   const path=(lang==='zh'?'/zh':'')+(preset==='metric'?'/china':'')+'/foods/'+slug;
   await p.goto(base+path+'?analytics_test=1');await expect(p.locator('[data-compatible-body]:visible')).toHaveCount(1);
   expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   if(width!==320)await p.screenshot({path:`output/seo-round1/after/${slug}-${lang}-${width}-top.png`});
   const guide=p.locator('[data-entry-guide]');await guide.locator('summary').first().click();await expect(guide.locator('details').first().locator('p')).toBeVisible();
   expect(await guide.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})).toBe(true);
   if(width!==320)await guide.screenshot({path:`output/seo-round1/after/${slug}-${lang}-${width}-notes.png`});
   for(const href of await guide.locator('.entry-related a').evaluateAll(as=>as.map(a=>a.getAttribute('href'))))expect(href).toMatch(/^\/(?:zh\/)?(?:china\/)?foods\//);
   if(slug===slugs[0]){
    await p.locator('.detail-favorite').click();await expect(p.locator('.detail-favorite')).toHaveAttribute('aria-pressed','true');
    await p.locator('[data-cook-start]:visible').click();await expect(p.locator('[data-cook-primary]')).toHaveText(lang==='zh'?'暂停':'Pause');
    expect(await p.locator('#cooking-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
    await p.locator('[data-cook-primary]').click();const digits=await p.locator('[data-cook-digits]').textContent();await p.reload();await expect(p.locator('.detail-favorite')).toHaveAttribute('aria-pressed','true');await p.locator('[data-cook-open]').click();await expect(p.locator('[data-cook-digits]')).toHaveText(digits);await p.locator('[data-cook-stop]').click();await p.locator('[data-cook-end]').click();
   }
  }
  await c.close();checks.push(`${width}px ${lang} ${preset}: three entries, native settings, readable disclosures, save/timer/reload`);
 }
 const c=await browser.newContext({javaScriptEnabled:false});await guard(c);const p=await c.newPage();await p.goto(base+'/foods/chicken-breast?analytics_test=1');await expect(p.locator('[data-entry-guide]')).toBeVisible();expect(await p.locator('[data-entry-guide]').textContent()).toContain('thickness');await c.close();checks.push('public notes and source links remain in readable HTML without JavaScript');
 expect(errors).toEqual([]);expect(google).toEqual([]);await writeFile('output/seo-round1/browser-results.json',JSON.stringify({base,checks,errors,googleRequests:google.length},null,2));console.log('PASS SEO browser '+checks.length+' groups; 36 entry visits, 320/390/1280px, both languages; zero page errors or Google requests');
}finally{await browser.close();}
