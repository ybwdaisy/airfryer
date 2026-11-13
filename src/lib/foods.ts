import { type Food, type Category } from './schema.ts';
import { assembleCatalog, type Enhancements } from './catalog.ts';
import overrides from '../data/recipe-overrides.json';
import type { Region } from './region.ts';

const files = import.meta.glob('../data/foods-*.json', { eager: true, import: 'default' });
export const foods: Food[] = assembleCatalog(Object.values(files).flat() as unknown[], overrides as Enhancements);
export const categories: { slug: Category; name: string; short: string; description: string }[] = [
  { slug: 'meat', name: 'Meat & poultry', short: 'Meat & poultry', description: 'Chicken, beef and pork with preparation conditions and internal temperature checks.' },
  { slug: 'seafood', name: 'Fish & seafood', short: 'Seafood', description: 'Fish fillets, shrimp and scallops with a clear starting condition.' },
  { slug: 'vegetables', name: 'Vegetables & plant protein', short: 'Vegetables', description: 'Vegetables, tofu and chickpeas, with cut sizes that match the guidance.' },
  { slug: 'frozen', name: 'Frozen favorites', short: 'Frozen', description: 'Freezer staples with product-specific notes. Check your package directions first.' },
  { slug: 'bakery', name: 'Bread & baking', short: 'Bread & baking', description: 'Garlic bread and ready-to-bake dough, with the starting product specified.' },
  { slug: 'reheat', name: 'Prepared & reheat', short: 'Prepared & reheat', description: 'Prepared food and reheating guides. Start with the condition shown on each page.' },
];
export const categoryName = (id: Category) => categories.find(c => c.slug === id)!.name;
export const popularSlugs = ['chicken-wings', 'chicken-breast', 'salmon', 'french-fries', 'broccoli', 'potatoes', 'sweet-potatoes', 'chicken-nuggets', 'shrimp', 'pizza'];
export const orderedFoods = [...foods].sort((a, b) => {
  const ai = popularSlugs.indexOf(a.slug), bi = popularSlugs.indexOf(b.slug);
  return (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi) || a.name.localeCompare(b.name);
});
export function foodsForRegion(region: Region): Food[] { return region === 'cn' ? foods.filter(f => f.region === 'cn') : orderedFoods.filter(f => f.region === 'us'); }
