// Immediate single-item publish (legacy path). Most traffic now goes through
// /api/publish-queue (stage) + /api/publish-flush (bulk commit). This endpoint
// is kept for backward compatibility and direct single publishes.
//
// Route: POST /api/publish
// Required Cloudflare env vars: GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH

export const prerender = false;

import type { APIContext } from 'astro';
import {
  getRuntimeEnv, json, utf8ToBase64, blacklistHit, buildMeta, mediaExt,
  ghGet, ghPut, base64ToUtf8, yamlStr, imageLine, corsPreflightHeaders,
} from '../../lib/gallery';

export async function OPTIONS(context: APIContext) {
  return new Response(null, { headers: corsPreflightHeaders(context.request.headers.get('origin')) });
}

export async function POST(context: APIContext) {
  const origin = context.request.headers.get('origin');
  const env = getRuntimeEnv(context);
  let body: Record<string, unknown>;
  try {
    body = (await context.request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body.' }, 400, {}, origin);
  }

  const promptRaw = (body.prompt ?? '').toString().trim();
  if (!promptRaw || promptRaw.length > 1000) {
    return json({ ok: false, error: 'prompt is required (1-1000 chars).' }, 400, {}, origin);
  }
  if (body.hp) return json({ ok: false, error: 'Rejected.' }, 400, {}, origin);
  if (blacklistHit(promptRaw)) {
    return json({ ok: false, error: 'Contains a protected brand or character name and cannot be published.' }, 400, {}, origin);
  }

  const gh = {
    GITHUB_TOKEN: env.GITHUB_TOKEN,
    GITHUB_REPO: env.GITHUB_REPO,
    GITHUB_BRANCH: env.GITHUB_BRANCH || 'main',
  };
  if (!gh.GITHUB_TOKEN || !gh.GITHUB_REPO) {
    return json({ ok: false, error: 'Server missing GITHUB_TOKEN / GITHUB_REPO configuration.' }, 500, {}, origin);
  }
  const branch = gh.GITHUB_BRANCH;

  const kind = (body.kind ?? 'raster').toString();
  let imageB64: string | undefined;
  if (kind === 'svg') {
    const svg = (body.svg ?? '').toString();
    if (!svg) return json({ ok: false, error: 'Missing svg content.' }, 400, {}, origin);
    imageB64 = utf8ToBase64(svg);
  } else {
    const b64 = (body.b64 ?? '').toString().replace(/^data:.*;base64,/, '');
    if (!b64) return json({ ok: false, error: 'Missing image data.' }, 400, {}, origin);
    imageB64 = b64;
  }
  const ext = kind === 'svg' ? 'svg' : mediaExt((body.mediaType ?? 'image/png').toString());

  const meta = buildMeta(promptRaw, (body.style ?? 'cute').toString());
  const fileName = `${meta.slug}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const imgRepoPath = `public/images/gallery/${fileName}`;
  const imgUrl = `/images/gallery/${fileName}`;
  const mdRepoPath = `src/content/gallery/${meta.slug}.md`;

  try {
    await ghPut(gh, imgRepoPath, imageB64.replace(/\s/g, ''), `Add gallery image ${fileName}`, branch);

    const existing = await ghGet(gh, mdRepoPath, branch);
    if (!existing) {
      const fm = [
        `title: ${yamlStr(meta.title)}`,
        `description: ${yamlStr(meta.description)}`,
        `emoji: ${yamlStr(meta.emoji)}`,
        meta.style ? `style: ${yamlStr(meta.style)}` : null,
        `updated: "${new Date().toISOString().slice(0, 10)}"`,
        `order: 99`,
        `draft: false`,
      ].filter(Boolean).join('\n');
      const content = `---\n${fm}\n---\n\n${meta.intro}${imageLine(imgUrl, meta.caption)}\n`;
      await ghPut(gh, mdRepoPath, utf8ToBase64(content), `Publish gallery: ${meta.title}`, branch);
      return json({ ok: true, action: 'created', slug: meta.slug, url: `/gallery/${meta.slug}/` }, 200, {}, origin);
    } else {
      const prevBody = base64ToUtf8(existing.content || '');
      const updated = prevBody + imageLine(imgUrl, meta.caption);
      await ghPut(gh, mdRepoPath, utf8ToBase64(updated), `Add image to gallery: ${meta.title}`, branch, existing.sha);
      return json({ ok: true, action: 'updated', slug: meta.slug, url: `/gallery/${meta.slug}/` }, 200, {}, origin);
    }
  } catch (e) {
    return json({ ok: false, error: 'Publish failed', detail: String((e as Error)?.message ?? e) }, 500, {}, origin);
  }
}
