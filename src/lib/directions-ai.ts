// Shared AI "ways to take it further" logic: ask a text LLM to analyze the user's
// idea and produce 3-5 concrete directions, each with a ready-to-use prompt.
// Used by both the auto-published gallery articles (gallery.ts) and the generator
// result page (via /api/generate-image). Returns null on any failure so callers
// fall back to the deterministic template — publishing / generating never breaks.

const DIRECTION_LLM_MODEL = '@cf/meta/llama-3.1-8b-instruct';

export type Direction = { title: string; prompt: string };

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

// Analyze the user's idea with the Workers AI text LLM. Returns null on any
// failure so callers can fall back to the deterministic template.
export async function generateAiDirections(prompt: string, ai: any, timeoutMs = 15000): Promise<Direction[] | null> {
  if (!ai || typeof ai.run !== 'function' || !prompt) return null;
  const user = `Analyze this papercraft idea: "${prompt}"

Propose 3 to 5 concrete directions to take this idea further. Each direction must be specific to the idea itself (never generic filler such as "add more detail" or "cozy scene"), with a short title and a self-contained image-generation prompt (~15-30 words) that keeps the papercraft style.

Respond ONLY with a JSON array, no markdown, no code fences:
[{"title":"Direction title","prompt":"Full image prompt for this direction"}]`;
  try {
    const result: any = await withTimeout(ai.run(DIRECTION_LLM_MODEL, {
      messages: [
        { role: 'system', content: 'You are a papercraft art director. Output JSON only.' },
        { role: 'user', content: user },
      ],
    }), timeoutMs);
    const text = typeof result?.response === 'string'
      ? result.response
      : typeof result?.result?.response === 'string'
        ? result.result.response
        : typeof result === 'string'
          ? result
          : '';
    const dirs = parseDirectionJson(text);
    return dirs && dirs.length >= 3 ? dirs.slice(0, 5) : null;
  } catch {
    return null;
  }
}
