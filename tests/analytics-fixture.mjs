export const analyticsOrigin='https://airfryer.ybwdaisy.com';
/** Serve the local build at its canonical origin; the app must reject GA on aliases/previews. */
export async function serveAnalyticsOrigin(context, base) {
  await context.route(analyticsOrigin+'/**',async route=>{
    const requested=new URL(route.request().url());
    const response=await route.fetch({url:base+requested.pathname+requested.search});
    if((response.headers()['content-type']||'').includes('text/html')) {
      const body=(await response.text()).replace(/<meta\b[^>]*name="ga-measurement-id"[^>]*>/,'<meta name="ga-measurement-id" content="G-B34CBGW0EF">');
      await route.fulfill({response,body});
    } else await route.fulfill({response});
  });
}
