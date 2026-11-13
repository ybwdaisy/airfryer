import ui from '../data/zh-ui.json';
import translations from '../data/zh-foods.json';
import additions from '../data/regional-zh.json';
import { categories } from './foods';
import type { Food } from './schema';
import type { Language } from './locale';
import type { Region } from './region';

type Translation = { name: string; aliases: string[]; description: string; variants: Record<string, {label: string; portion: string; turn: string; steps: string[]; notes: string[]; safetyOverride?: string; ingredients?: string[]; equipment?: string[]; timeline?: { label: string; detail: string }[]; preheatDetail?: string; completion?: string; withoutThermometer?: string; advancePreparation?: string; deviceNote?: string}> };
const zh = translations as Record<string, Translation>;
const regionalZh = additions as Record<string, Partial<Translation>>;
function chineseCopy(slug: string): Translation {
  return { ...zh[slug], ...regionalZh[slug], variants: { ...zh[slug]?.variants, ...regionalZh[slug]?.variants } } as Translation;
}
export function t(language: Language, text: string): string {
  if (language === 'en') return text;
  const translated = (ui as Record<string, string>)[text];
  if (translated === undefined) throw new Error(`Missing Chinese UI translation: ${text}`);
  return translated;
}
export function localizeFood(food: Food, language: Language): Food {
  if (language === 'en') return food;
  const copy = chineseCopy(food.slug);
  if (!copy.name) throw new Error(`Missing Chinese food: ${food.slug}`);
  return {...food, name: copy.name, description: copy.description, aliases: [...food.aliases, food.name, copy.name, ...copy.aliases], variants: food.variants.map(v => {
    const translated = copy.variants[v.id];
    if (!translated || translated.steps.length !== v.steps.length || translated.notes.length !== v.notes.length || (v.safetyOverride && !translated.safetyOverride)) throw new Error(`Incomplete Chinese condition: ${food.slug}/${v.id}`);
    return {...v, ...translated, safetyOverride: v.safetyOverride ? {...v.safetyOverride, text: translated.safetyOverride!} : undefined};
  })};
}
export function searchAliases(food: Food): string[] { const copy = chineseCopy(food.slug); return [food.name, ...food.aliases, copy.name, ...copy.aliases]; }
const categoryZh: Record<string, [string,string,string]> = {
  meat:['肉类与禽肉','肉类与禽肉','鸡肉、牛肉和猪肉的烹饪条件，以及中心温度检查。'],
  seafood:['鱼虾与海鲜','海鲜','鱼片、虾和扇贝，均注明适用的起始状态。'],
  vegetables:['蔬菜与植物蛋白','蔬菜','蔬菜、豆腐和鹰嘴豆，切块大小与参考做法一致。'],
  frozen:['冷冻食品','冷冻食品','常见冷冻食品及产品限制。请优先遵循包装上的做法。'],
  bakery:['面包与烘焙','面包与烘焙','蒜香面包和待烤面团，均注明所用产品的状态。'],
  reheat:['熟食与加热','熟食与加热','熟食与复热参考。请按各页面注明的起始状态操作。'],
};
const chinaDescriptions: Partial<Record<Food['category'], [string, string]>> = {
  meat: ['Marinated mid-joint wings and braise-then-roast ribs, with preparation and extra cookware shown before cooking.', '腌制鸡中翅、先炖后烤小排；提前说明前处理、额外锅具与每阶段时间。'],
  vegetables: ['Sweet potato, potato, eggplant, tofu, shiitake and corn, with preparation and center-softness checks.', '红薯、土豆、茄子、老豆腐、香菇和玉米；分别说明处理方法与热透、软熟检查。'],
  frozen: ['Pre-fried frozen thin fries with a complete cold-start method and product restrictions.', '预炸冷冻细薯条，保留完整冷启动方法、粗细与产品限制。'],
  bakery: ['Cooked mantou slices and custard tarts made with ready-made shells and homemade filling.', '熟馒头片，以及用现成挞皮和自调蛋挞液制作的蛋挞。'],
};
export function localizedCategories(language: Language, region: Region = 'us') {
  return categories.map(c => ({...c,
    ...(language === 'zh' ? {name: categoryZh[c.slug][0], short: categoryZh[c.slug][1], description: categoryZh[c.slug][2]} : {}),
    ...(region === 'cn' && chinaDescriptions[c.slug] ? {description: chinaDescriptions[c.slug]![language === 'zh' ? 1 : 0]} : {}),
  }));
}
