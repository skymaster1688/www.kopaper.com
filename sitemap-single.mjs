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

        // 仅保留目录式页面（directory 格式下真实页面路径以 / 结尾，404.html 等含点号的文件排除）
        const urls = (pages || [])
          .filter((p) => {
            const path = p.path || '';
            return path === '/' || (path.endsWith('/') && !path.includes('.'));
          })
          .map((p) => `    <url><loc>${site}${p.path}</loc></url>`)
          .join('\n');

        const xml =
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          `${urls}\n` +
          '</urlset>\n';

        const outPath = fileURLToPath(new URL('sitemap.xml', dir));
        await writeFile(outPath, xml, 'utf-8');
        console.log(`[single-sitemap] 已生成 ${urls ? urls.split('\n').length : 0} 条 URL -> ${outPath}`);
      },
    },
  };
}
