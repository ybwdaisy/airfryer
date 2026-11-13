import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { foodSchema } from '../src/lib/schema.ts';
import { minutes, temperature, selectVariant, safetyGuides } from '../src/lib/format.ts';

const foods = ['a', 'b'].flatMap(suffix => foodSchema.array().parse(JSON.parse(readFileSync(new URL(`../src/data/foods-${suffix}.json`, import.meta.url), 'utf8'))));
test('50 distinct food subjects retain independently authored source records', () => {
  assert.equal(foods.length, 50);
  assert.equal(new Set(foods.map(f => f.slug)).size, 50);
  for (const food of foods) for (const variant of food.variants) {
    assert.ok(variant.sources.length >= 2, food.slug);
    assert.ok(new Set(variant.sources.map(s => new URL(s.url).hostname.replace(/^www\./, ''))).size >= 2, food.slug);
  }
});
test('invalid cooking ranges and duplicate variant IDs are rejected', () => {
  const sample = structuredClone(foods[0]);
  sample.variants[0].minutes = [30, 10];
  assert.equal(foodSchema.safeParse(sample).success, false);
  sample.variants[0].minutes = [10, 30];
  sample.variants.push(structuredClone(sample.variants[0]));
  assert.equal(foodSchema.safeParse(sample).success, false);
});
test('unit display converts exactly without inventing an appliance setting', () => {
  assert.equal(temperature(400, 'c'), '204.4°C');
  assert.equal(temperature(380, 'c'), '193.3°C');
  assert.equal(temperature(400, 'f'), '400°F');
  assert.equal(minutes([10, 10]), '10');
  assert.equal(minutes([10, 12]), '10-12');
  assert.match(safetyGuides.poultry, /165°F \(74°C\)/);
});
test('unknown condition never extrapolates, and raw branded fish sticks keep stricter guidance', () => {
  const breast = foods.find(f => f.slug === 'chicken-breast')!;
  assert.equal(selectVariant(breast.variants, 'unknown-10lb').id, breast.variants[0].id);
  const sticks = foods.find(f => f.slug === 'fish-sticks')!.variants[0];
  assert.match(sticks.safetyOverride!.text, /165/);
  assert.match(sticks.portion, /uncooked/);
  const nuggets = foods.find(f => f.slug === 'chicken-nuggets')!.variants[0];
  assert.match(nuggets.portion, /fully cooked/);
});
