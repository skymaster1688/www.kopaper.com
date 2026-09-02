// Shared AI article-content logic: ask a text LLM to analyze the user's idea and
// produce original, non-templated copy — an SEO title, a friendly intro (with 3-5
// concrete directions, each carrying a ready-to-use prompt) and a meta description.
// Used by the auto-published gallery articles (gallery.ts) and, for the direction
// list alone, by the generator result page (via /api/generate-image). Returns null
// on any failure so callers fall back to the deterministic template — publishing /
// generating never breaks.

// @cf/meta/llama-3.1-8b-instruct was deprecated by Cloudflare on 2026-05-30 and
// no longer runs reliably, which silently dropped every auto-published article
// to the old templated fallback. The -fp8-fast variant is the current free tier.
const DIRECTION_LLM_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';
const DIRECTION_LLM_FALLBACK = '@cf/meta/llama-3.1-8b-instruct';

export type Direction = { title: string; prompt: string };

export type ArticleContent = {
  title: string;          // SEO title, <= 60 chars, no template suffix
  intro: string;          // full markdown body: natural lead + friend-style directions + CTA
  description: string;    // natural meta description, <= 160 chars, no reused opening
  directions: Direction[]; // 3-5 directions (kept for the front-end generator)
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

// Parse the LLM's JSON array of directions, tolerating code fences / stray prose.
export function parseDirectionJson(text: string): Direction[] | null {
  if (!text) return null;
  let t = text.trim().replace(/^```[a-zA-Z]*\s*/i, '').replace(/\s*```$/m, '');
  const start = t.indexOf('[');
  const end = t.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const arr = JSON.parse(t.slice(start, end + 1));
    if (!Array.isArray(arr)) return null;
    const out = arr
      .filter((x: any) => x && typeof x.title === 'string' && typeof x.prompt === 'string' && x.title.trim() && x.prompt.trim())
      .map((x: any) => ({ title: x.title.trim(), prompt: x.prompt.trim() }));
    return out.length ? out : null;
  } catch {
    return null;
  }
}

// Run the text LLM across the preferred model then the fallback, so a single
// model being deprecated/rate-limited never silently drops the article to the
// templated fallback.
async function runLlm(ai: any, messages: { role: string; content: string }[], timeoutMs: number): Promise<string> {
  if (!ai || typeof ai.run !== 'function') return '';
  for (const model of [DIRECTION_LLM_MODEL, DIRECTION_LLM_FALLBACK]) {
    try {
      const result: any = await withTimeout(ai.run(model, { messages }), timeoutMs);
      // Workers AI returns different shapes depending on the model/compat mode:
      //  - { response: "..." }              (classic Workers AI text models)
      //  - { choices:[{message:{content}}] } (OpenAI-compatible chat format,
      //    currently returned by the fp8-fast model)
      //  - { choices:[{text:"..."}] }       (some completion-style models)
      //  - plain string
      const text = typeof result?.response === 'string'
        ? result.response
        : typeof result?.result?.response === 'string'
          ? result.result.response
          : typeof result?.choices?.[0]?.message?.content === 'string'
            ? result.choices[0].message.content
            : typeof result?.choices?.[0]?.text === 'string'
              ? result.choices[0].text
              : typeof result === 'string'
                ? result
                : '';
      if (text && text.trim()) return text;
    } catch { /* try next model */ }
  }
  return '';
}

// Analyze the user's idea with the Workers AI text LLM. Returns null on any
// failure so callers can fall back to the deterministic template.
export async function generateAiDirections(prompt: string, ai: any, timeoutMs = 20000): Promise<Direction[] | null> {
  if (!ai || typeof ai.run !== 'function' || !prompt) return null;
  const user = `Analyze this papercraft idea: "${prompt}"

Propose 3 to 5 concrete directions to take this idea further. Each direction must be specific to the idea itself (never generic filler such as "add more detail" or "cozy scene"), with a short title and a self-contained image-generation prompt (~15-30 words) that keeps the papercraft style.

Respond ONLY with a JSON array, no markdown, no code fences:
[{"title":"Direction title","prompt":"Full image prompt for this direction"}]`;
  const text = await runLlm(ai, [
    { role: 'system', content: 'You are a papercraft art director. Output JSON only.' },
    { role: 'user', content: user },
  ], timeoutMs);
  if (!text) return null;
  const dirs = parseDirectionJson(text);
  return dirs && dirs.length >= 3 ? dirs.slice(0, 5) : null;
}

// Parse the LLM's JSON object (title / intro / description / directions),
// tolerating code fences and stray prose. Returns null on any structural problem.
export function parseArticleJson(text: string): ArticleContent | null {
  if (!text) return null;
  let t = text.trim().replace(/^```[a-zA-Z]*\s*/i, '').replace(/\s*```$/m, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(t.slice(start, end + 1));
    if (!obj || typeof obj !== 'object') return null;
    const title = typeof obj.title === 'string' ? obj.title.trim() : '';
    const intro = typeof obj.intro === 'string' ? obj.intro.trim() : '';
    const description = typeof obj.description === 'string' ? obj.description.trim() : '';
    const arr = Array.isArray(obj.directions) ? obj.directions : [];
    const directions = arr
      .filter((x: any) => x && typeof x.title === 'string' && typeof x.prompt === 'string' && x.title.trim() && x.prompt.trim())
      .map((x: any) => ({ title: x.title.trim(), prompt: x.prompt.trim() }));
    if (!intro || !description || directions.length < 3) return null;
    return { title, intro, description, directions: directions.slice(0, 5) };
  } catch {
    return null;
  }
}

// Generate original (never reused-phrasing) article content for the given idea.
// Returns null on any failure so callers can fall back to the deterministic template.
export async function generateArticleContent(prompt: string, ai: any, timeoutMs = 45000): Promise<ArticleContent | null> {
  if (!ai || typeof ai.run !== 'function' || !prompt) return null;
  const user = `A user asked an AI to turn this idea into papercraft-style artwork: "${prompt}"

Write the full content for the published article about the result. Everything must be original — never reuse the same phrasing from other articles, never use generic filler directions such as "add more detail" or "cozy scene".

1. title — an SEO title under 60 characters: starts with a specific keyword for this exact subject, includes "papercraft", and matches the subject (no generic words like "object"/"animal"/"building" when the subject is specific, no repeated words, no "AI Generated" suffix, no brand name).
2. intro — the full markdown article body. Open with 2-3 natural sentences describing THIS exact design. Then a short "Ways to take this further" section written like a friend giving advice (never a numbered list): give 3-5 concrete directions specific to this idea, each woven into a sentence like "If you want X, describe: '...'" with a complete copy-ready image prompt in quotes. End with a line inviting the user to paste one of those prompts into the generator.
3. description — one natural meta description sentence under 160 characters: describes this design and mentions the ready-to-use prompts. Never open with the same phrase across articles.
4. directions — the same 3-5 directions as JSON objects {title, prompt}.

Respond ONLY with a JSON object, no markdown, no code fences:
{"title":"...","intro":"...","description":"...","directions":[{"title":"...","prompt":"..."}]}`;
  const text = await runLlm(ai, [
    { role: 'system', content: 'You are a papercraft art director and SEO copywriter. Output JSON only. Every article you write must read human and original.' },
    { role: 'user', content: user },
  ], timeoutMs);
  return parseArticleJson(text);
}
