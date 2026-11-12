import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://airfryer.ybwdaisy.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
});
