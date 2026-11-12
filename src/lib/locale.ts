export type Language = 'en' | 'zh';
export function languageFromPath(path: string): Language { return /^\/zh(?:\/|$)/.test(path) ? 'zh' : 'en'; }
export function localizedPath(path: string, language: Language): string {
  const pathname = path.split(/[?#]/)[0];
  const suffix = path.slice(pathname.length);
  const bare = pathname.replace(/^\/zh(?=\/|$)/, '') || '/';
  return (language === 'zh' ? `/zh${bare === '/' ? '' : bare}` : bare) + suffix;
}
export function resultLabel(count: number, searching: boolean, language: Language): string {
  return language === 'zh' ? `${count} 种食物${searching ? '符合条件' : ''}` : `${count} ${count === 1 ? 'food' : 'foods'}${searching ? ' found' : ''}`;
}
