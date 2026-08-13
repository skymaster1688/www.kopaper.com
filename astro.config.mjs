import { defineConfig } from 'astro/config';
import { singleSitemap } from './sitemap-single.mjs';

export default defineConfig({
  site: 'https://kopaper.com',
  integrations: [singleSitemap()],
  cacheDir: './.astro',
  build: {
    format: 'directory',
  },
});
