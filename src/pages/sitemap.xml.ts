import { foods, categories } from '../lib/foods';
import { foodPath, categoryPath, regionHome } from '../lib/region';
export function GET() {
  const origin = 'https://airfryer.ybwdaisy.com';
  const paths = new Set(['/methodology', '/privacy', '/zh/methodology', '/zh/privacy']);
  for (const lang of ['en', 'zh'] as const) for (const region of ['us', 'cn'] as const) {
    paths.add(regionHome(region, lang));
    const collection = foods.filter(f => f.region === region);
    for (const f of collection) paths.add(foodPath(f.slug, region, lang));
    for (const c of categories.filter(c => collection.some(f => f.category === c.slug))) paths.add(categoryPath(c.slug, region, lang));
  }
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + [...paths].map(p => `<url><loc>${origin}${p}</loc></url>`).join('') + '</urlset>';
  return new Response(body, {headers: {'Content-Type':'application/xml; charset=utf-8'}});
}
