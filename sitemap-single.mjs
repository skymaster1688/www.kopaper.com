import { writeFile, readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

// 轻量自定义 sitemap 集成：构建结束后扫描 dist/ 目录，把所有 .html 汇总成单个 sitemap.xml。
// 采用「直接遍历输出目录」的方式，不依赖 astro:build:done 内部 pages 结构，
// 因此对任意 Astro 5.x 子版本都稳健。
export function singleSitemap() {
  let site = '';
  let srcRoot = '';

  return {
    name: 'single-sitemap',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = (config.site || '').replace(/\/$/, '');
        try { srcRoot = fileURLToPath(config.root); } catch { srcRoot = ''; }
      },
      'astro:build:done': async ({ dir }) => {
        if (!site) {
          console.warn('[single-sitemap] 未设置 config.site，跳过 sitemap 生成');
          return;
        }
        if (!dir) {
          console.warn('[single-sitemap] 未获取到构建输出目录，跳过');
          return;
        }

        const root = fileURLToPath(dir);
        const htmlFiles = [];

        async function walk(d) {
          let entries;
          try {
            entries = await readdir(d, { withFileTypes: true });
          } catch {
            return;
          }
          for (const e of entries) {
            const full = join(d, e.name);
            if (e.isDirectory()) {
              await walk(full);
            } else if (e.isFile() && e.name.endsWith('.html')) {
              htmlFiles.push(full);
            }
          }
        }
        await walk(root);

        // lastmod 映射：从画廊文章的 `updated` frontmatter 读出，注入 <lastmod>。
        // noindex 文章从 sitemap 排除（双保险，与页面 noindex 一致）。
        const lastmod = new Map();
        const excluded = new Set();
        if (srcRoot) {
          const galleryDir = join(srcRoot, 'src', 'content', 'gallery');
          try {
            const files = await readdir(galleryDir);
            for (const f of files) {
              if (!f.endsWith('.md')) continue;
              const raw = await readFile(join(galleryDir, f), 'utf8');
              const slug = '/gallery/' + f.replace(/\.md$/, '') + '/';
              const m = raw.match(/^updated:\s*["']?([\d-]+)/m);
              if (m) lastmod.set(slug, m[1]);
              if (/^noindex:\s*true/m.test(raw)) excluded.add(slug);
            }
          } catch { /* 无画廊目录时忽略 */ }
        }

        // 排除 noindex 页面（与页面 robots meta 一致）：过渡/占位页不占用索引。
        const indexedHtml = [];
        for (const f of htmlFiles) {
          const head = await readFile(f, 'utf8').catch(() => '');
          if (/name="robots"\s+content="noindex/i.test(head)) continue;
          indexedHtml.push(f);
        }

        const urls = indexedHtml
          .map((f) => {
            // 转成相对站点的目录式路径
            let rel = relative(root, f).split('\\').join('/'); // 兼容 Windows 分隔符
            rel = rel.replace(/\.html$/, '').replace(/\/index$/, '');
            return rel === 'index' || rel === '' ? '/' : '/' + rel + '/';
          })
          // 排除 404 / sitemap 等非内容页
          .filter((path) => !path.startsWith('/404') && !path.includes('sitemap'))
          // 排除 noindex 内容页
          .filter((path) => !excluded.has(path))
          // 去重
          .filter((path, i, arr) => arr.indexOf(path) === i)
          .map((path) => {
            const lm = lastmod.get(path);
            return lm
              ? `    <url><loc>${site}${path}</loc><lastmod>${lm}</lastmod></url>`
              : `    <url><loc>${site}${path}</loc></url>`;
          })
          .join('\n');

        const xml =
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          `${urls}\n` +
          '</urlset>\n';

        const outPath = join(root, 'sitemap.xml');
        await writeFile(outPath, xml, 'utf-8');
        const count = urls ? urls.split('\n').length : 0;
        console.log(`[single-sitemap] 已生成 ${count} 条 URL -> ${outPath}`);
      },
    },
  };
}
