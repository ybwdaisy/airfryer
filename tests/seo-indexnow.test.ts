import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,cp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {validateIndexNow,submitIndexNow,endpoint} from '../scripts/indexnow.mjs';
const config=JSON.parse(await readFile('seo/indexnow.json','utf8'));
const changes=JSON.parse(await readFile('seo/changes-2026-11-23.json','utf8'));
const now=Date.parse('2026-11-23T12:00:00Z');
const fakeFetch=(handler:(url:string,options?:RequestInit)=>Response|Promise<Response>):typeof fetch=>async(input,options)=>handler(input instanceof Request?input.url:String(input),options);
test('IndexNow limits notifications to this exact host and canonical query-free recipe URLs',()=>{
 assert.equal(validateIndexNow(config,changes,now,true).urlList.length,12);
 for(const url of ['https://other.example/foods/a','http://airfryer.ybwdaisy.com/foods/a','https://airfryer.ybwdaisy.com/settings','https://airfryer.ybwdaisy.com/foods/a?qa=1','https://airfryer.ybwdaisy.com/foods/a#source'])assert.throws(()=>validateIndexNow(config,{...changes,urls:[url]},now));
 assert.throws(()=>validateIndexNow(config,{...changes,urls:[changes.urls[0],changes.urls[0]]},now));
 assert.throws(()=>validateIndexNow({...config,host:'example.com'},changes,now));
 assert.throws(()=>validateIndexNow(config,{...changes,updatedAt:'2020-01-01'},now,true));
 assert.throws(()=>validateIndexNow(config,{...changes,updatedAt:'2026-02-31'},now));
});
async function fixture(){const root=await mkdtemp(join(tmpdir(),'airfryer-indexnow-'));for(const path of ['seo','src/data'])await mkdir(join(root,path),{recursive:true});await cp('seo',join(root,'seo'),{recursive:true});await cp('src/data/entry-guides.json',join(root,'src/data/entry-guides.json'));await mkdir(join(root,'public'));await cp('public/'+config.key+'.txt',join(root,'public',config.key+'.txt'));return root;}
test('dry run never uses the network; unreadable keys and noncanonical pages stop before notification',async()=>{
 const root=await fixture();try{
  await submitIndexNow({root,fetcher:async()=>{throw new Error('must not fetch');}});
  const calls:string[]=[];
  await assert.rejects(submitIndexNow({root,submit:true,now,fetcher:fakeFetch(async url=>{calls.push(url);return new Response('missing',{status:404});})}));assert.deepEqual(calls,[config.keyLocation]);
  calls.length=0;await assert.rejects(submitIndexNow({root,submit:true,now,fetcher:fakeFetch(async url=>{calls.push(url);return new Response(url===config.keyLocation?config.key:'<link rel="canonical" href="https://example.com/">');})}));assert.ok(!calls.includes(endpoint));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('accepted notification records its HTTP status and prevents resubmitting the unchanged batch',async()=>{
 const root=await fixture();try{
  const posts:string[]=[];const fetcher=fakeFetch(async(url,options)=>{if(url===endpoint){assert.equal(options?.method,'POST');posts.push(url);return new Response('',{status:202});}return new Response(url===config.keyLocation?config.key:`<link rel="canonical" href="${url}"><h1>Public guide</h1>`);});
  const receipt=await submitIndexNow({root,submit:true,now,fetcher});assert.ok('status' in receipt && 'indexingConfirmed' in receipt);assert.equal(receipt.status,202);assert.equal(receipt.indexingConfirmed,false);assert.equal(posts.length,1);
  await assert.rejects(submitIndexNow({root,submit:true,now,fetcher}),/already has a receipt/);assert.equal(posts.length,1);
 }finally{await rm(root,{recursive:true,force:true});}
});
