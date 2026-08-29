// Stage a generated design into KV for later bulk publishing.
// Does NOT touch GitHub and does NOT trigger a deploy — that only happens once,
// when /api/publish-flush is called (typically once per day).
//
// Route: POST /api/publish-queue
// Required Cloudflare binding: GALLERY_KV (a Workers KV namespace)

export const prerender = false;

import type { APIContext } from 'astro';
import { getRuntimeEnv, json, blacklistHit, corsPreflightHeaders, clientIp, checkRateLimit } from '../../lib/gallery';

export async function OPTIONS(context: APIContext) {
  return new Response(null, { headers: corsPreflightHeaders(context.request.headers.get('origin')) });
}

export async function POST(context: APIContext) {
  const origin = context.request.headers.get('origin');
  const env = getRuntimeEnv(context);
  const ip = clientIp(context);
  if (env.GALLERY_KV) {
    const rl = await checkRateLimit(env.GALLERY_KV, 'queue', ip, 60);
    if (!rl.ok) return json({ ok: false, error: 'Daily publish limit reached (' + rl.limit + '). Try again tomorrow.', remaining: rl.remaining }, 429, {}, origin);
  }
  const kv = env.GALLERY_KV;
  if (!kv) return json({ ok: false, error: 'GALLERY_KV not configured.' }, 500, {}, origin);

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

  const b64 = (body.b64 ?? '').toString();
  const svg = (body.svg ?? '').toString();
  if (b64.length > 4_000_000) return json({ ok: false, error: 'b64 too large (max 4MB base64).' }, 400, {}, origin);
  if (svg.length > 200_000) return json({ ok: false, error: 'svg too large (max 200KB).' }, 400, {}, origin);

  const draft = {
    prompt: promptRaw,
    style: (body.style ?? 'cute').toString(),
    kind: (body.kind ?? 'raster').toString(),
    b64,
    mediaType: (body.mediaType ?? 'image/png').toString(),
    svg,
  };
  const key = `draft:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;

  try {
    await kv.put(key, JSON.stringify(draft));
    return json({ ok: true, queued: true }, 200, {}, origin);
  } catch (e) {
    return json({ ok: false, error: 'Queue failed', detail: String((e as Error)?.message ?? e) }, 500, {}, origin);
  }
}

// Read-only diagnostic: how many drafts are staged in KV right now, and their
// subject/style. Never returns image bytes. Handy to confirm generation->KV works.
// Route: GET /api/gallery-status
export async function GET(context: APIContext) {
  const origin = context.request.headers.get('origin');
  const env = getRuntimeEnv(context);
  const kv = env.GALLERY_KV;
  if (!kv) return json({ ok: false, error: 'GALLERY_KV not configured.' }, 500, {}, origin);
  try {
    const list = await kv.list({ prefix: 'draft:' });
    const items: { prompt: string; style: string }[] = [];
    for (const k of list.keys) {
      const raw = await kv.get(k.name);
      if (!raw) continue;
      try {
        const d = JSON.parse(raw);
        items.push({ prompt: String(d.prompt ?? '').slice(0, 40), style: String(d.style ?? '') });
      } catch { /* skip unparsable */ }
    }
    return json({ ok: true, drafts: list.keys.length, items }, 200, {}, origin);
  } catch (e) {
    return json({ ok: false, error: 'list failed', detail: String((e as Error)?.message ?? e) }, 500, {}, origin);
  }
}
