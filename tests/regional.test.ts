import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assembleCatalog } from '../src/lib/catalog.ts';
import { measureText, setting } from '../src/lib/measure.ts';
import { regionHome, switchLanguagePath, foodPath, regionFromPath } from '../src/lib/region.ts';
import { foodSchema } from '../src/lib/schema.ts';
const read = (name: string) => JSON.parse(readFileSync(new URL(`../src/data/${name}`, import.meta.url), 'utf8'));
const original = [...read('foods-a.json'), ...read('foods-b.json')];
const foods = assembleCatalog([...original, ...read('foods-cn.json')], read('recipe-overrides.json'));
test('regional collections are independent; existing US condition parameters and identifiers remain intact', () => {
  assert.equal(foods.filter(f => f.region === 'us').length, 50);
  assert.ok(foods.filter(f => f.region === 'cn').length > 5);
  for (const f of original) for (const v of f.variants) {
    const preserved = foods.find(x => x.slug === f.slug)!.variants.find(x => x.id === v.id)!;
    assert.equal(preserved.temperatureF, v.temperatureF);
    assert.deepEqual(preserved.minutes, v.minutes);
    assert.equal(preserved.state, v.state);
  }
  assert.equal(foods.find(f => f.slug === 'chicken-breast')!.variants[0].id, 'seasoned-6oz');
});
test('China rejects above-200°C phases and US rejects above-400°F settings', () => {
  const cn = foods.find(f => f.region === 'cn')!;
  assert.equal(foodSchema.safeParse({...cn, variants: [{...cn.variants[0], temperatureC: 205}]}).success, false);
  assert.equal(foodSchema.safeParse({...cn, variants: [{...cn.variants[0], steps: ['Start at 180°C for the first phase.', 'Then cook at 205°C to finish.']}]}).success, false);
  const us = foods.find(f => f.region === 'us')!;
  assert.equal(foodSchema.safeParse({...us, variants: [{...us.variants[0], temperatureF: 425}]}).success, false);
});
test('all conditions expose tools, ingredients, completion checks and complete Chinese equivalents', () => {
  const old = read('zh-foods.json'), regional = read('regional-zh.json');
  for (const f of foods) for (const v of f.variants) {
    const z = regional[f.slug]?.variants[v.id] ?? old[f.slug]?.variants[v.id];
    assert.ok(v.ingredients?.length && v.equipment?.length && v.completion && v.preheatDetail, `${f.slug}/${v.id}`);
    for (const key of ['ingredients','equipment','steps','notes','timeline'] as const) if (v[key]) assert.equal(z[key].length, v[key]!.length, `${f.slug}/${v.id}/${key}`);
    assert.ok(z.completion && z.preheatDetail, `${f.slug}/${v.id}: Chinese completion/preheat`);
  }
  const ribs = foods.find(f => f.slug === 'cn-garlic-ribs')!.variants[0];
  assert.equal(ribs.needsHob, true); assert.equal(ribs.minutes[0], 7);
  assert.ok(ribs.timeline!.length >= 3); assert.ok(ribs.withoutThermometer);
});
test('display conversion keeps whole ranges, dimensions and published safety pairs; does not invent a device notch', () => {
  assert.equal(setting(400,'c'), '204.4°C');
  assert.equal(setting(392,'c',200), '200°C');
  assert.equal(measureText('350–400°F; 5–6 oz; ½-inch thick','c'), '176.7–204.4°C; 142–170 g; 1.3 cm thick');
  assert.equal(measureText('7×7毫米，200克，200°C','f','zh'), '0.28 × 0.28 英寸，7.05oz，392°F');
  assert.equal(measureText('165°F (74°C)','c'), '74°C');
  assert.equal(measureText('3.7夸脱炸篮','c','zh'), '3.5升炸篮');
  assert.equal(measureText('1 tsp salt; ½ tbsp oil','c','zh'), '1茶匙 salt; 0.5汤匙 oil');
  assert.equal(measureText('1 tsp salt','c','zh').includes('毫升'), false);
});
test('language navigation keeps region, and old Chinese food paths retain US meaning', () => {
  assert.equal(regionHome('cn','zh'), '/zh');
  assert.equal(switchLanguagePath('/', 'us','zh'), '/zh/us');
  assert.equal(switchLanguagePath('/zh','cn','en'), '/china');
  assert.equal(foodPath('cn-orleans-wings','cn','zh'), '/zh/china/foods/cn-orleans-wings');
  assert.equal(regionFromPath('/zh/foods/chicken-wings'), 'us');
  assert.equal(regionFromPath('/zh/china/foods/cn-orleans-wings'), 'cn');
});
