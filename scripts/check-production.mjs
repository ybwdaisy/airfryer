import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const build = env => execFileSync('npm', ['run', 'build'], { env, stdio: 'pipe', encoding: 'utf8' });
const measurementId = html => {
  const tag = html.match(/<meta\b[^>]*name="ga-measurement-id"[^>]*>/)?.[0];
  assert.ok(tag, 'Measurement meta is present');
  return tag.match(/content="([^"]*)"/)?.[1] ?? '';
};
try {
  build({ ...process.env, VERCEL_ENV: 'production', PUBLIC_GA_MEASUREMENT_ID: 'G-B34CBGW0EF' });
  const home = await readFile('dist/index.html', 'utf8');
  assert.equal(measurementId(home), 'G-B34CBGW0EF');
  assert.doesNotMatch(home, /name="robots" content="noindex/);
  assert.doesNotMatch(home, /<script[^>]+src="https:\/\/www\.googletagmanager/);
  assert.match(await readFile('dist/robots.txt', 'utf8'), /Allow: \/\nSitemap: https:\/\/airfryer\.ybwdaisy\.com\/sitemap.xml/);
  assert.match(home, /href="https:\/\/airfryer\.ybwdaisy\.com\/"/);
  for (const path of ['foods/chicken-breast', 'categories/frozen', 'methodology']) {
    const html = await readFile(`dist/${path}.html`, 'utf8');
    assert.ok(html.includes(`rel="canonical" href="https://airfryer.ybwdaisy.com/${path}"`), `Clean canonical for ${path}`);
  }
  console.log('Production output: configured GA ID, no unconditional Google tag, canonical hostname and crawl settings verified. No page opened and no analytics sent.');
} finally {
  // Keep ordinary local preview output untracked and noindex, even if a production check fails.
  build({ ...process.env, VERCEL_ENV: 'preview' });
  const preview = await readFile('dist/index.html', 'utf8');
  assert.equal(measurementId(preview), '');
  assert.match(preview, /name="robots" content="noindex, nofollow"/);
  console.log('Restored safe preview build with analytics disabled and noindex.');
}
