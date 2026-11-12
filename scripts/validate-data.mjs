import { readdir, readFile } from 'node:fs/promises';
import { foodSchema } from '../src/lib/schema.ts';

const paths = (await readdir(new URL('../src/data/', import.meta.url))).filter(f => /^foods-.+\.json$/.test(f));
const foods = [];
for (const file of paths) {
  try { foods.push(...foodSchema.array().parse(JSON.parse(await readFile(new URL(`../src/data/${file}`, import.meta.url), 'utf8')))); }
  catch (error) { console.error(`Invalid data in ${file}:`, error.message); process.exit(1); }
}
if (!foods.length || new Set(foods.map(f => f.slug)).size !== foods.length) throw new Error('Food data missing or duplicate slug');
if (process.env.VERCEL_ENV === 'production' && foods.length !== 50) throw new Error(`Production requires 50 reviewed foods, found ${foods.length}`);
console.log(`Validated ${foods.length} foods and ${foods.reduce((n, f) => n + f.variants.length, 0)} sourced variants. This is structural validation, not evidence of cooking tests.`);
