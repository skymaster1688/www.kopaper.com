// Repair gallery files that were corrupted by the buggy ghCommitAll (which wrote
// base64 TEXT into the repo instead of real file bytes).
//
// The corrupted files on GitHub contain a base64 STRING as their text content.
// GitHub Contents API returns that text base64-encoded once more. So to recover
// the original bytes we decode TWICE:
//   GitHub response.content (base64) -> corrupted file text (which is itself base64)
//   -> original markdown / jpg bytes
//
// This script reads the corrupted files anonymously (public repo, no token needed),
// double-decodes them, and writes the correct bytes to the local working tree.
// Then `git add + commit + push` overwrites the bad files in the remote.
//
// Usage: node scripts/repair-gallery.mjs

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.github.com';
const REPO = 'skymaster1688/www.kopaper.com';
const BRANCH = 'main';

// Files known to be corrupted (discovered via CF build error + GitHub listing).
const TARGETS = [
  { repoPath: 'src/content/gallery/papercraft-papercraft.md',                       localPath: 'src/content/gallery/papercraft-papercraft.md' },
  { repoPath: 'src/content/gallery/quiero-el-modelo-de-la-rueda-de-la-fortuna-papercraft.md', localPath: 'src/content/gallery/quiero-el-modelo-de-la-rueda-de-la-fortuna-papercraft.md' },
  { repoPath: 'public/images/gallery/papercraft-papercraft-mt3u4785elhv.jpg',         localPath: 'public/images/gallery/papercraft-papercraft-mt3u4785elhv.jpg' },
  { repoPath: 'public/images/gallery/quiero-el-modelo-de-la-rueda-de-la-fortuna-papercraft-mt3u47n03p3m.jpg', localPath: 'public/images/gallery/quiero-el-modelo-de-la-rueda-de-la-fortuna-papercraft-mt3u47n03p3m.jpg' },
];

function decodeB64(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return Buffer.from(bytes);
}

async function fetchFile(path) {
  const url = `${API}/repos/${REPO}/contents/${path}?ref=${BRANCH}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'koPaper-repair' } });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  // j.content is base64-encoded text of the corrupted file (which is itself base64 string)
  return j.content; // base64 string
}

async function main() {
  for (const t of TARGETS) {
    process.stdout.write(`Repairing ${t.repoPath} ... `);
    try {
      const githubB64 = await fetchFile(t.repoPath);
      // Decode once -> corrupted file text (which is a base64 string of the real bytes)
      const corruptedText = decodeB64(githubB64).toString('utf8');
      // Decode twice -> real file bytes (markdown UTF-8 or jpg binary)
      const realBytes = decodeB64(corruptedText);
      const out = join(ROOT, t.localPath);
      const dir = dirname(out);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(out, realBytes);
      console.log(`OK (${(realBytes.length / 1024).toFixed(1)} KB)`);
      // Sanity check for markdown: should start with ---
      if (t.localPath.endsWith('.md')) {
        const head = realBytes.slice(0, 4).toString('utf8');
        if (head !== '---\n') {
          console.warn(`  WARNING: markdown does not start with --- (got: ${JSON.stringify(head)})`);
        } else {
          console.log('  markdown frontmatter sanity: OK (starts with ---)');
        }
      }
    } catch (e) {
      console.log('FAIL: ' + e.message);
    }
  }
  console.log('\nDone. Now run:');
  console.log('  git add src/content/gallery/ public/images/gallery/ && git commit -m "fix: repair corrupted gallery files" && git push');
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
