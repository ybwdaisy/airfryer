import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
export const origin='https://airfryer.ybwdaisy.com';
export const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2].replaceAll('&amp;','&')]));
export const links=html=>[...html.matchAll(/<link\b[^>]*>/g)].map(m=>attrs(m[0]));
export const canonical=html=>links(html).find(a=>a.rel==='canonical')?.href;
export const hasNoindex=html=>[...html.matchAll(/<meta\b[^>]*>/g)].some(m=>{const a=attrs(m[0]);return a.name==='robots'&&a.content?.includes('noindex');});
export async function checkSeoBuild(root=process.cwd(),production=process.env.VERCEL_ENV==='production') {
 const sitemap=await readFile(join(root,'dist/sitemap.xml'),'utf8');
 const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
 assert.equal(new Set(urls).size,urls.length,'Duplicate sitemap URLs');
 const entries=JSON.parse(await readFile(join(root,'src/data/entry-guides.json'),'utf8'));
 const modified=new Map(Object.entries(entries).flatMap(([slug,e])=>['','/zh'].map(lang=>[origin+lang+(e.region==='cn'?'/china':'')+'/foods/'+slug,e.updatedAt])));
 const pages=new Map();
 for(const url of urls) {
  const u=new URL(url);assert.equal(u.origin,origin);assert.ok(!u.search&&!u.hash&&!u.pathname.endsWith('.html'));assert.ok(!/\/settings$/.test(u.pathname));
  const html=await readFile(join(root,'dist',u.pathname==='/'?'index.html':u.pathname.slice(1)+'.html'),'utf8');pages.set(url,html);
  assert.equal(canonical(html),url,'Noncanonical sitemap URL: '+url);
  assert.equal(hasNoindex(html),!production,'Indexability mismatch: '+url);
  assert.equal([...html.matchAll(/<h1\b/g)].length,1,'Expected one H1: '+url);
  assert.match(html,/<title>[^<]+<\/title>/);assert.match(html,/<meta\b[^>]*name="description"[^>]*content="[^"]+"/);
 }
 for(const [url,html]of pages) {
  const alternates=links(html).filter(a=>a.hreflang);
  assert.deepEqual(alternates.map(a=>a.hreflang).sort(),['en','x-default','zh-CN']);
  const currentLang=url.slice(origin.length).startsWith('/zh')?'zh-CN':'en';
  assert.equal(alternates.find(a=>a.hreflang===currentLang)?.href,url,'Alternate must include self');
  for(const a of alternates) {
   const other=pages.get(a.href);assert.ok(other,'Alternate must be a canonical indexable page: '+a.href);
   assert.ok(links(other).some(b=>b.hreflang===currentLang&&b.href===url),'Nonreciprocal alternate: '+url);
  }
  if(modified.has(url)) {
   assert.ok(html.includes('data-entry-guide'));assert.ok(html.includes(`datetime="${modified.get(url)}"`));
   const schemas=[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
   const page=schemas.find(s=>s['@type']==='WebPage');assert.equal(page?.url,url);assert.equal(page?.dateModified,modified.get(url));
   assert.ok(!schemas.some(s=>['Recipe','FAQPage','AggregateRating','Review'].includes(s['@type'])));
   assert.ok(html.includes('data-cook-start')&&html.includes('data-favorite'),'Existing cooking and save hooks missing');
  }
 }
 const dated=[...sitemap.matchAll(/<url><loc>([^<]*)<\/loc><lastmod>([^<]*)<\/lastmod><\/url>/g)];assert.equal(dated.length,modified.size);
 for(const [,url,date]of dated)assert.equal(date,modified.get(url),'Lastmod is limited to actually updated entry notes');
 for(const path of ['settings','zh/settings','404'])assert.ok(hasNoindex(await readFile(join(root,'dist',path+'.html'),'utf8')));
 const robots=await readFile(join(root,'dist/robots.txt'),'utf8');assert.equal(robots,production?'User-agent: *\nAllow: /\nSitemap: '+origin+'/sitemap.xml\n':'User-agent: *\nDisallow: /\n');
 return {canonicalUrls:urls.length,updatedUrls:modified.size,production};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))checkSeoBuild().then(r=>console.log('PASS SEO build '+JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1;});
