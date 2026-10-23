// Bulk-publish everything staged in KV (by /api/publish-queue) in ONE Git commit,
// so the day's gallery items deploy exactly once. Call this manually, ~once a day.
//
// Route: POST /api/publish-flush   (or GET, for a quick browser click)
// Auth:  ?key=PUBLISH_FLUSH_KEY  OR  header x-flush-key: PUBLISH_FLUSH_KEY
// Required Cloudflare: GALLERY_KV binding + GITHUB_TOKEN/GITHUB_REPO/GITHUB_BRANCH
//                      + PUBLISH_FLUSH_KEY (protects this endpoint)

export const prerender = false;

// One Worker invocation may only issue 50 subrequests by default (fetch calls).
// Each draft costs 1 GitHub GET while planning + 2 blob uploads during the commit,
// and the bulk commit itself costs 4 calls (ref GET, tree POST, commit POST, ref PATCH),
// so 3*N + 4 must stay well below 50. 12 drafts => 40 subrequests, leaving headroom.
// Drafts beyond the batch stay in KV and are published by the next flush.
const MAX_PER_FLUSH = 12;

import type { APIContext } from 'astro';
import { getRuntimeEnv, json, planDraft, ghCommitAll, corsPreflightHeaders } from '../../lib/gallery';

export async function POST(context: APIContext) { return flush(context); }
export async function GET(context: APIContext) { return flush(context); }

async function flush(context: APIContext) {
  try {
  const origin = context.request.headers.get('origin');
  const env = getRuntimeEnv(context);
  const kv = env.GALLERY_KV;
  if (!kv) return json({ ok: false, error: 'GALLERY_KV not configured.' }, 500, origin);

  const flushKey = env.PUBLISH_FLUSH_KEY;
  if (!flushKey) return json({ ok: false, error: 'PUBLISH_FLUSH_KEY not set on server.' }, 500, origin);
  const url = new URL(context.request.url);
  const provided = (context.request.headers.get('x-flush-key') || url.searchParams.get('key') || '');
  if (provided !== flushKey) return json({ ok: false, error: 'Unauthorized.' }, 401, origin);

  const gh = {
    GITHUB_TOKEN: env.GITHUB_TOKEN,
    GITHUB_REPO: env.GITHUB_REPO,
    GITHUB_BRANCH: env.GITHUB_BRANCH || 'main',
  };
  if (!gh.GITHUB_TOKEN || !gh.GITHUB_REPO) {
    return json({ ok: false, error: 'GitHub env missing.' }, 500, origin);
  }

  let listed: { name: string }[] = [];
  try {
    const r = await kv.list({ prefix: 'draft:' });
    listed = (r.keys || []).map((k: any) => ({ name: k.name }));
  } catch (e) {
    return json({ ok: false, error: 'KV list failed', detail: String((e as Error)?.message ?? e) }, 500, origin);
  }
  if (!listed.length) return json({ ok: true, published: 0, failed: 0, errors: [], message: 'Queue is empty.' }, 200, origin);

  const state = { existingCache: new Map<string, string>(), mdAccum: new Map<string, string>() };
  const allFiles: { path: string; contentBase64: string }[] = [];
  const handledKeys: string[] = [];
  const failed: string[] = [];
  let published = 0;

  for (const k of listed) {
    if (handledKeys.length >= MAX_PER_FLUSH) break;
    let raw: string | null = null;
    try { raw = await kv.get(k.name); } catch { continue; }
    if (!raw) continue;
    let draft: any;
    try { draft = JSON.parse(raw); } catch { await safeDelete(kv, k.name); failed.push(`${k.name}: bad json`); continue; }
    let res;
    try {
      res = await planDraft({ ...gh, AI: (env as any)?.AI }, draft, state);
    } catch (e) {
      failed.push(`${k.name}: planDraft crashed: ${String((e as Error)?.message ?? e)}`);
      continue;
    }
    if ('error' in res) { await safeDelete(kv, k.name); failed.push(`${k.name}: ${res.error}`); continue; }
    allFiles.push(...res.files);
    handledKeys.push(k.name);
    published++;
  }

  if (!allFiles.length) {
    return json({ ok: true, published: 0, failed: failed.length, errors: failed, message: 'Nothing valid to publish.' }, 200, origin);
  }

  try {
    await ghCommitAll(gh, allFiles, `Publish ${published} gallery item(s) (bulk flush)`, gh.GITHUB_BRANCH);
    // Commit succeeded -> these drafts are now in the repo, safe to clear them.
    for (const k of handledKeys) { await safeDelete(kv, k); }
    const remaining = listed.length - handledKeys.length;
    return json({ ok: true, published, remaining, failed: failed.length, errors: failed }, 200, origin);
  } catch (e) {
    // Commit failed: keep the drafts so they can be retried on the next flush.
    return json({
      ok: false,
      published: 0,
      failed: published,
      errors: [...failed, `commit failed: ${String((e as Error)?.message ?? e)}`],
      error: 'Bulk commit failed; drafts retained for retry.',
    }, 500, origin);
  }
  } catch (outer) {
    return json({ ok: false, error: 'publish-flush crashed', detail: String((outer as Error)?.message ?? outer), stack: String((outer as Error)?.stack ?? '') }, 500);
  }
}

async function safeDelete(kv: any, name: string) {
  try { await kv.delete(name); } catch { /* ignore */ }
}
