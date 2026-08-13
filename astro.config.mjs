import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { singleSitemap } from './sitemap-single.mjs';

export default defineConfig({
  site: 'https://kopaper.com',
  integrations: [singleSitemap()],
  adapter: cloudflare(),
  cacheDir: './.astro',
  build: {
    format: 'directory',
  },
});
