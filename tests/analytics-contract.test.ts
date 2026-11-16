import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeAnalyticsParams,pageType,analyticsEvents,canonicalAnalyticsPath,parsePendingNavigation,analyticsContentGroup} from '../src/lib/analytics-contract.ts';
test('telemetry drops raw input, urls, identities, arbitrary names and nonfinite measurements',()=>{
 assert.deepEqual(sanitizeAnalyticsParams({toString:'invalid',search_term:'private@example.com',source_url:'https://example.com/?q=private',food_slug:'../private',condition:'my email',results_count:Infinity,category:'arbitrary',page_location:'evil',tool_id:'other'}),{});
 assert.deepEqual(sanitizeAnalyticsParams({food_slug:'cn-orleans-wings',condition:'small',category:'meat',results_count:3.8,entry_point:'search',target_language:'zh',reference_host:'www.skinnytaste.com'}),{food_slug:'cn-orleans-wings',condition:'small',category:'meat',results_count:3,entry_point:'search',target_language:'zh',reference_host:'www.skinnytaste.com'});
 assert.ok(!analyticsEvents.includes('cooking_success' as never));
});
test('page classification includes both collections and historical routes',()=>{
 for(const path of ['/','/zh','/zh/us','/china'])assert.equal(pageType(path),'home');
 for(const path of ['/foods/chicken-breast','/zh/foods/chicken-breast','/zh/china/foods/cn-garlic-ribs'])assert.equal(pageType(path),'recipe');
 assert.equal(pageType('/zh/china/categories/bakery'),'category');assert.equal(pageType('/zh/privacy'),'privacy');assert.equal(pageType('/404'),'not_found');
});

test('navigation handoff is destination-bound, short-lived, sanitized and query-free',()=>{
 const record={name:'food_select',params:{food_slug:'cn-orleans-wings',search_term:'private@example.com'},source:{path:'/zh',collection:'cn',language:'zh',units:'c',qa:'no',category:'all'},target:'/zh/china/foods/cn-orleans-wings',createdAt:1000};
 const parse=(value:unknown,now=2000,target=record.target)=>parsePendingNavigation(JSON.stringify(value),now,target);
 assert.deepEqual(parse(record)!.params,{food_slug:'cn-orleans-wings'});assert.equal(parse(record,32000),null);assert.equal(parse(record,0),null);assert.equal(parse(record,2000,'/'),null);assert.equal(parse({...record,source:{...record.source,path:'/zh?q=private'}}),null);assert.equal(parse({...record,name:'arbitrary'}),null);
 const unit={...record,name:'unit_change',target:'/',source:{...record.source,path:'/settings',units:'f'},params:{unit:'c',previous_unit:'f',search_term:'private@example.com'}};
 assert.deepEqual(parse(unit,2000,'/')!.params,{unit:'c',previous_unit:'f'});assert.equal(parse(unit,2000,'/zh'),null);assert.equal(parse(unit,32000,'/'),null);
 assert.equal(canonicalAnalyticsPath('https://airfryer.ybwdaisy.com/zh?private=yes'),'/zh');assert.equal(canonicalAnalyticsPath('https://example.com/private'),'/404');assert.equal(canonicalAnalyticsPath('https://airfryer.ybwdaisy.com/private@example.com'),'/404');
});

test('predefined content groups isolate QA and enumerate only collection, interface and unit states',()=>{
 assert.equal(analyticsContentGroup({collection:'cn',language:'zh',units:'c',qa:'no'}),'airfryer_cn_zh_c');assert.equal(analyticsContentGroup({collection:'us',language:'en',units:'f',qa:'yes'}),'airfryer_qa');
});
