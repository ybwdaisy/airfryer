import { foods, categories } from '../lib/foods';
export function GET() {
  const origin = 'https://airfryer.ybwdaisy.com';
  const paths = ['/', '/methodology', '/privacy', ...categories.map(c => `/categories/${c.slug}`), ...foods.map(f => `/foods/${f.slug}`)];
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + paths.map(p => `<url><loc>${origin}${p === '/' ? '/' : p}</loc></url>`).join('') + '</urlset>';
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
