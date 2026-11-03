// Rewrite gallery image alt text / captions into plain descriptive lines.
//
//   node scripts/regen-gallery-captions.mjs            # dry run, prints counts
//   node scripts/regen-gallery-captions.mjs --write    # apply
//
// Why: every image used to carry the same "AI-generated <style> papercraft of
// <prompt>." string, which read as machine output and repeated the prompt verbatim.
// Alt text now describes the picture, rotates through five shapes inside an article,
// drops the style word when the prompt already contains it, and falls back to a
// generic line when the original prompt was conversational or junk.
// Safe to re-run (idempotent).
import { build as esbuild } from 'esbuild';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIR = 'src/content/gallery';
const DRY = !process.argv.includes('--write');

const bundle = join(tmpdir(), `kopaper-gallery-cap-${Date.now()}.mjs`);
await esbuild({
  entryPoints: ['src/lib/gallery.ts'],
  bundle: true, format: 'esm', platform: 'node',
  outfile: bundle, logLevel: 'error',
});
const { promptQuality } = await import(pathToFileURL(bundle).href);

const STYLE_LABEL = { cute: 'Cute', lowpoly: 'Low poly', pixel: 'Pixel', fantasy: 'Fantasy', minecraft: 'Blocky' };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function capTemplates(prompt, styleLabel) {
  const sl = styleLabel.toLowerCase();
  const p = cap(prompt);
  if (new RegExp('\\b' + sl.replace(/\s+/g, '\\s+') + '\\b', 'i').test(prompt)) {
    return [
      `${p} papercraft design`,
      `${p}, papercraft illustration`,
      `${p} as a paper model`,
      `Papercraft artwork of ${prompt}`,
      `${p}, folded paper version`,
    ];
  }
  return [
    `${styleLabel} papercraft design of ${prompt}`,
    `${p} in ${sl} papercraft style`,
    `${p}, papercraft illustration`,
    `${p} as a ${sl} paper model`,
    `Papercraft artwork of ${prompt}, ${sl} style`,
  ];
}

let files = 0;
let images = 0;

for (const f of readdirSync(DIR)) {
  if (!f.endsWith('.md')) continue;
  const p = join(DIR, f);
  const src = readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const fmEnd = src.indexOf('---', 3);
  if (fmEnd < 0) continue;
  const fm = src.slice(0, fmEnd);

  // Description quotes are YAML-escaped (`\"low poly fox\"`).
  const descQuote = fm.match(/\\"([^"\\]+)\\"/);
  const sm = fm.match(/^style:\s*"?([a-z]+)"?/m);
  const style = sm ? sm[1] : 'cute';
  const styleLabel = STYLE_LABEL[style] || 'Papercraft';

  let prompt = descQuote ? descQuote[1].trim() : '';
  if (!prompt) {
    const fmPrompt = src.match(/!\[[^\]]*? of (.+?)\.?\]/);
    if (fmPrompt) prompt = fmPrompt[1].replace(/\.$/, '').trim();
  }
  if (!prompt) continue;
  prompt = prompt.replace(/^(i want (to )?(create|creat|make|see)\s+|please\s+(create|creat|make)\s+)/i, '').trim() || prompt;

  const caps = (!promptQuality(prompt).ok || prompt.split(/\s+/).length > 12)
    ? [
        `${styleLabel} papercraft design`,
        `Papercraft illustration in ${styleLabel.toLowerCase()} style`,
        `Paper model concept`,
        `${styleLabel} papercraft artwork`,
        `Folded paper illustration`,
      ]
    : capTemplates(prompt, styleLabel);

  let idx = 0;
  const next = src.replace(/(!\[)([^\]]*)(\]\([^)]+\))(?:\n\n\*([^*\n]+)\*)?/g, (m, a, alt, b, italic) => {
    const c = caps[idx % caps.length];
    idx++;
    images++;
    return italic ? a + c + b + '\n\n*' + c + '*' : a + c + b;
  });

  if (next !== src) {
    files++;
    if (!DRY) writeFileSync(p, next);
  }
}

console.log(DRY ? '[dry-run]' : '[written]', 'files:', files, '| images:', images);
