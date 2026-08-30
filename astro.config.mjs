import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { singleSitemap } from './sitemap-single.mjs';

// Add loading="lazy" + decoding="async" to every markdown image (perf + CLS)
function rehypeLazyImages() {
  return function(tree) {
    function walk(node) {
      if (node.type === 'element' && node.tagName === 'img') {
        node.properties.loading = 'lazy';
        node.properties.decoding = 'async';
      }
      if (node.children) node.children.forEach(walk);
    }
    walk(tree);
  };
}

export default defineConfig({
  site: 'https://kopaper.com',
  integrations: [singleSitemap()],
  adapter: cloudflare(),
  cacheDir: './.astro',
  build: {
    format: 'directory',
  },
  markdown: {
    rehypePlugins: [rehypeLazyImages],
  },
});
