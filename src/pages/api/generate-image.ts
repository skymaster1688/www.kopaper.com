// Cloudflare Worker image-generation endpoint for koPaper (Astro SSR route).
// Compiled to a Worker route by @astrojs/cloudflare.
// Route: POST /api/generate-image
//
// Provider selection:
//   1. request body field  `provider`  ("pollinations" | "openrouter")
//   2. environment variable  IMAGE_PROVIDER (default: "pollinations")
//   3. auto-fallback: if "openrouter" chosen but OPENROUTER_API_KEY missing,
//      silently fall back to the free "pollinations" provider.
//
// Providers:
//   - pollinations : FREE, no API key. URL-based, 4 variants via distinct seeds.
//   - openrouter   : PAID, requires OPENROUTER_API_KEY (Cloudflare env var).
//
// Returns { ok, provider, model, images: [{ b64, mediaType }] }.

export const prerender = false;

import type { APIContext } from 'astro';

const DEFAULT_PROVIDER = 'pollinations';
const DEFAULT_N = 4;
const TIMEOUT_MS = 60000;

const STYLE_PHRASES: Record<string, string> = {
  cute: 'cute kawaii',
  lowpoly: 'low poly geometric',
  pixel: 'pixel art',
  fantasy: 'fantasy magical',
};

const POLLINATIONS_DEFAULT_MODEL = 'flux';
const POLLINATIONS_STYLE_MODELS: Record<string, string> = {
  cute: 'flux-anime',
  lowpoly: 'flux',
  pixel: 'sdxl',
  fantasy: 'flux',
};
const OPENROUTER_DEFAULT_MODEL = 'bytedance-seed/seedream-4.5';

const SAFE_SLUG = /^[\w./-]+$/;

interface GenerateBody {
  prompt?: string;
  style?: string;
  model?: string;
  n?: number;
  provider?: string;
}

function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      ...extra,
    },
  });
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

// Cloudflare env is injected by @astrojs/cloudflare into locals.runtime.env.
function getEnv(context: APIContext): Record<string, string> {
  const runtime = (context.locals as { runtime?: { env?: Record<string, string> } }).runtime;
  return runtime?.env ?? {};
}

function resolveProvider(requested: string | undefined, env: Record<string, string>): 'pollinations' | 'openrouter' {
  let preferred = (requested || env?.IMAGE_PROVIDER || DEFAULT_PROVIDER).toString().toLowerCase();
  if (preferred !== 'openrouter' && preferred !== 'pollinations') preferred = DEFAULT_PROVIDER;
  if (preferred === 'openrouter' && !env?.OPENROUTER_API_KEY) {
    return 'pollinations';
  }
  return preferred as 'pollinations' | 'openrouter';
}

function buildPrompt(idea: string, stylePhrase: string): string {
  return `${stylePhrase} papercraft of ${idea}, paper art sculpture, cut and fold paper model, clean light background, high detail`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry on Pollinations rate-limit (429) and transient 5xx / network errors.
async function fetchPollinationsWithRetry(url: string, signal: AbortSignal, maxRetries = 3): Promise<Response> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) await sleep(500 * attempt); // backoff: 500ms, 1000ms, 1500ms
    try {
      const res = await fetch(url, { signal });
      if (res.ok) return res;
      // 429 (rate limit) and 5xx are transient — worth retrying
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`Pollinations ${res.status}`);
        continue;
      }
      throw new Error(`Pollinations ${res.status}`); // non-retryable
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') throw e;
      lastErr = e as Error; // network/DNS error -> retry
    }
  }
  throw lastErr ?? new Error('Pollinations retry failed');
}

async function generatePollinations(
  prompt: string,
  model: string,
  n: number,
  signal: AbortSignal,
): Promise<{ model: string; images: Array<{ b64: string; mediaType: string }> }> {
  const encoded = encodeURIComponent(prompt);
  const baseSeed = Math.floor(Math.random() * 1_000_000_000);
  const jobs = Array.from({ length: n }, (_, i) => {
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&model=${model}&seed=${baseSeed + i}&nologo=true&enhance=false`;
    return (async () => {
      await sleep(i * 300); // stagger the N requests to avoid bursting the rate limit
      const res = await fetchPollinationsWithRetry(url, signal);
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('image')) throw new Error('Pollinations returned non-image body');
      const buf = await res.arrayBuffer();
      return { b64: arrayBufferToBase64(buf), mediaType: 'image/png' };
    })();
  });
  const images = await Promise.all(jobs);
  return { model: `pollinations:${model}`, images };
}

async function generateOpenRouter(
  prompt: string,
  apiKey: string,
  model: string,
  n: number,
  signal: AbortSignal,
): Promise<{ model: string; images: Array<{ b64: string; mediaType: string }> }> {
  const upstream = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://kopaper.com',
      'X-OpenRouter-Title': 'koPaper',
    },
    body: JSON.stringify({
      model,
      prompt,
      aspect_ratio: '1:1',
      resolution: '1K',
      n,
    }),
    signal,
  });
  if (!upstream.ok) {
    const text = await upstream.text();
    throw new Error(`Upstream ${upstream.status}: ${text.slice(0, 400)}`);
  }
  const data = (await upstream.json()) as {
    data?: Array<{ b64_json?: string; media_type?: string }>;
  };
  const images = (data.data ?? [])
    .filter((i) => i.b64_json)
    .map((i) => ({ b64: i.b64_json as string, mediaType: i.media_type ?? 'image/png' }));
  if (!images.length) throw new Error('No images returned from upstream');
  return { model, images };
}

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
  let body: GenerateBody;
  try {
    body = (await context.request.json()) as GenerateBody;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body.' }, 400);
  }

  const idea = (body.prompt ?? '').toString().trim();
  if (!idea || idea.length > 500) {
    return json({ ok: false, error: 'prompt is required and must be 1-500 characters.' }, 400);
  }

  const styleKey = (body.style ?? 'cute').toString().toLowerCase();
  const stylePhrase = STYLE_PHRASES[styleKey] ?? STYLE_PHRASES.cute;
  const n = Math.min(Math.max(parseInt(String(body.n ?? DEFAULT_N), 10) || DEFAULT_N, 1), 4);
  const prompt = buildPrompt(idea, stylePhrase);

  const env = getEnv(context);
  const provider = resolveProvider(body.provider, env);
  const apiKey = env?.OPENROUTER_API_KEY;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let result: { model: string; images: Array<{ b64: string; mediaType: string }> };
    if (provider === 'openrouter' && apiKey) {
      const model = body.model && SAFE_SLUG.test(body.model) ? body.model : OPENROUTER_DEFAULT_MODEL;
      result = await generateOpenRouter(prompt, apiKey, model, n, controller.signal);
    } else {
      const model = body.model && SAFE_SLUG.test(body.model)
        ? body.model
        : (POLLINATIONS_STYLE_MODELS[styleKey] ?? POLLINATIONS_DEFAULT_MODEL);
      result = await generatePollinations(prompt, model, n, controller.signal);
    }
    return json({ ok: true, provider, model: result.model, images: result.images });
  } catch (e) {
    const err = e as Error;
    if (err?.name === 'AbortError') {
      return json({ ok: false, error: 'Generation timed out.' }, 504);
    }
    return json({ ok: false, error: 'Server error', detail: String(err?.message ?? err) }, 500);
  } finally {
    clearTimeout(timer);
  }
}
