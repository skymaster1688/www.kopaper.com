// Build-time safety net for the auto-generated gallery.
// Runs as `npm run build`'s prebuild hook (Cloudflare build = `npm run build`).
//
// Goal: never let one malformed gallery markdown file crash the whole `astro build`.
// For every file in src/content/gallery/*.md we validate the YAML frontmatter;
// if it fails to parse we QUARANTINE it (rename to .md.broken) and warn, then exit 0
// so the build proceeds. Quarantined files are excluded from the content collection
// (they don't end in .md) and can be inspected/recovered from src/content/gallery/.quarantine/.
//
// CRLF-tolerant: gallery files may have Windows line endings, which must not cause
// healthy files to be wrongly quarantined.

import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('src/content/gallery');
if (!fs.existsSync(DIR)) {
  console.log('[gallery-validate] no gallery dir, skip.');
  process.exit(0);
}

// Prefer js-yaml (ships with astro); fall back to a minimal inline frontmatter parser.
let parseFrontmatter;
try {
  const mod = await import('js-yaml');
  const yaml = mod.default || mod;
  parseFrontmatter = (raw) => {
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return { ok: false, err: 'no frontmatter block' };
    try {
      yaml.load(m[1]);
      return { ok: true };
    } catch (e) {
      return { ok: false, err: (e.message || '').split('\n')[0] };
    }
  };
} catch {
  parseFrontmatter = (raw) => {
    const m = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/);
    if (!m) return { ok: false, err: 'no frontmatter block' };
    for (const line of m[1].split('\n')) {
      const t = line.trim();
      if (!t) continue;
      const idx = t.indexOf(': ');
      if (idx === -1) return { ok: false, err: `malformed key: ${t}` };
      const val = t.slice(idx + 2).trim();
      if (val.startsWith('"')) {
        let i = 1;
        let closed = -1;
        while (i < val.length) {
          if (val[i] === '\\') { i += 2; continue; }
          if (val[i] === '"') { closed = i; break; }
          i++;
        }
        if (closed === -1) return { ok: false, err: `unbalanced quotes: ${t}` };
        if (val.slice(closed + 1).trim().length > 0) return { ok: false, err: `trailing chars after quote: ${t}` };
      } else if (!/^(true|false|\d+(\.\d+)?)$/.test(val)) {
        return { ok: false, err: `bad scalar: ${t}` };
      }
    }
    return { ok: true };
  };
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md') && !f.startsWith('.'));
const quarantineDir = path.join(DIR, '.quarantine');
let checked = 0;
let quarantined = 0;
for (const f of files) {
  const full = path.join(DIR, f);
  const raw = fs.readFileSync(full, 'utf8');
  const r = parseFrontmatter(raw);
  checked++;
  if (!r.ok) {
    if (!fs.existsSync(quarantineDir)) fs.mkdirSync(quarantineDir, { recursive: true });
    fs.renameSync(full, path.join(quarantineDir, `${f}.broken`));
    console.warn(`[gallery-validate] QUARANTINED ${f} :: ${r.err}`);
    quarantined++;
  }
}
console.log(`[gallery-validate] checked ${checked} gallery file(s); quarantined ${quarantined} broken.`);
process.exit(0);
