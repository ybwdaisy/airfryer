import { localizedPath, type Language } from './locale.ts';
import type { Unit } from './schema.ts';

export type Region = 'cn' | 'us';
export const defaultUnit = (region: Region): Unit => region === 'cn' ? 'c' : 'f';

export function regionFromPath(path: string): Region {
  const bare = path.split(/[?#]/)[0].replace(/^\/zh(?=\/|$)/, '') || '/';
  if (/^\/china(?:\/|$)/.test(bare)) return 'cn';
  // Historical /zh/foods and /zh/categories remain US references.
  if (bare === '/' && path.startsWith('/zh')) return 'cn';
  return 'us';
}

export function regionHome(_region: Region, lang: Language): string {
  return lang === 'zh' ? '/zh' : '/';
}

export function foodPath(slug: string, region: Region, lang: Language): string {
  return localizedPath(`${region === 'cn' ? '/china' : ''}/foods/${slug}`, lang);
}

export function categoryPath(slug: string, _region: Region, lang: Language): string {
  return localizedPath(`/categories/${slug}`, lang);
}

export function switchLanguagePath(path: string, region: Region, lang: Language): string {
  const bare = path.split(/[?#]/)[0].replace(/^\/zh(?=\/|$)/, '') || '/';
  if (['/', '/china', '/us'].includes(bare)) return regionHome(region, lang);
  return localizedPath(path, lang);
}

export function regionName(region: Region, lang: Language): string {
  return lang === 'zh' ? (region === 'cn' ? '中国家常' : '美国常见') : (region === 'cn' ? 'China home cooking' : 'United States');
}
