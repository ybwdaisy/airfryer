import ui from '../data/zh-ui.json';
import translations from '../data/zh-foods.json';
import { categories } from './foods';
import type { Food } from './schema';
import type { Language } from './locale';

type Translation = { name: string; aliases: string[]; description: string; variants: Record<string, {label: string; portion: string; turn: string; steps: string[]; notes: string[]; safetyOverride?: string}> };
const zh = translations as Record<string, Translation>;
export function t(language: Language, text: string): string {
  if (language === 'en') return text;
  const translated = (ui as Record<string, string>)[text];
  if (translated === undefined) throw new Error(`Missing Chinese UI translation: ${text}`);
  return translated;
}
export function localizeFood(food: Food, language: Language): Food {
  if (language === 'en') return food;
  const copy = zh[food.slug];
  if (!copy) throw new Error(`Missing Chinese food: ${food.slug}`);
  return {...food, name: copy.name, description: copy.description, aliases: [...food.aliases, food.name, copy.name, ...copy.aliases], variants: food.variants.map(v => {
    const translated = copy.variants[v.id];
    if (!translated || translated.steps.length !== v.steps.length || translated.notes.length !== v.notes.length || (v.safetyOverride && !translated.safetyOverride)) throw new Error(`Incomplete Chinese condition: ${food.slug}/${v.id}`);
    return {...v, ...translated, safetyOverride: v.safetyOverride ? {...v.safetyOverride, text: translated.safetyOverride!} : undefined};
  })};
}
export function searchAliases(food: Food): string[] { return [food.name, ...food.aliases, zh[food.slug].name, ...zh[food.slug].aliases]; }
const categoryZh: Record<string, [string,string,string]> = {
  meat:['肉类与禽肉','肉类与禽肉','鸡肉、牛肉和猪肉的烹饪条件，以及中心温度检查。'],
  seafood:['鱼虾与海鲜','海鲜','鱼片、虾和扇贝，均注明适用的起始状态。'],
  vegetables:['蔬菜与植物蛋白','蔬菜','蔬菜、豆腐和鹰嘴豆，切块大小与参考做法一致。'],
  frozen:['冷冻食品','冷冻食品','常见冷冻食品及产品限制。请优先遵循包装上的做法。'],
  bakery:['面包与烘焙','面包与烘焙','蒜香面包和待烤面团，均注明所用产品的状态。'],
  reheat:['熟食与加热','熟食与加热','熟食与复热参考。请按各页面注明的起始状态操作。'],
};
export function localizedCategories(language: Language) { return categories.map(c=>language==='en'?c:{...c,name:categoryZh[c.slug][0],short:categoryZh[c.slug][1],description:categoryZh[c.slug][2]}); }
