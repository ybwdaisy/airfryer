export const favoritesKey = 'airfryer:favorites:v1';
export function parseFavorites(raw: string | null): string[] {
  try {
    const value = JSON.parse(raw || 'null');
    if (value?.version !== 1 || !Array.isArray(value.ids) || value.ids.length > 300) return [];
    return [...new Set(value.ids.filter((id: unknown): id is string => typeof id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && id.length <= 64))] as string[];
  } catch { return []; }
}
export function readFavorites(): string[] {
  try { return parseFavorites(localStorage.getItem(favoritesKey)); } catch { return []; }
}
