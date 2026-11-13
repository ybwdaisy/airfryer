import { z } from 'zod';

const sourceSchema = z.object({
  title: z.string().min(3), publisher: z.string().min(2),
  url: z.url().startsWith('https://'),
  role: z.enum(['reference', 'cross-check']),
  locator: z.string().min(3), evidence: z.string().min(12),
});

export const variantSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  label: z.string().min(3),
  state: z.enum(['fresh', 'frozen', 'ready-to-bake', 'reheat']),
  temperatureF: z.number().min(200).max(500),
  temperatureC: z.number().min(80).max(250).optional(),
  minutes: z.tuple([z.number().positive().max(180), z.number().positive().max(180)]),
  portion: z.string().min(12), preheat: z.enum(['yes', 'no', 'unspecified']),
  turn: z.string().min(3), steps: z.array(z.string().min(8)).min(2).max(12),
  notes: z.array(z.string()), sources: z.array(sourceSchema).min(2),
  ingredients: z.array(z.string().min(2)).optional(),
  equipment: z.array(z.string().min(2)).optional(),
  timeline: z.array(z.object({ label: z.string().min(2), detail: z.string().min(2) })).optional(),
  preheatDetail: z.string().optional(),
  completion: z.string().optional(),
  withoutThermometer: z.string().optional(),
  requiresThermometer: z.boolean().default(false),
  needsHob: z.boolean().default(false),
  advancePreparation: z.string().optional(),
  deviceNote: z.string().optional(),
  historical: z.boolean().default(false),
  safetyOverride: z.object({ text: z.string().min(12), url: z.url().startsWith('https://') }).optional(),
}).superRefine((v, ctx) => {
  if (v.minutes[0] > v.minutes[1]) ctx.addIssue({ code: 'custom', message: 'Time range is reversed' });
  if (v.sources.filter(s => s.role === 'reference').length !== 1)
    ctx.addIssue({ code: 'custom', message: 'Exactly one reference source is required' });
  if (new Set(v.sources.map(s => s.url)).size < 2 || new Set(v.sources.map(s => s.publisher.toLowerCase().trim())).size < 2)
    ctx.addIssue({ code: 'custom', message: 'Two independently authored sources required' });
});

export const foodSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), name: z.string().min(2),
  aliases: z.array(z.string().min(2)),
  category: z.enum(['meat', 'seafood', 'vegetables', 'frozen', 'bakery', 'reheat']),
  description: z.string().min(12),
  region: z.enum(['cn', 'us']).default('us'),
  safety: z.enum(['poultry', 'ground-meat', 'whole-meat', 'fish', 'shellfish', 'leftovers']).nullable(),
  reviewedAt: z.iso.date(), variants: z.array(variantSchema).min(1),
}).superRefine((f, ctx) => {
  for (const v of f.variants) {
    if (f.region === 'cn' && (v.temperatureC === undefined || v.temperatureC > 200))
      ctx.addIssue({ code: 'custom', message: 'China recipes require a native Celsius setting at or below 200°C' });
    if (f.region === 'us' && v.temperatureF > 400)
      ctx.addIssue({ code: 'custom', message: 'US recipes must use settings at or below 400°F' });
    const cookingCopy = [v.turn, ...v.steps, v.preheatDetail ?? '', ...(v.timeline ?? []).map(s => s.detail)].join(' ');
    if (f.region === 'cn' && [...cookingCopy.matchAll(/(\d+(?:\.\d+)?)\s*°C/g)].some(m => Number(m[1]) > 200))
      ctx.addIssue({ code: 'custom', message: 'A China cooking phase exceeds 200°C' });
  }
  if (new Set(f.variants.map(v => v.id)).size !== f.variants.length)
    ctx.addIssue({ code: 'custom', message: 'Duplicate variant IDs' });
});

export type Food = z.infer<typeof foodSchema>;
export type Variant = z.infer<typeof variantSchema>;
export type Category = Food['category'];
export type Unit = 'f' | 'c';
