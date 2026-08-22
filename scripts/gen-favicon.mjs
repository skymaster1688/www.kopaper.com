// Generate koPaper favicons using the site's own /api/generate-image (Workers AI).
// Produces a full favicon suite (realfavicongenerator-style):
//   - favicon.ico            (multi-size ICO: 16/32/48, embeds PNG data)
//   - favicon-16x16.png
//   - favicon-32x32.png
//   - apple-touch-icon.png   (180x180)
//   - android-chrome-192x192.png
//   - android-chrome-512x512.png
// Usage: node scripts/gen-favicon.mjs

import { writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(ROOT, 'public');
const IMG = join(PUB, 'images');

const ENDPOINT = 'https://kopaper.com/api/generate-image';
const PROMPT = 'a papercraft fox face icon, simple bold geometric shapes, papercraft style, centered on solid warm orange background, minimal detail, recognizable at small size';
const STYLE = 'cute';

async function callAPI() {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: PROMPT, style: STYLE, n: 1 }),
    signal: AbortSignal.timeout(45000),
  });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (!data.ok || !Array.isArray(data.images) || !data.images[0]?.b64) {
      throw new Error('API responded but no image: ' + text.slice(0, 300));
    }
    return { b64: data.images[0].b64, mediaType: data.images[0].mediaType || 'image/jpeg', provider: data.provider, model: data.model };
  } catch (e) {
    throw new Error('Bad JSON from API (' + res.status + '): ' + text.slice(0, 300));
  }
}

function decodeB64(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return Buffer.from(bytes);
}

// Build a multi-image ICO file by embedding PNG data (supported by all modern browsers).
// Layout: 6-byte header + 16-byte dir entry per image + concatenated PNG payloads.
function buildIco(entries) {
  const count = entries.length;
  const headerSize = 6;
  const dirSize = 16 * count;
  let offset = headerSize + dirSize;
  const dir = Buffer.alloc(dirSize);
  let p = 0;
  for (const e of entries) {
    const w = e.size > 255 ? 0 : e.size;
    const h = e.size > 255 ? 0 : e.size;
    dir.writeUInt8(w, p); p += 1;
    dir.writeUInt8(h, p); p += 1;
    dir.writeUInt8(0, p); p += 1; // color count (0 = truecolor)
    dir.writeUInt8(0, p); p += 1; // reserved
    dir.writeUInt16LE(1, p); p += 2; // planes
    dir.writeUInt16LE(32, p); p += 2; // bit count
    dir.writeUInt32LE(e.buf.length, p); p += 4; // size of image data
    dir.writeUInt32LE(offset, p); p += 4; // offset
    offset += e.buf.length;
  }
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = 1 (icon)
  header.writeUInt16LE(count, 4); // image count
  return Buffer.concat([header, dir, ...entries.map(e => e.buf)]);
}

async function makePng(jpegBuf, size) {
  return sharp(jpegBuf)
    .resize(size, size, { fit: 'cover', position: 'center' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  if (!existsSync(IMG)) {
    console.error('public/images does not exist at', IMG);
    process.exit(1);
  }
  console.log('Calling', ENDPOINT, '...');
  console.log('prompt:', PROMPT);
  const t0 = Date.now();
  const { b64, mediaType, provider, model } = await callAPI();
  console.log(`API ok in ${((Date.now() - t0) / 1000).toFixed(1)}s via ${provider}/${model} (${mediaType})`);

  const jpegBuf = decodeB64(b64);
  const rawPath = join(IMG, '_favicon-raw.jpg');
  writeFileSync(rawPath, jpegBuf);
  console.log('Wrote raw JPEG:', rawPath, `(${(jpegBuf.length / 1024).toFixed(1)} KB)`);

  // Full favicon suite (realfavicongenerator-style naming).
  const suite = [
    { name: 'favicon-16x16.png',          size: 16 },
    { name: 'favicon-32x32.png',          size: 32 },
    { name: 'apple-touch-icon.png',       size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
  ];
  for (const t of suite) {
    const buf = await makePng(jpegBuf, t.size);
    writeFileSync(join(IMG, t.name), buf);
    console.log(`  -> ${t.name} (${t.size}x${t.size})`);
  }

  // ICO: 16 + 32 + 48 sizes (48 not in the PNG suite, generated separately for the .ico).
  const icoEntries = [];
  for (const size of [16, 32, 48]) {
    icoEntries.push({ size, buf: await makePng(jpegBuf, size) });
  }
  const ico = buildIco(icoEntries);
  writeFileSync(join(PUB, 'favicon.ico'), ico);
  console.log(`  -> favicon.ico (16/32/48, ${(ico.length / 1024).toFixed(1)} KB)`);

  // Clean up stale single-size names from the previous run.
  for (const stale of ['favicon-192.png', 'favicon-512.png']) {
    const p = join(IMG, stale);
    if (existsSync(p)) { try { unlinkSync(p); console.log(`  (removed stale ${stale})`); } catch {} }
  }
  console.log('Done.');
}

main().catch((e) => { console.error('FAIL:', e.message || e); process.exit(1); });
