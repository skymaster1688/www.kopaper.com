// Bulk-publish everything staged in KV (by /api/publish-queue) in ONE Git commit,
// so the day's gallery items deploy exactly once. Call this manually, ~once a day.
//
// Route: POST /api/publish-flush   (or GET, for a quick browser click)
// Auth:  ?key=PUBLISH_FLUSH_KEY  OR  header x-flush-key: PUBLISH_FLUSH_KEY
// Required Cloudflare: GALLERY_KV binding + GITHUB_TOKEN/GITHUB_REPO/GITHUB_BRANCH
//                      + PUBLISH_FLUSH_KEY (protects this endpoint)

export const prerender = false;

import type { APIContext } from 'astro';
import { getRuntimeEnv, json, planDraft, ghCommitAll } from '../../lib/gallery';

export async function POST(context: APIContext) { return flush(context); }
export async function GET(context: APIContext) { return flush(context); }

async function flush(context: APIContext) {
  const env = getRuntimeEnv(context);
  const kv = env.GALLERY_KV;
  if (!kv) return json({ ok: false, error: 'GALLERY_KV not configured.' }, 500);

  const flushKey = env.PUBLISH_FLUSH_KEY;
  if (!flushKey) return json({ ok: false, error: 'PUBLISH_FLUSH_KEY not set on server.' }, 500);
  const url = new URL(context.request.url);
  const provided = (context.request.headers.get('x-flush-key') || url.searchParams.get('key') || '');
  if (provided !== flushKey) return json({ ok: false, error: 'Unauthorized.' }, 401);

  const gh = {
    GITHUB_TOKEN: env.GITHUB_TOKEN,
    GITHUB_REPO: env.GITHUB_REPO,
    GITHUB_BRANCH: env.GITHUB_BRANCH || 'main',
  };
  if (!gh.GITHUB_TOKEN || !gh.GITHUB_REPO) {
    return json({ ok: false, error: 'GitHub env missing.' }, 500);
  }

  let listed: { name: string }[] = [];
  try {
    const r = await kv.list();
    listed = (r.keys || []).map((k: any) => ({ name: k.name }));
  } catch (e) {
    return json({ ok: false, error: 'KV list failed', detail: String((e as Error)?.message ?? e) }, 500);
  }
  if (!listed.length) return json({ ok: true, published: 0, failed: 0, errors: [], message: 'Queue is empty.' });

  const state = { existingCache: new Map<string, string>(), mdAccum: new Map<string, string>() };
  const allFiles: { path: string; contentBase64: string }[] = [];
  const failed: string[] = [];
  let published = 0;

  for (const k of listed) {
    let raw: string | null = null;
    try { raw = await kv.get(k.name); } catch { continue; }
    if (!raw) continue;
    let draft: any;
    try { draft = JSON.parse(raw); } catch { await safeDelete(kv, k.name); failed.push(`${k.name}: bad json`); continue; }
    const res = await planDraft(gh, draft, state);
    if ('error' in res) { await safeDelete(kv, k.name); failed.push(`${k.name}: ${res.error}`); continue; }
    allFiles.push(...res.files);
    published++;
  }

  if (!allFiles.length) {
    return json({ ok: true, published: 0, failed: failed.length, errors: failed, message: 'Nothing valid to publish.' });
  }

  try {
    await ghCommitAll(gh, allFiles, `Publish ${published} gallery item(s) (bulk flush)`, gh.GITHUB_BRANCH);
    // Commit succeeded -> drafts are now in the repo, safe to clear the queue.
    for (const k of listed) { await safeDelete(kv, k.name); }
    return json({ ok: true, published, failed: failed.length, errors: failed });
  } catch (e) {
    // Commit failed: keep the drafts so they can be retried on the next flush.
    return json({
      ok: false,
      published: 0,
      failed: published,
      errors: [...failed, `commit failed: ${String((e as Error)?.message ?? e)}`],
      error: 'Bulk commit failed; drafts retained for retry.',
    }, 500);
  }
}

async function safeDelete(kv: any, name: string) {
  try { await kv.delete(name); } catch { /* ignore */ }
}
