// Shared helpers for koPaper Gallery publishing.
// Used by:
//   - /api/publish        (immediate publish, legacy single-item path)
//   - /api/publish-queue  (stage a draft into KV, no GitHub write, no deploy)
//   - /api/publish-flush  (bulk-commit all staged drafts via Git Data API => ONE deploy)

import type { APIContext } from 'astro';

const API = 'https://api.github.com';

export const IP_BLOCKLIST = [
  'minecraft', 'pokemon', 'roblox', 'fnaf', 'five nights', 'disney', 'hello kitty',
  'sanrio', 'star wars', 'marvel', 'dc comics', 'harry potter', 'peppa', 'paw patrol',
  'spiderman', 'batman', 'simpsons', 'nintendo', 'zelda', 'mario', 'sonic', 'fortnite',
  'among us', 'barbie', 'taylor swift', 'genshin', 'lol', 'league of legends',
  'call of duty', 'minions', 'frozen', 'elsa', 'totoro', 'studio ghibli',
  'spongebob', 'tom and jerry', 'mickey', 'winnie the pooh', 'doraemon', 'powerpuff',
  // added 2026-08-29 after audit of indexed gallery URLs
  'gta', 'grand theft auto', 'one piece', 'mf doom', 'royal enfield', 'wilson',
  'nathan drake', 'uncharted', 'bungou', 'stray dogs', 'chuuya', 'bravado',
];

export const EMOJI_MAP: Record<string, string> = {
  panda: '🐼', cat: '🐱', dog: '🐶', fox: '🦊', rabbit: '🐰', bear: '🐻',
  lion: '🦁', tiger: '🐯', elephant: '🐘', horse: '🐴', fish: '🐟', bird: '🐦',
  heart: '❤️', flower: '🌸', rose: '🌹', star: '⭐', castle: '🏰', robot: '🤖',
  car: '🚗', rocket: '🚀', tree: '🌳', sun: '☀️', moon: '🌙', book: '📖',
  gift: '🎁', crown: '👑', dragon: '🐉', ghost: '👻', cake: '🎂', house: '🏠',
};

export function getRuntimeEnv(context: APIContext): Record<string, any> {
  const runtime = (context.locals as any)?.runtime;
  return runtime?.env ?? {};
}

export function json(data: unknown, status = 200, origin?: string | null): Response {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const ao = resolveCorsOrigin(origin);
  if (ao) headers['access-control-allow-origin'] = ao;
  return new Response(JSON.stringify(data), { status, headers });
}

// ---- CORS: only koPaper origins (plus local dev hosts) may read API responses ----
export const ALLOWED_ORIGINS = [
  'https://kopaper.com',
  'https://www.kopaper.com',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
];

export function resolveCorsOrigin(origin?: string | null): string | null {
  if (!origin) return '*'; // non-browser callers (curl, server-side) are fine
  const o = origin.toLowerCase();
  if (o === 'null') return '*';
  return ALLOWED_ORIGINS.includes(o) ? origin : null; // null => header omitted => browser blocks
}

export function corsPreflightHeaders(origin?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'access-control-allow-methods': 'POST, GET, OPTIONS',
    'access-control-allow-headers': 'content-type, x-flush-key',
  };
  const ao = resolveCorsOrigin(origin);
  if (ao) headers['access-control-allow-origin'] = ao;
  return headers;
}

export function clientIp(context: APIContext): string {
  const h = context.request.headers as any;
  const ip = h?.get?.('cf-connecting-ip') || h?.get?.('x-forwarded-for') || 'unknown';
  return String(ip).slice(0, 64);
}

// ---- IP-based daily rate limit backed by the KV binding ----
export async function checkRateLimit(
  kv: any,
  prefix: string,
  ip: string,
  limit: number,
): Promise<{ ok: boolean; used: number; limit: number; remaining: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const key = `usage:${prefix}:${ip}:${today}`;
  let used = 0;
  try { used = Number(await kv.get(key)) || 0; } catch { /* read failure -> allow */ }
  if (used >= limit) return { ok: false, used, limit, remaining: 0 };
  try {
    await kv.put(key, String(used + 1), { expirationTtl: 60 * 60 * 24 * 2 }); // 2-day safety TTL
    used += 1;
  } catch { /* write failure -> still allow this request */ }
  return { ok: true, used, limit, remaining: limit - used };
}

// ---- UTF-8 safe base64 (Workers `btoa` only handles Latin1) ----
export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
export function base64ToUtf8(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function blacklistHit(prompt: string): string | undefined {
  const p = prompt.toLowerCase();
  return IP_BLOCKLIST.find(t => p.includes(t));
}

function stripArticle(s: string): string {
  return s.replace(/^(a|an|the)\s+/i, '').trim();
}
function capitalizeWords(s: string): string {
  return s.split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function slugify(s: string): string {
  const out = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
  if (out) return out;
  // Non-ASCII prompt (e.g. Cyrillic): use a stable hash so the slug never
  // collides with the existing generic "papercraft" post.
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 'papercraft-' + h.toString(36);
}
function pickEmoji(prompt: string): string {
  const p = prompt.toLowerCase();
  for (const key of Object.keys(EMOJI_MAP)) if (p.includes(key)) return EMOJI_MAP[key];
  return '🎨';
}
export function yamlStr(s: string): string {
  const cleaned = String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, ' ').replace(/\n/g, ' ');
  return `"${cleaned}"`;
}
// Dependency-free frontmatter sanity check. Catches the two failure modes that
// previously crashed `astro build`: unbalanced double-quotes and a duplicated
// value spliced AFTER the closing quote (e.g. `description: "a"."b"`).
// Returns true only when every `key: value` line is structurally valid YAML
// for the simple shapes this module emits (quoted strings + scalar true/false/number).
export function validateFrontmatter(md: string): boolean {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return false;
  for (const line of m[1].split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const idx = t.indexOf(': ');
    if (idx === -1) return false;
    const val = t.slice(idx + 2).trim();
    if (val.startsWith('"')) {
      let i = 1;
      let closed = -1;
      while (i < val.length) {
        if (val[i] === '\\') { i += 2; continue; }
        if (val[i] === '"') { closed = i; break; }
        i++;
      }
      if (closed === -1) return false; // no closing quote
      if (val.slice(closed + 1).trim().length > 0) return false; // trailing junk after closing quote
    } else if (!/^(true|false|\d+(\.\d+)?)$/.test(val)) {
      return false;
    }
  }
  return true;
}
function mdAlt(caption: string): string {
  return caption.replace(/[\[\]]/g, '');
}

export interface Generated {
  prompt: string;
  style: string;
  title: string;
  description: string;
  caption: string;
  intro: string;
  emoji: string;
  slug: string;
}

// ---- rich gallery article generation (replaces boilerplate) ----
export type Subject = { category: string; label: string; article: string };
export function detectSubject(prompt: string): Subject {
  const p = prompt.toLowerCase();
  const has = (...k: string[]) => k.some(x => p.includes(x));
  if (has('dragon')) return { category: 'dragon', label: 'dragon', article: 'a' };
  if (has('cat','dog','bear','fox','rabbit','panda','bird','owl','eagle','fish','shark','elephant','tiger','lion','wolf','horse','cow','pig','snake','deer','frog','penguin','butterfly','bee','crab','octopus','whale','mouse','monkey','koala','unicorn')) return { category: 'animal', label: 'animal', article: 'an' };
  if (has('car','truck','vehicle','bike','motorcycle','plane','airplane','ship','boat','train','bus','tank','helicopter')) return { category: 'vehicle', label: 'vehicle', article: 'a' };
  if (has('castle','house','home','building','temple','tower','church','statue','pyramid','cottage','cabin','skyscraper')) return { category: 'building', label: 'building', article: 'a' };
  if (has('robot','knight','warrior','soldier','mecha','ninja','princess','queen','king','wizard','golem')) return { category: 'character', label: 'character', article: 'a' };
  if (has('flower','plant','tree','rose','succulent','leaf','bloom','cactus')) return { category: 'plant', label: 'plant', article: 'a' };
  if (has('food','cake','burger','fruit','pizza','cookie','cupcake','donut','bread')) return { category: 'food', label: 'food', article: 'a' };
  if (has('box','gift','heart','star','cube','sphere','geometric','diamond','crystal','lantern','ornament')) return { category: 'object', label: 'object', article: 'an' };
  return { category: 'abstract', label: 'papercraft', article: 'a' };
}
function styleNote(style: string): string {
  switch (style) {
    case 'cute': return 'The cute style leans into soft, rounded shapes and friendly proportions, so the finished piece reads as charming and approachable rather than realistic.';
    case 'lowpoly': return 'The low-poly style breaks the form into flat geometric facets, giving the model a modern, angular look that catches light from different angles.';
    case 'pixel': return 'The pixel style renders the subject as a blocky, retro grid — 8-bit art you can hold, with clean edges that are satisfying to cut.';
    case 'fantasy': return 'The fantasy style pushes dramatic detail: scales, wings, glow, and atmosphere, so the model feels like a creature pulled from a storybook.';
    default: return 'The design keeps a clean, geometric look that reads clearly as a papercraft-style artwork.'
  }
}
function paperWeight(subject: Subject, style: string): string {
  if (subject.category === 'dragon' || subject.category === 'building') return '200–250 gsm cardstock';
  if (subject.category === 'vehicle' || subject.category === 'character') return '180–220 gsm cardstock';
  if (style === 'pixel' || style === 'cute') return '160–200 gsm cardstock';
  return '180–220 gsm cardstock';
}
function estimate(prompt: string, subject: Subject): { difficulty: string; minutes: string } {
  const words = prompt.split(/\s+/).length;
  let score = 0;
  if (subject.category === 'dragon' || subject.category === 'vehicle' || subject.category === 'building') score += 2;
  else if (subject.category === 'character' || subject.category === 'animal') score += 1;
  if (words > 12) score += 1;
  if (score >= 3) return { difficulty: 'Hard', minutes: '45–90 minutes' };
  if (score === 2) return { difficulty: 'Medium', minutes: '25–45 minutes' };
  return { difficulty: 'Easy', minutes: '15–30 minutes' };
}
function subjectTip(subject: Subject): string {
  switch (subject.category) {
    case 'dragon': return 'Dragons have long tails and wings that like to droop — score the fold lines crisply and consider a small base or stand so the model stays upright on a shelf.';
    case 'animal': return 'Four-legged and winged subjects look best when the legs and joints are glued firmly; a heavier cardstock helps the figure stand on its own.';
    case 'vehicle': return 'Vehicles depend on clean, straight cuts along the body panels — a steel ruler and a fresh blade make the difference between a toy that looks crisp and one that looks rough.';
    case 'building': return 'Towers and castles read better with sharp creases at every corner; fold toward yourself and run a bone folder along each edge for a solid, architectural finish.';
    case 'character': return 'Characters carry a lot of small parts — assemble the torso first, then attach limbs and head so the proportions stay balanced as you build.';
    case 'plant': return 'Petals and leaves curve nicely if you curl them gently around a pencil after cutting, adding a little life to an otherwise flat sheet.';
    case 'food': return 'Layered treats like cakes look best built bottom-up; let each tier dry before adding the next so the stack stays straight.';
    case 'object': return 'Simple geometric objects are a great first project — precise cutting and a dab of glue at each tab is all it takes for a clean result.';
    default: return 'Start with the largest pieces to set the silhouette, then fill in the smaller details last.';
  }
}
function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function designUses(subject: Subject): string {
  const uses: Record<string, string> = {
    dragon: 'Use this dragon design as inspiration for a fantasy craft project, a D&D mini concept, or a dragon-themed party decoration.',
    animal: 'This animal design works great as a reference for a kids craft project, a nursery illustration, or a cute character concept.',
    vehicle: 'Use this vehicle design as a starting point for a toy prototype sketch, a transportation-themed art project, or a custom car concept.',
    building: 'This building design is perfect for architecture inspiration, a fantasy map landmark, or a model-building reference.',
    character: 'Use this character design as a concept art reference, a cosplay inspiration, or a starting point for an original character.',
    plant: 'This plant design works well as a botanical illustration reference, a garden art project, or a nature-themed decoration idea.',
    food: 'Use this food design as inspiration for a food-themed art project, a restaurant menu illustration, or a cute kitchen decoration.',
    object: 'This geometric object design is great for abstract art inspiration, a minimalist decoration concept, or a design reference.',
  };
  return uses[subject.category] || 'Use this design as inspiration for your next paper craft, art project, or creative exploration.';
}

function creativeTips(subject: Subject): string {
  const tips: Record<string, string> = {
    dragon: 'Creative tip: Try generating the same dragon in different styles — a cute dragon for kids, a low-poly dragon for modern decor, a fantasy dragon for epic art.',
    animal: 'Creative tip: Use this animal design as a starting point and add your own details — different colors, accessories, or a custom background scene.',
    vehicle: 'Creative tip: Generate the same vehicle in multiple styles to compare aesthetics — pixel art for retro, low poly for modern, cute for playful.',
    building: 'Creative tip: Use this building design as architectural inspiration — try sketching it from different angles or adding your own structural details.',
    character: 'Creative tip: Turn this character design into a full concept — generate different poses, expressions, and outfits to build a complete character sheet.',
    plant: 'Creative tip: Combine this plant design with other botanical elements to create a pattern, a wreath, or a nature-themed composition.',
    food: 'Creative tip: Use this food design as a menu illustration, a kitchen decoration, or inspiration for a food-themed art series.',
    object: 'Creative tip: Experiment with the same geometric object in different color palettes and styles to create a cohesive art series.',
  };
  return tips[subject.category] || 'Creative tip: Try generating the same idea in different styles to explore multiple visual directions.';
}

function buildIntro(prompt: string, subject: Subject, style: string, styleWord: string): string {
  const styleLabel = styleWord ? styleWord + ' ' : '';
  const h = strHash(prompt);
  const openers = [
    `This ${styleLabel}${subject.label} papercraft design is based on the idea "${prompt}", generated with koPaper's AI papercraft design studio. It's a papercraft-style artwork created for inspiration, creative exploration, and visual reference — not a printable template or assembly guide.`,
    `${capitalizeWords(subject.label)} in papercraft style? That's exactly what this ${styleLabel}${subject.label} design is — the idea "${prompt}" turned into a beautiful papercraft-style artwork by koPaper's AI generator. Use it as inspiration, a design reference, or a starting point for your own creative project.`,
    `Turn the idea "${prompt}" into a visual concept with this ${styleLabel}${subject.label} papercraft design from koPaper's AI generator. The artwork captures the papercraft aesthetic — geometric facets, paper textures, and handcrafted visual style — perfect for creative exploration.`,
    `Looking for ${styleLabel}${subject.label} papercraft inspiration? This design, based on the idea "${prompt}", was generated with koPaper's AI papercraft design studio. Use it as a visual reference, a creative starting point, or inspiration for your next art or craft project.`,
    `The idea "${prompt}" becomes a stunning ${styleLabel}${subject.label} papercraft design in this AI-generated artwork from koPaper. The papercraft style — with its geometric structure and paper-like textures — makes it perfect for design inspiration, creative reference, and visual exploration.`,
  ];
  const para1 = openers[h % openers.length];
  const para2 = styleNote(style);
  const para3 = designUses(subject);
  const howToUse = [
    `How to use this design: Save the image for your personal reference, use it as inspiration for a hand-drawn or painted artwork, or describe the same idea to the AI generator in a different style to explore alternative visual directions. The design is a creative concept, not a printable template.`,
    `How to use this design: Use it as a visual reference for your own creative projects, try recreating it in your preferred medium, or generate variations by changing the style or adding details in the AI generator. Each design is a unique creative concept worth exploring.`,
    `How to use this design: Save it to your inspiration collection, use it as a reference for proportions and styling, or use the AI generator to create a whole series based on the same idea in different styles. The papercraft aesthetic is versatile and works across many creative contexts.`,
    `How to use this design: Treat it as a starting point for creative exploration — sketch your own version, use it as color palette inspiration, or generate related designs by describing variations to the AI generator. Every design is a unique creative concept.`,
  ];
  const para4 = howToUse[h % howToUse.length];
  const para5 = subjectTip(subject) + ' ' + creativeTips(subject);
  const endings = [
    `Want to explore more? Browse the [gallery](/gallery/) for other AI-generated papercraft designs, or try the [AI papercraft generator](/) with your own idea. You can also check out the [origami tutorials](/origami/) for hands-on folding projects or the [printables](/printables/) for printable craft templates.`,
    `Inspired by this design? Run the same idea through the [AI papercraft generator](/) in a different style — Cute, Low Poly, Pixel, or Fantasy — to explore alternative visual directions. Browse the [gallery](/gallery/) for more AI-generated designs, or try the [origami tutorials](/origami/) for hands-on paper craft projects.`,
    `This design is one of many AI-generated papercraft concepts in the [gallery](/gallery/). Use the [AI papercraft generator](/) to create your own unique designs from any idea. For hands-on paper craft projects, browse the [origami tutorials](/origami/) and [printables](/printables/) collections.`,
  ];
  const para6 = endings[h % endings.length];
  return [para1, para2, para3, para4, para5, para6].join('\n\n');
}

export function buildMeta(promptRaw: string, styleRaw: string): Generated {
  const style = (styleRaw || 'cute').toString().toLowerCase();
  const prompt = stripArticle(promptRaw.trim());
  const subject = detectSubject(prompt);
  // Title: every title carries high-intent keywords "papercraft design" + "AI generated"
  const promptTitle = capitalizeWords(prompt);
  const subjectTitle = capitalizeWords(subject.label);
  const titleCandidates = [
    `${promptTitle} Papercraft Design — AI Generated`,
    `${promptTitle} Papercraft — AI Design`,
    `${subjectTitle} Papercraft Design — AI Generated`,
    `${subjectTitle} Papercraft — AI Design`,
  ];
  let title = titleCandidates.find(t => t.length <= 60) || titleCandidates[3].slice(0, 57).trimEnd() + `...`;
  const styleWord = style && !title.toLowerCase().includes(style) ? style : '';
  // Description: natural keyword integration, <= 160 chars — design focus, not template
  const styleDesc = styleWord ? styleWord + ' ' : '';
  const descCandidates = [
    `AI-generated ${styleDesc}${subject.label} papercraft design of "${prompt}". Papercraft-style artwork for inspiration, creative exploration, and visual reference.`,
    `AI-generated ${styleDesc}${subject.label} papercraft design. Papercraft-style artwork for inspiration, design reference, and creative exploration.`,
    `${capitalizeWords(styleDesc)}${subject.label} papercraft design — AI generated artwork for inspiration, creative reference, and visual exploration.`,
  ];
  let description = descCandidates.find(d => d.length <= 160) || descCandidates[2].slice(0, 157).trimEnd() + `...`;

  const caption = `AI-generated ${styleWord ? styleWord + ' ' : ''}papercraft of ${prompt}.`;
  const intro = buildIntro(prompt, subject, style, styleWord);

  return {
    prompt, style, title, description, caption, intro,
    emoji: pickEmoji(prompt), slug: slugify(title),
  };
}

export function imageLine(url: string, caption: string): string {
  return `\n\n![${mdAlt(caption)}](${url})\n\n*${caption}*`;
}

export function mediaExt(mediaType: string): string {
  if (mediaType === 'image/png') return 'png';
  if (mediaType === 'image/jpeg' || mediaType === 'image/jpg') return 'jpg';
  return 'png';
}

// ---- GitHub read (no deploy) ----
export async function ghGet(env: Record<string, string>, path: string, branch: string) {
  const res = await fetch(`${API}/repos/${env.GITHUB_REPO}/contents/${path}?ref=${branch}`, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'koPaper',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as { content?: string; sha: string };
}

// ---- GitHub single-file write (separate commit => separate deploy) ----
export async function ghPut(env: Record<string, string>, path: string, contentB64: string, message: string, branch: string, sha?: string) {
  const body: Record<string, unknown> = { message, content: contentB64, branch };
  if (sha) body.sha = sha;
  const res = await fetch(`${API}/repos/${env.GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'koPaper',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub PUT ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

// ---- GitHub bulk commit via Git Data API: one tree + one commit + one ref update => ONE deploy ----
// IMPORTANT: the Git Data tree endpoint's `content` field expects raw UTF-8 text, NOT base64.
// Binary files (images) cannot be sent as UTF-8 text, so we upload every file as a blob
// (the blobs API's `content`/`encoding:base64` is the correct base64 channel), then reference
// the blob by SHA in the tree. This keeps text + binary uniform and avoids writing base64
// strings into the repo (which is what the previous buggy version did).
export async function ghCommitAll(
  env: Record<string, string>,
  files: { path: string; contentBase64: string }[],
  message: string,
  branch: string,
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'koPaper',
  };
  const repo = env.GITHUB_REPO;

  // 1) current branch HEAD
  const refRes = await fetch(`${API}/repos/${repo}/git/refs/heads/${branch}`, { headers });
  if (!refRes.ok) throw new Error(`GitHub ref ${refRes.status}: ${(await refRes.text()).slice(0, 200)}`);
  const baseSha = (await refRes.json()).object.sha as string;

  // 2) create a blob for each file (base64-encoded binary or text, GitHub stores the real bytes)
  const tree: { path: string; mode: string; type: string; sha: string }[] = [];
  for (const f of files) {
    const blobRes = await fetch(`${API}/repos/${repo}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: f.contentBase64, encoding: 'base64' }),
    });
    if (!blobRes.ok) throw new Error(`GitHub blob ${blobRes.status} (${f.path}): ${(await blobRes.text()).slice(0, 200)}`);
    const blobSha = (await blobRes.json()).sha as string;
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blobSha });
  }

  // 3) build a tree on top of the current HEAD (base_tree preserves unchanged files)
  const treeRes = await fetch(`${API}/repos/${repo}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ base_tree: baseSha, tree }),
  });
  if (!treeRes.ok) throw new Error(`GitHub tree ${treeRes.status}: ${(await treeRes.text()).slice(0, 200)}`);
  const newTreeSha = (await treeRes.json()).sha as string;

  // 4) commit
  const commitRes = await fetch(`${API}/repos/${repo}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, tree: newTreeSha, parents: [baseSha] }),
  });
  if (!commitRes.ok) throw new Error(`GitHub commit ${commitRes.status}: ${(await commitRes.text()).slice(0, 200)}`);
  const newCommitSha = (await commitRes.json()).sha as string;

  // 5) move the branch ref
  const updRes = await fetch(`${API}/repos/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ sha: newCommitSha }),
  });
  if (!updRes.ok) throw new Error(`GitHub ref-update ${updRes.status}: ${(await updRes.text()).slice(0, 200)}`);
}

export interface DraftInput {
  prompt: string;
  style: string;
  kind?: string;
  b64?: string;
  mediaType?: string;
  svg?: string;
}

export interface FlushState {
  existingCache: Map<string, string>;
  mdAccum: Map<string, string>;
}

// Turn one draft into the file writes it needs. Aggregates same-slug articles in
// memory so a single flush never produces two conflicting tree entries for one md.
export async function planDraft(
  env: Record<string, string>,
  draft: DraftInput,
  state: FlushState,
): Promise<{ files: { path: string; contentBase64: string }[] } | { error: string }> {
  const promptRaw = (draft.prompt ?? '').toString().trim();
  if (!promptRaw || promptRaw.length > 1000) return { error: 'prompt is required (1-1000 chars).' };
  if (blacklistHit(promptRaw)) return { error: 'Contains a protected brand or character name and cannot be published.' };

  const kind = (draft.kind ?? 'raster').toString();
  let imageB64: string | undefined;
  if (kind === 'svg') {
    const svg = (draft.svg ?? '').toString();
    if (!svg) return { error: 'Missing svg content.' };
    imageB64 = utf8ToBase64(svg);
  } else {
    const b64 = (draft.b64 ?? '').toString().replace(/^data:.*;base64,/, '');
    if (!b64) return { error: 'Missing image data.' };
    imageB64 = b64;
  }
  const ext = kind === 'svg' ? 'svg' : mediaExt((draft.mediaType ?? 'image/png').toString());

  const meta = buildMeta(promptRaw, (draft.style ?? 'cute').toString());
  const fileName = `${meta.slug}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const imgRepoPath = `public/images/gallery/${fileName}`;
  const imgUrl = `/images/gallery/${fileName}`;
  const mdRepoPath = `src/content/gallery/${meta.slug}.md`;

  const files: { path: string; contentBase64: string }[] = [];
  files.push({ path: imgRepoPath, contentBase64: imageB64.replace(/\s/g, '') });

  let mdContent: string;
  if (state.mdAccum.has(meta.slug)) {
    mdContent = state.mdAccum.get(meta.slug)! + imageLine(imgUrl, meta.caption);
  } else {
    let prev = '';
    if (!state.existingCache.has(meta.slug)) {
      const ex = await ghGet(env, mdRepoPath, env.GITHUB_BRANCH || 'main');
      state.existingCache.set(meta.slug, ex ? base64ToUtf8(ex.content || '') : '');
    }
    prev = state.existingCache.get(meta.slug)!;
    if (prev) {
      // Appending a new image: bump `updated` to today so the post surfaces
      // at the top of time-sorted lists (matches "newest first" ordering).
      const todayBump = new Date().toISOString().slice(0, 10);
      const prevBumped = prev.replace(/^(updated:\s*)("?)[^"\r\n]*("?)$/m, `$1"${todayBump}"`);
      mdContent = prevBumped + imageLine(imgUrl, meta.caption);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const fm = [
        `title: ${yamlStr(meta.title)}`,
        `description: ${yamlStr(meta.description)}`,
        `emoji: ${yamlStr(meta.emoji)}`,
        meta.style ? `style: ${yamlStr(meta.style)}` : null,
        `updated: "${today}"`,
        `order: 99`,
        `draft: false`,
      ].filter(Boolean).join('\n');
      mdContent = `---\n${fm}\n---\n\n${meta.intro}${imageLine(imgUrl, meta.caption)}\n`;
    }
    state.mdAccum.set(meta.slug, mdContent);
  }
  // Defensive: never stage a markdown file with broken frontmatter into the repo.
  // If the generated frontmatter fails the self-check, skip this draft (it is
  // dropped from the queue by the caller) instead of corrupting the gallery.
  if (!validateFrontmatter(mdContent)) {
    return { error: 'generated frontmatter failed self-check; draft skipped to avoid corrupting gallery.' };
  }
  files.push({ path: mdRepoPath, contentBase64: utf8ToBase64(mdContent) });
  return { files };
}
