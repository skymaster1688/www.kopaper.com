// Regenerate the prose of every gallery article from src/lib/gallery.ts buildIntro().
//
//   node scripts/regen-gallery-bodies.mjs           # only bodies that still carry template markers
//   node scripts/regen-gallery-bodies.mjs --all     # rewrite every article
//
// Frontmatter, image blocks and captions are preserved byte-for-byte; only the
// text before the first image is replaced. Safe to re-run (idempotent).
//
// Why: gallery articles are generated from the same two inputs (prompt + style),
// so without rotation they all read identically. buildIntro() picks sentence
// shapes, style notes, subject tips, scenes and closing lines by a stable hash of
// the prompt — this script applies it retroactively to already-published pages.
import { build as esbuild } from 'esbuild';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIR = 'src/content/gallery';
const ALL = process.argv.includes('--all');

// Bundle gallery.ts so this Node script uses the exact same generator as the Worker.
const bundle = join(tmpdir(), `kopaper-gallery-${Date.now()}.mjs`);
await esbuild({
  entryPoints: ['src/lib/gallery.ts'],
  bundle: true, format: 'esm', platform: 'node',
  outfile: bundle, logLevel: 'error',
});
const { buildMeta } = await import(pathToFileURL(bundle).href);

const MARKERS = [
  'clean paper folds, crisp geometry',
  'Ways to take this further',
  'your own idea',
  '"undefined"',
  'created for inspiration, creative exploration, and visual reference',
  'Creative tip:', 'How to use this design:', 'generate the same idea in different styles',
  'Paste whichever feels right',
];

const fmValue = (fm, key) => {
  const m = fm.match(new RegExp('^' + key + ':\\s*"?(.*?)"?\\s*$', 'm'));
  return m ? m[1] : '';
};
const cleanPrompt = (s) => s.replace(/\\"/g, '"').replace(/\\+$/, '').replace(/^"+|"+$/g, '').trim();
const yamlStr = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, ' ').replace(/\n/g, ' ') + '"';

let touched = 0, skipped = 0;
const kept = [];

for (const f of readdirSync(DIR)) {
  if (!f.endsWith('.md')) continue;
  const path = join(DIR, f);
  const src = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  const close = src.indexOf('---', 3);
  if (close < 0) { skipped++; kept.push(f + ' (no frontmatter)'); continue; }
  const fm = src.slice(0, close);
  const body = src.slice(close + 3);

  if (!ALL && !MARKERS.some(m => body.includes(m))) { skipped++; kept.push(f + ' (kept)'); continue; }

  let prompt = '';
  const dm = fmValue(fm, 'description').match(/"([^"]+)"/);
  if (dm) prompt = cleanPrompt(dm[1]);
  if (!prompt) {
    const cm = body.match(/AI-generated [^.\n]*?papercraft of (.+?)\./);
    if (cm) prompt = cleanPrompt(cm[1]);
  }
  if (!prompt) prompt = cleanPrompt(fmValue(fm, 'title').replace(/\s+Papercraft Design$/i, '').replace(/\s+Papercraft$/i, '').toLowerCase());
  if (!prompt) { skipped++; kept.push(f + ' (no prompt)'); continue; }

  const style = (fmValue(fm, 'style') || 'cute').toLowerCase();
  const imgIdx = body.indexOf('![');
  const tail = imgIdx < 0 ? '' : body.slice(imgIdx).replace(/\s+$/, '');
  const meta = buildMeta(prompt, style);

  // Description is regenerated too: leaving the old one in place kept the retired
  // "AI-generated artwork with ready-to-use prompts" phrasing on every page.
  const fmFixed = /^description:/m.test(fm)
    ? fm.replace(/^description: .*$/m, 'description: ' + yamlStr(meta.description))
    : fm;

  const out = fmFixed + src.slice(close, close + 3) + '\n\n' + meta.intro + (tail ? '\n\n' + tail : '') + '\n';
  if (out !== src) { writeFileSync(path, out); touched++; }
}

console.log(`regenerated: ${touched} | skipped: ${skipped}`);
if (kept.length) console.log('  ' + kept.slice(0, 10).join('\n  '));
