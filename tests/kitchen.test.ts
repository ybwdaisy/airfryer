import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultKitchen,parseKitchen,presetUnit,nativeUnit} from '../src/lib/kitchen.ts';
import {measureText} from '../src/lib/measure.ts';
import {canonicalAnalyticsPath,pageType} from '../src/lib/analytics-contract.ts';
test('kitchen defaults follow the first explicit browser region without changing language',()=>{
 assert.equal(defaultKitchen(['en-US']),'us');assert.equal(defaultKitchen(['en-GB']),'metric');assert.equal(defaultKitchen(['zh-CN']),'metric');assert.equal(defaultKitchen(['not valid','en','en-US']),'us');assert.equal(defaultKitchen([]),'metric');
});
test('only versioned known presets are restored',()=>{
 assert.equal(parseKitchen('{"version":1,"preset":"metric"}'),'metric');for(const raw of [null,'broken','{}','{"version":2,"preset":"us"}','{"version":1,"preset":"custom"}'])assert.equal(parseKitchen(raw),null);assert.equal(presetUnit('us'),'f');
});
test('ingredient conversion can preserve sourced cooking temperatures and authoritative safety pairs',()=>{
 assert.equal(measureText('400°F, 6 oz, 1 inch','c','en',true),'400°F, 170 g, 2.5 cm');
 assert.equal(measureText('180°C for 8 minutes; 200°C for 6 minutes','f','en',true),'180°C for 8 minutes; 200°C for 6 minutes');
 assert.equal(nativeUnit({temperatureC:200}),'c');assert.equal(nativeUnit({}),'f');
});
test('settings analytics have a canonical query-free path and their own page type',()=>{
 assert.equal(canonicalAnalyticsPath('https://airfryer.ybwdaisy.com/zh/settings?unit=c'),'/zh/settings');assert.equal(pageType('/settings'),'settings');
});
