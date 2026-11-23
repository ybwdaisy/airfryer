import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {origin,canonical,hasNoindex} from './seo-check.mjs';
export const endpoint='https://api.indexnow.org/indexnow';
export function validateIndexNow(config,changes,now=Date.now(),recent=false) {
 assert.equal(config.host,'airfryer.ybwdaisy.com');assert.match(config.key,/^[a-f0-9]{32}$/);
 assert.equal(config.keyLocation,origin+'/'+config.key+'.txt');
 assert.match(changes.updatedAt,/^\d{4}-\d{2}-\d{2}$/);assert.ok(Number.isFinite(Date.parse(changes.updatedAt)));assert.equal(new Date(changes.updatedAt).toISOString().slice(0,10),changes.updatedAt);assert.ok(changes.reason?.length);
 if(recent)assert.ok(now-Date.parse(changes.updatedAt)<=7*86400000&&Date.parse(changes.updatedAt)<=now+86400000,'Only a recent, genuinely changed release batch can be submitted');
 assert.ok(Array.isArray(changes.urls)&&changes.urls.length>0&&changes.urls.length<=100);
 assert.equal(new Set(changes.urls).size,changes.urls.length,'Duplicate notification URL');
 for(const value of changes.urls){const u=new URL(value);assert.equal(u.origin,origin);assert.ok(!u.search&&!u.hash&&!u.username&&!u.password);assert.match(u.pathname,/^\/(?:zh\/)?(?:china\/)?foods\/[a-z0-9-]+$/);}
 return {host:config.host,key:config.key,keyLocation:config.keyLocation,urlList:changes.urls};
}
export async function submitIndexNow({root=process.cwd(),submit=false,fetcher=fetch,now=Date.now(),changesFile='seo/changes-2026-11-23.json'}={}) {
 const config=JSON.parse(await readFile(join(root,'seo/indexnow.json'),'utf8'));
 assert.match(changesFile,/^seo\/changes-\d{4}-\d{2}-\d{2}\.json$/,'Use an explicit product release change list');
 const changes=JSON.parse(await readFile(join(root,changesFile),'utf8'));
 const payload=validateIndexNow(config,changes,now,submit);
 assert.equal((await readFile(join(root,'public',config.key+'.txt'),'utf8')).trim(),config.key);
 const entries=JSON.parse(await readFile(join(root,'src/data/entry-guides.json'),'utf8'));
 const allowed=new Set(Object.entries(entries).filter(([,e])=>e.updatedAt===changes.updatedAt).flatMap(([slug,e])=>['','/zh'].map(lang=>origin+lang+(e.region==='cn'?'/china':'')+'/foods/'+slug)));
 for(const url of changes.urls)assert.ok(allowed.has(url),'URL is not a materially updated entry in this release: '+url);
 if(!submit)return {dryRun:true,count:payload.urlList.length,urls:payload.urlList};
 const batch=createHash('sha256').update(JSON.stringify({updatedAt:changes.updatedAt,payload})).digest('hex');
 const receiptPath=join(root,'output/indexnow',batch+'.json');
 try {await readFile(receiptPath);throw new Error('This batch already has a receipt or an ambiguous attempt; review it instead of resubmitting unchanged URLs');}catch(e){if(e.code!=='ENOENT')throw e;}
 const keyResponse=await fetcher(config.keyLocation,{redirect:'error',signal:AbortSignal.timeout(20000)});
 assert.equal(keyResponse.status,200,'Production key file is not readable');assert.equal((await keyResponse.text()).trim(),config.key,'Production key does not match');
 for(const url of changes.urls){const r=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);const html=await r.text();assert.equal(canonical(html),url);assert.ok(!hasNoindex(html),'Do not notify a noindex URL');}
 await mkdir(join(root,'output/indexnow'),{recursive:true});
 const receipt={endpoint,at:new Date(now).toISOString(),urls:payload.urlList,status:'attempting',indexingConfirmed:false};
 await writeFile(receiptPath,JSON.stringify(receipt,null,2));
 try {
  const r=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify(payload),redirect:'error',signal:AbortSignal.timeout(30000)});
  Object.assign(receipt,{status:r.status,response:(await r.text()).slice(0,2000),accepted:r.status===200||r.status===202});
  await writeFile(receiptPath,JSON.stringify(receipt,null,2));
  assert.ok(receipt.accepted,'IndexNow did not accept notification: HTTP '+r.status);
  return {...receipt,receiptPath};
 }catch(e){if(receipt.status==='attempting'){receipt.status='unknown';receipt.error=e.message;await writeFile(receiptPath,JSON.stringify(receipt,null,2));}throw e;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const args=process.argv.slice(2);let submit=false,changesFile;
 for(let i=0;i<args.length;i++){if(args[i]==='--submit')submit=true;else if(args[i]==='--changes'&&args[i+1])changesFile=args[++i];else throw new Error('Use --changes seo/changes-YYYY-MM-DD.json and optional --submit; default is dry run');}
 submitIndexNow({submit,...(changesFile?{changesFile}: {})}).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
