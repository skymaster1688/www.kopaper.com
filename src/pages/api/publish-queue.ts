// Stage a generated design into KV for later bulk publishing.
// Does NOT touch GitHub and does NOT trigger a deploy — that only happens once,
// when /api/publish-flush is called (typically once per day).
//
// Route: POST /api/publish-queue
// Required Cloudflare binding: GALLERY_KV (a Workers KV namespace)

export const prerender = false;

import type { APIContext } from 'astro';
import { getRuntimeEnv, json, blacklistHit } from '../../lib/gallery';

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}

export async function POST(context: APIContext) {
  const env = getRuntimeEnv(context);
  const kv = env.GALLERY_KV;
  if (!kv) return json({ ok: false, error: 'GALLERY_KV not configured.' }, 500);

  let body: Record<string, unknown>;
  try {
    body = (await context.request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body.' }, 400);
  }

  const promptRaw = (body.prompt ?? '').toString().trim();
  if (!promptRaw || promptRaw.length > 1000) {
    return json({ ok: false, error: 'prompt is required (1-1000 chars).' }, 400);
  }
  if (body.hp) return json({ ok: false, error: 'Rejected.' }, 400);
  if (blacklistHit(promptRaw)) {
    return json({ ok: false, error: 'Contains a protected brand or character name and cannot be published.' }, 400);
  }

  const draft = {
    prompt: promptRaw,
    style: (body.style ?? 'cute').toString(),
    kind: (body.kind ?? 'raster').toString(),
    b64: (body.b64 ?? '').toString(),
    mediaType: (body.mediaType ?? 'image/png').toString(),
    svg: (body.svg ?? '').toString(),
  };
  const key = `draft:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;

  try {
    await kv.put(key, JSON.stringify(draft));
    return json({ ok: true, queued: true });
  } catch (e) {
    return json({ ok: false, error: 'Queue failed', detail: String((e as Error)?.message ?? e) }, 500);
  }
}
