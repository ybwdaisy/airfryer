import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { languageFromPath, localizedPath, resultLabel } from '../src/lib/locale.ts';

const read = (name: string) => JSON.parse(readFileSync(new URL(`../src/data/${name}`, import.meta.url), 'utf8'));
const original = [...read('foods-a.json'), ...read('foods-b.json')];
const chinese = read('zh-foods.json');
const numbers = (text: string) => (text.match(/\d+(?:\.\d+)?|[¼½¾]/g) ?? []).sort();
const translated = (english: string, zh: string, label: string) => {
  assert.ok(typeof zh === 'string' && /\p{Script=Han}/u.test(zh), label);
  assert.deepEqual(numbers(zh), numbers(english), `${label}: retain every numeric value`);
  assert.deepEqual((zh.match(/°[FC]|%/g) ?? []).sort(), (english.match(/°[FC]|%/g) ?? []).sort(), `${label}: retain temperature units and percentages`);
};
test('all 50 foods and 55 conditions have complete Chinese guidance with unchanged numeric facts', () => {
  assert.deepEqual(Object.keys(chinese).sort(), original.map(f=>f.slug).sort());
  for (const food of original) {
    const zh = chinese[food.slug];
    translated(food.name, zh.name, `${food.slug}:name`);
    translated(food.description, zh.description, `${food.slug}:description`);
    assert.ok(zh.aliases.length > 0);
    assert.deepEqual(Object.keys(zh.variants).sort(), food.variants.map((v:{id:string})=>v.id).sort());
    for (const variant of food.variants) {
      const copy = zh.variants[variant.id];
      for (const field of ['label','portion','turn']) translated(variant[field],copy[field],`${food.slug}/${variant.id}:${field}`);
      for (const field of ['steps','notes']) {
        assert.equal(copy[field].length,variant[field].length);
        variant[field].forEach((text:string,i:number)=>translated(text,copy[field][i],`${food.slug}/${variant.id}:${field}/${i}`));
      }
      if (variant.safetyOverride) translated(variant.safetyOverride.text,copy.safetyOverride,`${food.slug}:safety override`);
    }
  }
});
test('language paths preserve page, search state and anchors without double-prefixing', () => {
  assert.equal(localizedPath('/', 'zh'), '/zh');
  assert.equal(localizedPath('/zh', 'en'), '/');
  assert.equal(localizedPath('/foods/chicken-breast?variant=large&unit=c#sources-large','zh'),'/zh/foods/chicken-breast?variant=large&unit=c#sources-large');
  assert.equal(localizedPath('/zh/foods/chicken-breast?variant=large&unit=c#sources-large','en'),'/foods/chicken-breast?variant=large&unit=c#sources-large');
  assert.equal(localizedPath('/zh/privacy','zh'),'/zh/privacy');
  assert.equal(languageFromPath('/zh/foods/fish-sticks'),'zh');
  assert.equal(languageFromPath('/foods/fish-sticks'),'en');
  assert.equal(languageFromPath('/zhang'),'en');
  assert.equal(resultLabel(1,true,'en'),'1 food found');
  assert.equal(resultLabel(0,true,'zh'),'0 种食物符合条件');
});
