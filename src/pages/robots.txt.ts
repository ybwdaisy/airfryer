export function GET() {
  const production = process.env.VERCEL_ENV === 'production';
  return new Response(production ? 'User-agent: *\nAllow: /\nSitemap: https://airfryer.ybwdaisy.com/sitemap.xml\n' : 'User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
