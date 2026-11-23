import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, cp, rm, unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {validateManifest, manifestFiles, checkOnlineContract, projectRoot, contractBase} from '../scripts/funnel-manifest.mjs';

const source = JSON.parse(await readFile(join(projectRoot,'analytics/funnels.json'),'utf8'));
const copy = () => structuredClone(source);

async function fixture() {
  const root = await mkdtemp(join(tmpdir(),'airfryer-funnels-'));
  await mkdir(join(root,'analytics'),{recursive:true});
  await cp(join(projectRoot,'analytics/contracts'),join(root,'analytics/contracts'),{recursive:true});
  await cp(join(projectRoot,'analytics/funnels.json'),join(root,'analytics/funnels.json'));
  return root;
}

test('the product manifest satisfies the cached public schema and actual event constants', async()=>{
  assert.equal(await validateManifest(source),source);
});

test('wrong hostname, absent QA policy, unknown schema version and extra fields fail', async()=>{
  for(const change of [
    (m: typeof source)=>{m.hostname='www.airfryer.ybwdaisy.com';},
    (m: typeof source)=>{delete m.qaPolicy;},
    (m: typeof source)=>{m.qaPolicy='send-debug-events';},
    (m: typeof source)=>{m.schemaVersion=2;},
    (m: typeof source)=>{m.token='not-a-manifest-field';},
  ]) {const m=copy();change(m);await assert.rejects(validateManifest(m));}
});

test('duplicate IDs/events and self-declared events outside the real contract fail', async()=>{
  const ids=copy();ids.funnels.push(structuredClone(ids.funnels[0]));await assert.rejects(validateManifest(ids),/Duplicate stable/);
  const events=copy();events.events.push(events.events[0]);await assert.rejects(validateManifest(events),/Duplicate event/);
  const invented=copy();invented.events.push('invented_conversion');invented.funnels[0].definition.steps[0].event='invented_conversion';await assert.rejects(validateManifest(invented),/actual analytics contract/);
  const undeclared=copy();undeclared.funnels[0].definition.steps[0].event='page_view';await assert.rejects(validateManifest(undeclared),/undeclared/);
});

test('step events accept a finite declared OR set and reject regexes, repeats and empty alternatives', async()=>{
  const good=copy();good.funnels[0].definition.steps[0].event='food_search|food_select';await validateManifest(good);
  for(const value of ['food_search|food_search','food_search|page_view','food_search|','food_.*','food_search||food_select']) {
    const m=copy();m.funnels[0].definition.steps[0].event=value;await assert.rejects(validateManifest(m));
  }
});

test('invalid intervals, filters, source URLs and event OR limits fail without changing definitions', async()=>{
  for(const change of [
    (m: typeof source)=>{m.funnels[0].definition.steps[1].withinSeconds=0;},
    (m: typeof source)=>{m.funnels[0].definition.filters[0].match='WILDCARD';},
    (m: typeof source)=>{m.funnels[0].definition.steps[0].event=Array(11).fill('food_select').join('|');},
    (m: typeof source)=>{m.funnels[0].source.url='http://example.com';},
  ]) {const m=copy();change(m);await assert.rejects(validateManifest(m));}
});

test('generation copies original bytes; missing, stale and built artifacts fail checks', async()=>{
  const root=await fixture();
  try {
    await assert.rejects(manifestFiles(root));
    await manifestFiles(root,{write:true});
    const path=join(root,'public/.well-known/site-pulse.json');
    const bytes=await readFile(join(root,'analytics/funnels.json'));
    assert.deepEqual(await readFile(path),bytes);
    await writeFile(path,'{}');await assert.rejects(manifestFiles(root),/differs/);
    await manifestFiles(root,{write:true});await assert.rejects(manifestFiles(root,{dist:true}));
    await mkdir(join(root,'dist/.well-known'),{recursive:true});await writeFile(join(root,'dist/.well-known/site-pulse.json'),bytes);
    await manifestFiles(root,{dist:true});
    await unlink(join(root,'analytics/funnels.json'));await assert.rejects(manifestFiles(root,{write:true}));
  } finally {await rm(root,{recursive:true,force:true});}
});

test('invalid source or missing cached schema fails before overwriting a published artifact', async()=>{
  const root=await fixture();
  try {
    await manifestFiles(root,{write:true});const path=join(root,'public/.well-known/site-pulse.json'),before=await readFile(path);
    await writeFile(join(root,'analytics/funnels.json'),'{broken');await assert.rejects(manifestFiles(root,{write:true}));assert.deepEqual(await readFile(path),before);
    await writeFile(join(root,'analytics/funnels.json'),JSON.stringify(source));
    await unlink(join(root,'analytics/contracts/funnels-v1.schema.json'));await assert.rejects(manifestFiles(root,{write:true}));assert.deepEqual(await readFile(path),before);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('online contract checks require available and byte-identical JSON/Markdown, with no silent fallback', async()=>{
  const fetcher: typeof fetch=async input=>{const url=input instanceof Request?input.url:String(input);return new Response(await readFile(join(projectRoot,'analytics/contracts',url.slice(contractBase.length))),{status:200});};
  await checkOnlineContract({fetcher});
  await assert.rejects(checkOnlineContract({fetcher:async()=>new Response('missing',{status:404})}),/unavailable/);
  await assert.rejects(checkOnlineContract({fetcher:async()=>new Response('{}',{status:200})}),/differs/);
  await assert.rejects(checkOnlineContract({fetcher:async()=>{throw new Error('offline');}}),/offline/);
});
