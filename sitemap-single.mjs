import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// 轻量自定义 sitemap 集成：构建结束后把本次所有页面汇总成单个 sitemap.xml
// 替代 @astrojs/sitemap 默认的「索引 + 分片」结构，输出更干净的单文件。
export function singleSitemap() {
  let site = '';

  return {
    name: 'single-sitemap',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = (config.site || '').replace(/\/$/, '');
      },
      'astro:build:done': async ({ pages, dir }) => {
        if (!site) {
          console.warn('[single-sitemap] 未设置 config.site，跳过 sitemap 生成');
          return;
        }
        if (!dir) {
          console.warn('[single-sitemap] 未获取到构建输出目录，跳过');
          return;
        }

        // Astro 5 中 p.path 是 URL 对象；兼容旧版字符串。
        // 输出路径可能是目录式(/about/)或带 .html(/about/index.html)，统一规整为目录式 URL。
        const urls = (pages || [])
          .map((p) => {
            const raw = p?.path instanceof URL ? p.path.pathname : String(p?.path ?? '');
            return raw;
          })
          // 只保留真实页面（.html 文件或目录式路由），排除资源/静态文件
          .filter((raw) => raw === '/' || raw.endsWith('/') || raw.endsWith('.html'))
          // 规整：去掉 index.html、补尾斜杠
          .map((raw) => {
            let path = raw.replace(/index\.html$/, '');
            if (!path.endsWith('/')) path += '/';
            return path;
          })
          // 排除 404 / sitemap 等非内容页
          .filter((path) => !path.startsWith('/404') && !path.includes('sitemap'))
          // 去重（根路径可能同时以 / 和 /index.html 出现）
          .filter((path, i, arr) => arr.indexOf(path) === i)
          .map((path) => `    <url><loc>${site}${path}</loc></url>`)
          .join('\n');

        const xml =
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          `${urls}\n` +
          '</urlset>\n';

        const outPath = fileURLToPath(new URL('sitemap.xml', dir));
        await writeFile(outPath, xml, 'utf-8');
        const count = urls ? urls.split('\n').length : 0;
        console.log(`[single-sitemap] 已生成 ${count} 条 URL -> ${outPath}`);
      },
    },
  };
}
