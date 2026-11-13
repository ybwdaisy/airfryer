import type { Unit, Variant } from './schema.ts';
import { setting } from './measure.ts';

export function temperature(fahrenheit: number, unit: Unit, nativeC?: number): string {
  return setting(fahrenheit, unit, nativeC);
}
export function minutes(range: readonly number[]): string {
  return range[0] === range[1] ? `${range[0]}` : `${range[0]}-${range[1]}`;
}
export function selectVariant(variants: Variant[], candidate: string | null): Variant {
  return variants.find(v => v.id === candidate) ?? variants[0];
}
export function preheatLabel(value: Variant['preheat']): string {
  return { yes: 'Preheat first', no: 'Start without preheating', unspecified: 'Follow your fryer manual' }[value];
}
export const safetyGuides = {
  poultry: 'Check the thickest part reaches 165°F (74°C) with a food thermometer. Ground poultry also needs 165°F (74°C).',
  'ground-meat': 'Ground beef or pork needs 160°F (71°C) in the center. Ground poultry needs 165°F (74°C).',
  'whole-meat': 'Whole cuts of beef or pork need at least 145°F (63°C), followed by a 3-minute rest.',
  fish: 'Check the center reaches 145°F (63°C), or that the flesh is opaque and separates easily with a fork.',
  shellfish: 'Cook shrimp and scallops until the flesh is pearly or white and opaque.',
  leftovers: 'Reheat leftovers to 165°F (74°C) in the center. Timing alone cannot confirm they are ready.',
} as const;
export const safetySource = 'https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures';
