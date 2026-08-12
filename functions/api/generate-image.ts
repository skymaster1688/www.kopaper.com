// Cloudflare Pages Function — image generation proxy for koPaper.
// Route: POST /api/generate-image
// Supports multiple providers, selected by:
//   1. request body field  `provider`  ("pollinations" | "openrouter")
//   2. environment variable  IMAGE_PROVIDER (default: "pollinations")
//   3. auto-fallback: if "openrouter" is chosen but OPENROUTER_API_KEY is missing,
//      it silently falls back to the free "pollinations" provider.
//
// Providers:
//   - pollinations : FREE, no API key, zero cost. URL-based, 4 variants via distinct seeds.
//   - openrouter   : PAID, requires OPENROUTER_API_KEY (Cloudflare env var), draws on credits.
//
// Both return the same shape: { ok, model, images: [{ b64, mediaType }] }
// so the front-end never needs to know which provider answered.

const DEFAULT_PROVIDER = 'pollinations';
const DEFAULT_N = 4;
const TIMEOUT_MS = 60000;

// Maps the site's style chips to prompt adjectives.
const STYLE_PHRASES: Record<string, string> = {
  cute: 'cute kawaii',
  lowpoly: 'low poly geometric',
  pixel: 'pixel art',
  fantasy: 'fantasy magical',
};

// Pollinations model options (free). Flux is the best all-rounder for papercraft.
const POLLINATIONS_DEFAULT_MODEL = 'flux';
// Map the site's style chips to the best-fit free Pollinations model.
const POLLINATIONS_STYLE_MODELS: Record<string, string> = {
  cute: 'flux-anime', // cute kawaii illustration
  lowpoly: 'flux', // clean geometric look
  pixel: 'sdxl', // crisper pixel-art rendering
  fantasy: 'flux', // magical concept art
};
// OpenRouter default (paid, cheapest tier).
const OPENROUTER_DEFAULT_MODEL = 'bytedance-seed/seedream-4.5';

// Only allow safe slugs to avoid header/body injection.
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

// Decide which provider to actually use, honoring request + env + key availability.
function resolveProvider(requested: string | undefined, env: Record<string, string>): 'pollinations' | 'openrouter' {
  let preferred = (requested || env?.IMAGE_PROVIDER || DEFAULT_PROVIDER).toString().toLowerCase();
  if (preferred !== 'openrouter' && preferred !== 'pollinations') preferred = DEFAULT_PROVIDER;
  if (preferred === 'openrouter' && !env?.OPENROUTER_API_KEY) {
    // OpenRouter was requested but no key is configured → fall back to free provider.
    return 'pollinations';
  }
  return preferred as 'pollinations' | 'openrouter';
}

function buildPrompt(idea: string, stylePhrase: string): string {
  return `${stylePhrase} papercraft of ${idea}, paper art sculpture, cut and fold paper model, clean light background, high detail`;
}

// ---- Provider: Pollinations (FREE) ---------------------------------------
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
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`Pollinations ${res.status}`);
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('image')) throw new Error('Pollinations returned non-image body');
      const buf = await res.arrayBuffer();
      return { b64: arrayBufferToBase64(buf), mediaType: 'image/png' };
    })();
  });
  const images = await Promise.all(jobs);
  return { model: `pollinations:${model}`, images };
}

// ---- Provider: OpenRouter (PAID) ----------------------------------------
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

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}

export async function onRequestPost(context: { request: Request; env: Record<string, string> }) {
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

  const provider = resolveProvider(body.provider, context.env ?? {});
  const apiKey = context.env?.OPENROUTER_API_KEY;

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
