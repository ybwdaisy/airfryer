import { foodSchema, type Food } from './schema.ts';
export type Enhancements = Record<string, {description?: string; prependVariants?: unknown[]; variants?: Record<string, Record<string, unknown>>}>;
export function assembleCatalog(raw: unknown[], enhancements: Enhancements): Food[] {
  const foods = foodSchema.array().parse(raw).map(food => {
    const update = enhancements[food.slug];
    return !update ? food : foodSchema.parse({...food, description: update.description ?? food.description,
      variants: [...(update.prependVariants ?? []), ...food.variants.map(v => ({...v, ...update.variants?.[v.id]}))]});
  });
  if (new Set(foods.map(f => f.slug)).size !== foods.length) throw new Error('Duplicate food slugs');
  return foods;
}
