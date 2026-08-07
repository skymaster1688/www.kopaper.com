// Crop "AI生成 WORKBUDDY" watermarks from generated origami step images.
// Detects dark-text watermark in the bottom-right region and crops a safe margin.
// Usage: node scripts/crop-watermarks.js [tutorial-slug ...]
//   No args -> processes all subdirs under public/images/tutorials/

import { readdir, writeFile } from 'node:fs/promises';
import { join, basename, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images', 'tutorials');
const MIN_W = 320; // never crop below this width
const MIN_H = 320; // never crop below this height

async function* walk(dir) {
  for (const name of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) yield* walk(p);
    else if (extname(name.name).toLowerCase() === '.png') yield p;
  }
}

// Scan bottom-right region for dark pixels (watermark text) to find the watermark bounding box.
async function detectWatermarkBox(img) {
  const meta = await img.metadata();
  const w = meta.width, h = meta.height;
  const regionLeft = Math.floor(w * 0.55);
  const regionTop = Math.floor(h * 0.55);
  const regionW = Math.floor(w * 0.45);
  const regionH = Math.floor(h * 0.45);

  const raw = await img
    .clone()
    .extract({ left: regionLeft, top: regionTop, width: regionW, height: regionH })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info: ri } = raw;
  const rw = ri.width, rh = ri.height;

  let minX = rw, minY = rh, maxX = -1, maxY = -1;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const v = data[y * rw + x];
      if (v < 110) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null; // no dark pixels found
  return { absMaxX: regionLeft + maxX, absMaxY: regionTop + maxY };
}

async function processImage(path) {
  const img = sharp(path, { failOn: 'none' });
  const meta = await img.metadata();
  const w = meta.width, h = meta.height;

  const box = await detectWatermarkBox(img);

  // Add a safety margin past the detected watermark, or use a worst-case default.
  let cropRight = 0, cropBottom = 0;
  if (box) {
    cropRight = w - box.absMaxX + 16;
    cropBottom = h - box.absMaxY + 12;
  } else {
    cropRight = Math.round(w * 0.16);
    cropBottom = Math.round(h * 0.11);
  }

  // Safety clamps: keep at least MIN_W x MIN_H, never crop more than 30%.
  cropRight = Math.min(cropRight, Math.round(w * 0.30));
  cropBottom = Math.min(cropBottom, Math.round(h * 0.30));
  const newW = Math.max(w - cropRight, MIN_W);
  const newH = Math.max(h - cropBottom, MIN_H);

  if (newW === w && newH === h) {
    console.log(`  skip  ${basename(path)} (no crop needed, w=${w} h=${h})`);
    return;
  }

  const out = await sharp(path, { failOn: 'none' })
    .extract({ left: 0, top: 0, width: newW, height: newH })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(path, out);
  console.log(`  crop  ${basename(path)}  ${w}x${h} -> ${newW}x${newH}  (removed right=${w - newW}, bottom=${h - newH})`);
}

async function main() {
  const targets = process.argv.slice(2);
  const dirs = targets.length
    ? targets.map(t => join(ROOT, t.replace(/\/$/, '')))
    : (await readdir(ROOT, { withFileTypes: true }))
        .filter(d => d.isDirectory())
        .map(d => join(ROOT, d.name));

  if (!dirs.length) {
    console.log('No tutorial image folders found.');
    return;
  }

  for (const dir of dirs) {
    console.log(`\n[${basename(dir)}]`);
    const files = [];
    for await (const f of walk(dir)) files.push(f);
    if (!files.length) {
      console.log('  (no png files)');
      continue;
    }
    // Re-process until dimensions stabilize (handles multi-line watermarks).
    for (const f of files) await processImage(f);
  }
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });