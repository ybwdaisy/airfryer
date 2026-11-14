import type { Unit } from './schema.ts';
import type { Language } from './locale.ts';

const fractions: Record<string, number> = { '¼': .25, '½': .5, '¾': .75, '⅓': 1/3, '⅔': 2/3, '⅛': .125, '⅜': .375, '⅝': .625, '⅞': .875 };
const rounded = (n: number, digits = 1) => String(Number(n.toFixed(digits)));

export function setting(f: number, unit: Unit, nativeC?: number): string {
  if (unit === 'c') return `${rounded(nativeC ?? ((f - 32) * 5 / 9))}°C`;
  return `${rounded(nativeC === undefined ? f : nativeC * 9 / 5 + 32)}°F`;
}

function decimalFractions(text: string): string {
  return text.replace(/(\d+)\s+(\d+)\/(\d+)/g, (_, whole, a, b) => rounded(+whole + +a / +b, 3))
    .replace(/(\d+)?([¼½¾⅓⅔⅛⅜⅝⅞])/g, (_, whole, fraction) => rounded(+(whole || 0) + fractions[fraction], 3))
    .replace(/\b(\d+)\/(\d+)\b/g, (_, a, b) => +b ? rounded(+a / +b, 3) : `${a}/${b}`);
}

/** Display conversion only: never computes cooking time or chooses an appliance setting. */
export function measureText(original: string, unit: Unit, lang: Language = 'en', preserveTemperature = false): string {
  let text = decimalFractions(original);
  // Keep the authority's published safety-temperature pair rather than rounding it again.
  if (!preserveTemperature) text = text.replace(/(\d+(?:\.\d+)?\s*°F)\s*[（(](\d+(?:\.\d+)?\s*°C)[）)]/g, (_, f, c) => unit === 'c' ? c : f)
    .replace(/(\d+(?:\.\d+)?\s*°C)\s*[（(](\d+(?:\.\d+)?\s*°F)[）)]/g, (_, c, f) => unit === 'c' ? c : f)
    .replace(/(\d+(?:\.\d+)?)(?:\s*[–−-]\s*(\d+(?:\.\d+)?))?\s*°([CF])/g, (_, a, b, source) => {
      const value = (n: string) => rounded(source.toLowerCase() === unit ? +n : unit === 'c' ? (+n - 32) * 5 / 9 : +n * 9 / 5 + 32);
      return `${value(a)}${b ? `–${value(b)}` : ''}°${unit.toUpperCase()}`;
    });
  const number = '(\\d+(?:\\.\\d+)?)(?:\\s*[–−-]\\s*(\\d+(?:\\.\\d+)?))?';
  const convert = (pattern: RegExp, factor: number, symbol: string, digits: number) => {
    text = text.replace(pattern, (_, a, b) => `${rounded(+a * factor, digits)}${b ? `–${rounded(+b * factor, digits)}` : ''}${lang === 'zh' ? '' : ' '}${symbol}`);
  };
  // Convert both dimensions when the unit is written once, e.g. 7 × 7 mm.
  text = text.replace(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*(mm|毫米|cm|厘米|inch(?:es)?|英寸)/gi, (match, a, b, source) => {
    const metric = /mm|毫米|cm|厘米/.test(source);
    if ((unit === 'c') === metric) return match;
    const factor = metric ? (/mm|毫米/.test(source) ? 1/25.4 : 1/2.54) : 2.54;
    return `${rounded(+a*factor, 2)} × ${rounded(+b*factor, 2)} ${unit === 'c' ? (lang === 'zh' ? '厘米' : 'cm') : (lang === 'zh' ? '英寸' : 'inches')}`;
  });
  if (unit === 'c') {
    text = text.replace(/\bone-inch\b/gi, '1 inch').replace(/\bthree-quarter-inch\b/gi, '0.75 inch');
    convert(new RegExp(number + '\\s*(?:-|\\s)?(?:pounds?|lbs?\\.?|磅)(?![a-z])', 'gi'), 453.59237, lang === 'zh' ? '克' : 'g', 0);
    convert(new RegExp(number + '\\s*(?:-|\\s)?(?:ounces?|oz\\.?|盎司)(?![a-z])', 'gi'), 28.349523125, lang === 'zh' ? '克' : 'g', 0);
    convert(new RegExp(number + '\\s*(?:-|\\s)?(?:quarts?|qt\\.?|夸脱)(?![a-z])', 'gi'), 0.946352946, lang === 'zh' ? '升' : 'L', 1);
    convert(new RegExp(number + '\\s*(?:-|\\s)?(?:inches|inch|in\\.?|英寸)(?![a-z])', 'gi'), 2.54, lang === 'zh' ? '厘米' : 'cm', 1);
    convert(new RegExp(number + '\\s*(?:tablespoons?|tbsp\\.?)(?![a-z])', 'gi'), 1, lang === 'zh' ? '汤匙' : 'tbsp', 3);
    convert(new RegExp(number + '\\s*(?:teaspoons?|tsp\\.?)(?![a-z])', 'gi'), 1, lang === 'zh' ? '茶匙' : 'tsp', 3);
    convert(new RegExp(number + '\\s*(?:cups?)(?![a-z])', 'gi'), 1, lang === 'zh' ? '量杯' : 'cup', 3);
  } else {
    convert(new RegExp(number + '\\s*(?:千克|公斤|kg)(?![a-z])', 'gi'), 2.204622622, 'lb', 2);
    convert(new RegExp(number + '\\s*(?:克|grams?|g)(?![a-z])', 'gi'), 1 / 28.349523125, 'oz', 2);
    convert(new RegExp(number + '\\s*(?:厘米|cm)(?![a-z])', 'gi'), 1 / 2.54, lang === 'zh' ? '英寸' : 'inches', 2);
    convert(new RegExp(number + '\\s*(?:毫米|mm)(?![a-z])', 'gi'), 1 / 25.4, lang === 'zh' ? '英寸' : 'inches', 2);
    convert(new RegExp(number + '\\s*(?:liters?|litres?|L|升)(?![a-z])', 'g'), 1 / 0.946352946, lang === 'zh' ? '夸脱' : 'qt', 2);
    // Volumes stay volumes. Never derive spoonfuls from ingredient weights.
    convert(new RegExp(number + '\\s*(?:毫升|ml)(?![a-z])', 'gi'), 1 / 15, lang === 'zh' ? '汤匙' : 'tbsp', 2);
  }
  return text;
}
