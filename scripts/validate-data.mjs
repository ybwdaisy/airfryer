import { readdir, readFile } from 'node:fs/promises';
import { assembleCatalog } from '../src/lib/catalog.ts';
const load = async file => JSON.parse(await readFile(new URL(`../src/data/${file}`, import.meta.url), 'utf8'));
const paths = (await readdir(new URL('../src/data/', import.meta.url))).filter(f => /^foods-.+\.json$/.test(f));
const foods = assembleCatalog((await Promise.all(paths.map(load))).flat(), await load('recipe-overrides.json'));
const zh = await load('zh-foods.json'), additions = await load('regional-zh.json');
for (const food of foods) {
  const copy = {...zh[food.slug], ...additions[food.slug], variants: {...zh[food.slug]?.variants, ...additions[food.slug]?.variants}};
  if (!copy.name) throw new Error(`Missing Chinese food ${food.slug}`);
  for (const v of food.variants) {
    const z = copy.variants[v.id];
    for (const field of ['steps', 'notes', 'ingredients', 'equipment', 'timeline']) {
      if (v[field] && (!z?.[field] || v[field].length !== z[field].length)) throw new Error(`Incomplete Chinese ${food.slug}/${v.id}/${field}`);
    }
    if (!v.ingredients?.length || !v.equipment?.length || !v.completion || !v.preheatDetail) throw new Error(`Incomplete cooking guide ${food.slug}/${v.id}`);
    if (v.needsHob && !v.equipment.some(x => /pan|hob/i.test(x))) throw new Error(`Missing hob equipment ${food.slug}`);
  }
}
if (!foods.some(f => f.region === 'cn') || !foods.some(f => f.region === 'us')) throw new Error('Both independent collections required');
console.log(`Validated ${foods.length} foods (${foods.filter(f => f.region === 'cn').length} China, ${foods.filter(f => f.region === 'us').length} US), ${foods.reduce((n,f) => n+f.variants.length,0)} sourced conditions and complete bilingual copy. Structural validation, not kitchen testing.`);
