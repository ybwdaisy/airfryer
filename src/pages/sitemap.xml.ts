import { foods, categories } from '../lib/foods';
import { localizedPath } from '../lib/locale';
export function GET() {
  const origin = 'https://airfryer.ybwdaisy.com';
  const paths = ['/', '/methodology', '/privacy', ...categories.map(c => `/categories/${c.slug}`), ...foods.map(f => `/foods/${f.slug}`)];
  const localized = paths.flatMap(path => [localizedPath(path, 'en'), localizedPath(path, 'zh')]);
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + localized.map(p => `<url><loc>${origin}${p}</loc></url>`).join('') + '</urlset>';
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
