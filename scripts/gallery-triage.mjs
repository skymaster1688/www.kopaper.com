// 一次性图库清理脚本（2026-11-01）
// 目标：把 96 个已索引作品页做分级 —— 保留有真实主体+可搜词的、剔除重复簇/垃圾prompt/版权IP。
// 保留页统一把模板化的标题后缀（"— Free … Design" / "— AI Generated"）剥掉，避免整批同构。
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = 'src/content/gallery';

// B 类：保留页面（有具体主体 + 可搜词），只做标题归一化
const KEEP = new Set([
  '3d-books-for-bulletin-board-papercraft',
  'adventure-explorer-character-papercraft-design',
  'animal-papercraft-design',
  'basketball-papercraft',
  'bat-in-flight-papercraft-design',
  'black-muscle-car-papercraft-design',
  'building-papercraft-design',
  'car-papercraft-design',
  'cat-papercraft',
  'character-papercraft',
  'chick-emoji-simple-2d-papercraft-design',
  'classic-car-papercraft-design',
  'cute-black-vintage-motorcycle-papercraft-design',
  'cute-boxy-teddy-bear-paper-toy-papercraft-design',
  'cute-ghost-papercraft-design',
  'cute-hedgehog-papercraft-design',
  'cute-panda-papercraft-design-ai-generated',
  'dragon-papercraft-design',
  'fantasy-castle-papercraft',
  'fire-western-dragon-papercraft',
  'ice-western-dragon-papercraft',
  'iguana-papercraft',
  'k808-wheeled-armored-personnel-carrier-papercraft-design',
  'low-poly-dragon-papercraft-design',
  'low-poly-fox-papercraft-design',
  'low-poly-panther-papercraft-design-ai-generated',
  'low-poly-pyramid-papercraft-design',
  'old-style-house-papercraft-design',
  'paper-craft-elephant-with-a-glueable-trunk-papercraft',
  'pig-papercraft',
  'pixel-heart-papercraft-design-ai-generated',
  'quiero-el-modelo-de-la-rueda-de-la-fortuna-papercraft',
  'robot-toy-papercraft',
  'robotic-triceratops-head-papercraft-design',
  'sexy-girl-papercraft-design',
  'simple-house-for-kids-papercraft',
  'statue-of-liberty-in-paper-craft-cut-out-papercraft',
  'un-robot-futurista-papercraft-design',
  'vehicle-papercraft-design-ai-generated',
  'wizard-cat-with-a-hat-papercraft-design',
]);

// 标题人工归一化（slug 与标题不一致 / 含 emoji / 含外语的几条）
const TITLE_FIX = {
  '3d-books-for-bulletin-board-papercraft': '3D Books Papercraft Design',
  'adventure-explorer-character-papercraft-design': 'Adventure Explorer Papercraft Design',
  'character-papercraft': 'Dinosaur Character Papercraft Design',
  'chick-emoji-simple-2d-papercraft-design': 'Chick Emoji Papercraft Design',
  'cute-black-vintage-motorcycle-papercraft-design': 'Vintage Motorcycle Papercraft Design',
  'cute-panda-papercraft-design-ai-generated': 'Cute Panda Papercraft Design',
  'low-poly-panther-papercraft-design-ai-generated': 'Low Poly Panther Papercraft Design',
  'paper-craft-elephant-with-a-glueable-trunk-papercraft': 'Paper Elephant Papercraft Design',
  'pixel-heart-papercraft-design-ai-generated': 'Pixel Heart Papercraft Design',
  'quiero-el-modelo-de-la-rueda-de-la-fortuna-papercraft': 'Ferris Wheel Papercraft Design',
  'un-robot-futurista-papercraft-design': 'Futuristic Robot Papercraft Design',
  'vehicle-papercraft-design-ai-generated': 'Pop Up Vehicle Papercraft Design',
  'robotic-triceratops-head-papercraft-design': 'Robotic Triceratops Papercraft Design',
};

const files = (await readdir(DIR)).filter((f) => f.endsWith('.md'));
const report = { keep: [], noindex: [], rewritten: [] };

for (const f of files) {
  const slug = f.replace(/\.md$/, '');
  const path = join(DIR, f);
  let raw = await readFile(path, 'utf8');
  const before = raw;

  if (KEEP.has(slug)) {
    const t = raw.match(/^title:\s*"(.+)"$/m);
    if (t) {
      let title = t[1]
        .replace(/^[^\w]+/u, '')                    // 去掉开头 emoji
        .replace(/\s+—\s+Free\b.*$/i, '')           // "— Free X Design"
        .replace(/\s+—\s+AI Generated$/i, '')       // "— AI Generated"
        .replace(/\s+/g, ' ')
        .trim();
      if (TITLE_FIX[slug]) title = TITLE_FIX[slug];
      raw = raw.replace(/^title:\s*".+"$/m, `title: "${title}"`);
      if (title !== t[1]) report.rewritten.push(`${slug}  →  ${title}`);
    }
    report.keep.push(slug);
  } else {
    if (/^noindex:/m.test(raw)) {
      report.noindex.push(slug + ' (已存在)');
    } else {
      raw = raw.replace(/^(draft:\s*\w+)$/m, '$1\nnoindex: true');
      report.noindex.push(slug);
    }
  }

  if (raw !== before) await writeFile(path, raw, 'utf8');
}

console.log('保留并索引:', report.keep.length);
console.log('noindex:', report.noindex.length);
console.log('标题重写:', report.rewritten.length);
console.log('\n--- 标题重写明细 ---');
report.rewritten.forEach((r) => console.log('  ' + r));
console.log('\n--- 新增 noindex ---');
report.noindex.forEach((r) => console.log('  ' + r));
