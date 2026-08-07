import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://kopaper.com',
  integrations: [sitemap()],
  cacheDir: './.astro',
  build: {
    format: 'directory',
  },
  redirects: {
    '/compare/': '/text-compare/',
    '/check/': '/text-compare/',
  },
});
