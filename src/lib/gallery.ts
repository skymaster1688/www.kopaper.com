// Shared helpers for koPaper Gallery publishing.
// Used by:
//   - /api/publish        (immediate publish, legacy single-item path)
//   - /api/publish-queue  (stage a draft into KV, no GitHub write, no deploy)
//   - /api/publish-flush  (bulk-commit all staged drafts via Git Data API => ONE deploy)

import type { APIContext } from 'astro';
import { pickDirections } from './directions';
import { generateArticleContent } from './directions-ai';

const API = 'https://api.github.com';

export const IP_BLOCKLIST = [
  'minecraft', 'creeper', 'pokemon', 'roblox', 'fnaf', 'five nights', 'disney', 'hello kitty',
  'sanrio', 'star wars', 'marvel', 'dc comics', 'harry potter', 'peppa', 'paw patrol',
  'spiderman', 'batman', 'simpsons', 'nintendo', 'zelda', 'mario', 'sonic', 'fortnite',
  'among us', 'barbie', 'taylor swift', 'genshin', 'lol', 'league of legends',
  'call of duty', 'minions', 'frozen', 'elsa', 'totoro', 'studio ghibli',
  'spongebob', 'tom and jerry', 'mickey', 'winnie the pooh', 'doraemon', 'powerpuff',
  // added 2026-08-29 after audit of indexed gallery URLs
  'gta', 'grand theft auto', 'one piece', 'mf doom', 'royal enfield', 'wilson',
  'nathan drake', 'uncharted', 'bungou', 'stray dogs', 'chuuya', 'bravado',
  // added 2026-11-01 after gallery triage: brands/characters that slipped through
  'iron man', 'ironman', 'creeper', 'invader zim', 'eustace bagge', 'courage the cowardly',
  'sanji', 'naruto', 'goku', 'dragon ball', 'attack on titan', 'demon slayer', 'jujutsu',
  'squid game', 'stranger things', 'angry birds', 'plants vs zombies', 'luffy', 'zoro',
  'pikachu', 'kirby', 'link zelda', 'master chief', 'halo', 'overwatch', 'genshin impact',
];

export const EMOJI_MAP: Record<string, string> = {
  panda: '🐼', cat: '🐱', dog: '🐶', fox: '🦊', rabbit: '🐰', bear: '🐻',
  lion: '🦁', tiger: '🐯', elephant: '🐘', horse: '🐴', fish: '🐟', bird: '🐦',
  heart: '❤️', flower: '🌸', rose: '🌹', star: '⭐', castle: '🏰', robot: '🤖',
  car: '🚗', rocket: '🚀', tree: '🌳', sun: '☀️', moon: '🌙', book: '📖',
  gift: '🎁', crown: '👑', dragon: '🐉', ghost: '👻', cake: '🎂', house: '🏠',
};

// Content policy: adult-toned subjects are rejected outright at publish time
// (2026-11-02, after removing the "sexy girl" gallery page).
const CONTENT_BLOCKLIST = [
  'sexy', 'nsfw', 'nude', 'naked', 'erotic', 'porn', 'hentai', 'xxx',
];

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
  if (typeof origin !== 'string') return null; // defensive: non-string input -> omit header (browser blocks)
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

// ---- publish-time quality gate (2026-11-02) --------------------------------
// Aligns automated publishing with the manual gallery-triage standard: a page
// earns an index slot only when the prompt is English and names a concrete,
// searchable subject. Weak drafts are still published (the user keeps their
// creation and its URL) but the generated frontmatter carries `noindex: true`,
// so a post-flush triage pass is no longer needed. IP/brand prompts are still
// rejected outright by blacklistHit().
const ROMANCE_FUNCTION_WORDS = new Set([
  // Spanish
  'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'del', 'al', 'que', 'de', 'en',
  'con', 'para', 'por', 'como', 'mas', 'pero', 'quiero', 'mi', 'tu', 'su', 'es',
  'son', 'esta', 'este', 'esto', 'hacer', 'quien', 'donde', 'cuando', 'yo', 'ella',
  'ellos', 'muy', 'tambien', 'segun', 'sobre', 'entre', 'hasta', 'desde', 'porque',
  // Portuguese
  'os', 'as', 'um', 'umas', 'do', 'da', 'dos', 'das', 'na', 'nos', 'nas', 'em',
  'mais', 'muito', 'quero', 'crie', 'criar', 'fazer', 'isso', 'esse', 'essa',
  'meu', 'minha', 'sua', 'nao', 'aqui', 'voce', 'voces', 'entao',
]);

// Words that carry no subject information on their own. A prompt made up only
// of these has no concrete, searchable subject ("create a professional
// papercraft") and gets noindexed.
const GENERIC_WORDS = new Set([
  'a', 'an', 'the', 'of', 'for', 'with', 'and', 'or', 'in', 'on', 'to', 'at', 'by',
  'my', 'me', 'i', 'is', 'it', 'its', 'that', 'this', 'these', 'those', 'please',
  'make', 'making', 'create', 'creating', 'generate', 'generated', 'design',
  'designs', 'template', 'templates', 'model', 'papercraft', 'paper', 'craft',
  'crafts', 'art', 'artwork', 'style', 'cute', 'low', 'poly', 'pixel', 'fantasy',
  'blocky', 'simple', 'easy', 'cool', 'nice', 'best', 'good', 'great', 'free',
  'new', 'ai', '2d', '3d', 'professional', 'looking', 'look', 'some', 'one',
  'very', 'really', 'want', 'wanted', 'need', 'needed', 'can', 'you', 'your',
  'get', 'got', 'from', 'like', 'just', 'version', 'image', 'picture', 'photo',
]);

export interface PromptQuality {
  ok: boolean;
  reason?: string;
}

export function promptQuality(promptRaw: string): PromptQuality {
  const p = promptRaw.toLowerCase();
  const words = p.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  // 1) Non-English prompt: 2+ non-ASCII characters (accents, CJK, Cyrillic)
  //    or 2+ distinct Spanish/Portuguese function words.
  const nonAscii = (p.match(/[^ -~]/g) || []).length;
  if (nonAscii >= 2) return { ok: false, reason: 'non-English prompt' };
  const romanceHits = new Set(words.filter(w => ROMANCE_FUNCTION_WORDS.has(w)));
  // Spanish/Portuguese prompts usually open with a Romance article/pronoun
  // ("un robot futurista", "crie uma pocao...") even when few function words follow.
  if (words.length > 0 && romanceHits.has(words[0])) return { ok: false, reason: 'non-English prompt' };
  if (romanceHits.size >= 2) return { ok: false, reason: 'non-English prompt' };
  // 2) No concrete subject: every word is generic craft/boilerplate vocabulary.
  const concrete = words.filter(w => w.length >= 2 && !GENERIC_WORDS.has(w));
  if (concrete.length === 0) return { ok: false, reason: 'no concrete subject' };
  return { ok: true };
}

export function blacklistHit(prompt: string): string | undefined {
  const p = prompt.toLowerCase();
  return IP_BLOCKLIST.find(t => p.includes(t)) || CONTENT_BLOCKLIST.find(t => p.includes(t));
}

// Publish-time rejection message: distinguishes IP/brand hits from content-policy hits.
export function publishRejection(prompt: string): string | undefined {
  const hit = blacklistHit(prompt);
  if (!hit) return undefined;
  return CONTENT_BLOCKLIST.includes(hit)
    ? 'This prompt contains content koPaper cannot publish.'
    : 'Contains a protected brand or character name and cannot be published.';
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
  // Publish-time quality gate (see promptQuality): true => frontmatter gets
  // `noindex: true` so the page stays accessible but stays out of the index.
  noindex: boolean;
  noindexReason?: string;
}

// ---- rich gallery article generation (replaces boilerplate) ----
export type Subject = { category: string; label: string; article: string };
export function detectSubject(prompt: string): Subject {
  const p = prompt.toLowerCase();
  const has = (...k: string[]) => k.some(x => p.includes(x));
  if (has('dragon')) return { category: 'dragon', label: 'dragon', article: 'a' };
  if (has('cat','dog','bear','fox','rabbit','panda','bird','owl','eagle','fish','shark','elephant','tiger','lion','wolf','horse','cow','pig','snake','deer','frog','penguin','butterfly','bee','crab','octopus','whale','mouse','monkey','koala','unicorn','iguana','triceratops','hedgehog','panther','dolphin','hamster','turtle')) return { category: 'animal', label: 'animal', article: 'an' };
  // Word-boundary so "bath"/"battle" do not count as a bat.
  if (/\bbats?\b/.test(p)) return { category: 'animal', label: 'animal', article: 'an' };
  if (has('car','truck','vehicle','bike','motorcycle','plane','airplane','ship','boat','train','bus','tank','helicopter')) return { category: 'vehicle', label: 'vehicle', article: 'a' };
  if (has('castle','house','home','building','temple','tower','church','statue','pyramid','cottage','cabin','skyscraper','ferris')) return { category: 'building', label: 'building', article: 'a' };
  if (has('robot','knight','warrior','soldier','mecha','ninja','princess','queen','king','wizard','golem','explorer')) return { category: 'character', label: 'character', article: 'a' };
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

// ---- gallery article body ---------------------------------------------------
// Every article comes from the same two inputs (prompt + style), so the only way
// to keep 100+ pages from reading alike is to vary sentence shape, vocabulary and
// section wording by a stable hash of the prompt. The Workers AI path
// (directions-ai.ts) still writes fully original copy when the binding is
// available; this deterministic version is the guaranteed fallback and must never
// read like a filled-in template.
const STYLE_NOTES: Record<string, string[]> = {
  cute: [
    'Round silhouettes and a soft palette do the heavy lifting here — nothing in this design has a sharp corner to hide behind, so the shapes have to be right.',
    'Everything about this one is soft: chubby proportions, wide-set eyes, a pastel palette that keeps the volumes reading as friendly.',
    'The cute style works by subtraction: fewer planes, rounder edges, and colour doing most of the emotional work.',
  ],
  lowpoly: [
    'The look comes from flat triangular facets: a tight palette keeps every plane readable, and the hard edges do the modelling instead of shading.',
    'Facets are the whole idea here — each triangle catches the light at a slightly different angle, so the geometry reads even in a flat image.',
    'Low poly means the shape is described by a small number of planes, which is exactly what folded paper does naturally.',
  ],
  pixel: [
    'Chunky blocks and a cut-down palette give it the feel of a game sprite that was printed, trimmed and stood up by hand.',
    'Every edge here is a right angle; the charm is in the staircase outlines and how few colours it takes to read the subject.',
    'The pixel style trades curves for squares, which makes it the most forgiving look to rebuild with a ruler and a blade.',
  ],
  fantasy: [
    'Layered scenery, a warm light source and a little glow push this one toward illustration rather than studio product shot.',
    'Fantasy styling brings atmosphere: a low light source, depth layers and a hint of magic around the edges of the subject.',
    'This one is staged rather than photographed — foreground, subject and backdrop read as separate planes.',
  ],
  minecraft: [
    'Everything is built from cubes here, so it reads as a stack of blocks rather than one folded sheet.',
    'The voxel style is all right angles and repeated units: big cubes set the silhouette, smaller ones add detail.',
    'Blocks instead of folds: the shape is assembled from cubes, which is why the edges look so deliberately stepped.',
  ],
};
const STYLE_MATERIALS: Record<string, string[]> = {
  cute: [
    'Heavy cardstock around 200–250 gsm holds rounded shapes without sagging; score the curves lightly with the back of a blade before folding so the paper does not crack.',
    'Rounded paper shapes need a little give: 180–220 gsm card bends cleanly, while anything heavier fights you at every curve.',
    'For soft, rounded forms, crease gently over a dowel rather than pressing hard — the paper keeps its curve instead of kinking.',
  ],
  lowpoly: [
    'Score every fold line against a steel rule before creasing, and use 250–300 gsm card so the facets stay flat instead of bulging.',
    'Faceted models only look sharp if the edges are dead straight: cut with a fresh blade, fold over a ruler, and avoid double-creasing.',
    'Stiffer card is your friend here — 260 gsm or above keeps large planes from flexing once the piece is standing.',
  ],
  pixel: [
    'Build it on a grid: print a light 5 mm grid, count squares rather than eyeballing, and keep a fresh blade in the knife so every step stays square.',
    'Squared shapes tolerate copy paper surprisingly well, but 160–200 gsm card holds the stepped edges far better.',
    'Work from one corner outwards so the grid squares stay aligned; drift shows up immediately on a pixel silhouette.',
  ],
  fantasy: [
    'Layer it — foreground, middle ground and background on separate sheets, stacked with foam pads so the depth reads at a glance.',
    'The depth comes from spacing: mount each layer a few millimetres in front of the last and let the shadows do the rest.',
    'Use two paper weights — thin sheets for distant layers, heavier card for the subject — so the focus falls where you want it.',
  ],
  minecraft: [
    'Cubes are forgiving: cut identical squares, score all four edges, glue the seams with PVA and weight the assembly while it dries.',
    'Batch the cubes: cut and score all of one size before folding, and the build goes together twice as fast.',
    'A cutting mat and a set square matter more than fancy paper here — voxel models live or die on consistent 90° edges.',
  ],
};
// Closing caveat, many wordings — same point, different phrasing, no shared prefix.
const HONEST_NOTES = [
  'This page shows the look of the finished piece, not a cutting guide — the fold lines themselves are not included.',
  'Treat it as concept art for the real thing: it shows how the design should read, not where to cut.',
  'What you see is papercraft-style illustration rather than a printable net, so use it as visual reference.',
  'Think of this as the before picture — the artwork shows the finished look, the net is still up to you.',
  'It is inspiration rather than a template: useful for proportions, colour and staging, not for tracing.',
  'The render tells you how the model should read; the geometry behind it is yours to work out.',
  'Useful as a reference shot of the finished model, though it will not fold itself into one.',
  'A finished-look reference, not a cut list — worth printing for the palette and silhouette alone.',
  'The image is the destination, not the map: great for matching proportions, useless as a tracing sheet.',
  'Handy for deciding colour, scale and pose before you commit to card and blade.',
];
const DIRECTION_OPENERS = [
  'Want a warmer version?', 'For a sharper take,', 'If you would rather see it in context,',
  'To push the detail further,', 'For a moodier result,', 'If the first try feels too safe,',
  'When you are ready for a variation,',
];
// Second-paragraph subject advice, three variants each so neighbouring pages of the
// same category never share the same sentence.
const SUBJECT_TIPS: Record<string, string[]> = {
  animal: [
    'Four-legged and winged subjects look best when the legs and joints are glued firmly; a heavier cardstock helps the figure stand on its own.',
    'Animals live or die on the silhouette — get the ears, tail and stance right first, then add surface detail only if the shape already reads.',
    'If you build the paper version, give it a base: a small strip of card under the paws stops the whole figure from tipping forward.',
  ],
  dragon: [
    'Dragons have long tails and wings that like to droop — score the fold lines crisply and consider a small base or stand so the model stays upright on a shelf.',
    'Wings are the hard part: cut them as one piece with a fold down the middle so both sides stay symmetrical.',
    'A dragon reads better with a bit of curve to the neck and tail than with everything held perfectly straight.',
  ],
  vehicle: [
    'Vehicles depend on clean, straight cuts along the body panels — a steel ruler and a fresh blade make the difference between a toy that looks crisp and one that looks rough.',
    'Wheels are the detail people notice first; cut them last, when the body already holds its shape.',
    'Keep the body panels flat while the glue dries — a warp of a millimetre shows up badly on a vehicle.',
  ],
  building: [
    'Towers and castles read better with sharp creases at every corner; fold toward yourself and run a bone folder along each edge for a solid, architectural finish.',
    'Roofs and spires set the scale, so measure those first and work downwards towards the base.',
    'Architecture is where paper behaves best: straight folds, square corners, and almost no shaping required.',
  ],
  character: [
    'Characters carry a lot of small parts — assemble the torso first, then attach limbs and head so the proportions stay balanced as you build.',
    'Give a character one clear prop or colour accent; without it the figure tends to read as generic.',
    'Build the head first and match everything else to it — proportion problems always show up there.',
  ],
  plant: [
    'Petals and leaves curve nicely if you curl them gently around a pencil after cutting, adding a little life to an otherwise flat sheet.',
    'Stems need wire or a rolled paper core, otherwise they bend as soon as the flower head goes on.',
    'Keep the vein side of the card facing up on leaves; the texture catches light and stops them looking like flat shapes.',
  ],
  food: [
    'Layered treats like cakes look best built bottom-up; let each tier dry before adding the next so the stack stays straight.',
    'Food reads through texture more than shape — a light emboss on the surface sells the idea faster than extra detail.',
    'Small props (a paper plate, a folded napkin) do a lot of the work when the main subject is simple.',
  ],
  object: [
    'Simple geometric objects are a great first project — precise cutting and a dab of glue at each tab is all it takes for a clean result.',
    'Symmetry is everything with objects; cut one face, use it as the template for the rest.',
    'Objects photograph well in sets, so a matching trio is often a stronger result than one perfect piece.',
  ],
  abstract: [
    'Start with the largest pieces to set the silhouette, then fill in the smaller details last.',
    'When the idea is abstract, contrast does the work: one bold colour against a quiet background.',
    'Abstract shapes benefit from a hard light — the shadow becomes part of the composition.',
  ],
};
// Subject-aware scenes. Generic modifiers ("add more detail", "cozy scene") are
// exactly what made these articles feel machine-written, so each direction below
// is a concrete, plausible next step for THIS kind of subject.
const ARTICLE_SCENES: Record<string, { label: string; suffix: string }[]> = {
  animal: [
    { label: 'mid-action', suffix: 'caught mid-leap with one paw lifted and a simple paper shadow beneath' },
    { label: 'asleep', suffix: 'curled up asleep in a shallow paper nest under soft morning light' },
    { label: 'display stand', suffix: 'mounted on a small paper plinth like a gallery piece' },
    { label: 'pair', suffix: 'as a pair of matching figures, one slightly smaller' },
  ],
  dragon: [
    { label: 'on a spire', suffix: 'perched on a jagged paper rock spire with wings half open' },
    { label: 'flame breath', suffix: 'breathing a stylised flame made of curled paper strips' },
    { label: 'hoard', suffix: 'coiled protectively around a small paper treasure hoard' },
    { label: 'in flight', suffix: 'gliding above layered paper clouds, seen from slightly below' },
  ],
  vehicle: [
    { label: 'on a road', suffix: 'parked on a strip of paper road with a few paper trees behind it' },
    { label: 'in motion', suffix: 'leaning into a turn with paper motion streaks trailing behind' },
    { label: 'blueprint', suffix: 'presented on a blueprint-style sheet with visible fold marks' },
    { label: 'scale check', suffix: 'standing next to a tiny paper figure to show the scale' },
  ],
  building: [
    { label: 'at dusk', suffix: 'lit from inside at dusk, warm paper windows glowing' },
    { label: 'overgrown', suffix: 'half overgrown with paper vines and tiny paper leaves' },
    { label: 'cutaway', suffix: 'shown as an open cutaway with the rooms visible inside' },
    { label: 'elevation', suffix: 'drawn as a flat architectural elevation on graph paper' },
  ],
  character: [
    { label: 'with a prop', suffix: 'holding one simple paper prop that hints at the story' },
    { label: 'layered costume', suffix: 'wearing an extra layer of folded paper armour over the base' },
    { label: 'on a stage', suffix: 'standing on a small paper stage in front of a flat painted backdrop' },
    { label: 'close-up', suffix: 'framed as a close-up of the head and shoulders only' },
  ],
  plant: [
    { label: 'single stem', suffix: 'as a single stem in a narrow paper vase' },
    { label: 'bouquet', suffix: 'grouped into a small bouquet with mixed paper tones' },
    { label: 'terrarium', suffix: 'inside a paper-cut terrarium with layered foliage' },
    { label: 'pressed', suffix: 'pressed flat like a botanical specimen on cream paper' },
  ],
  food: [
    { label: 'serving board', suffix: 'arranged on a paper serving board with folded napkins' },
    { label: 'cross-section', suffix: 'cut in half so the layered paper interior shows' },
    { label: 'stacked', suffix: 'stacked three high with paper crumbs scattered around' },
    { label: 'packaged', suffix: 'wrapped in a paper package with a folded label' },
  ],
  object: [
    { label: 'hero shot', suffix: 'centred as a single hero shot on a plain cream sweep' },
    { label: 'set of three', suffix: 'shown as a set of three in different sizes on a shelf' },
    { label: 'exploded', suffix: 'exploded into its paper parts, floating slightly apart' },
    { label: 'hard light', suffix: 'lit hard from one side so the paper shadow becomes part of the picture' },
  ],
  abstract: [
    { label: 'colourways', suffix: 'shown in three different paper colourways side by side' },
    { label: 'two scales', suffix: 'shown small and large in the same frame for contrast' },
    { label: 'mixed stock', suffix: 'built from kraft, white and tissue paper layers' },
    { label: 'hard light', suffix: 'lit hard from one side so the paper shadow becomes part of the picture' },
  ],
};

export function buildIntro(prompt: string, subject: Subject, style: string, styleWord: string): string {
  const h = strHash(prompt + '|' + style);
  const styleAdj = styleWord ? styleWord : '';                    // e.g. 'low poly '
  const noun = subject.label === 'papercraft' ? '' : subject.label;
  const np = styleAdj + (noun ? noun + ' ' : '') + 'papercraft design'; // 'low poly animal papercraft design'
  const article = styleAdj ? 'a' : subject.article;               // 'a low poly ...' / 'an object ...'
  const subjectWord = noun || 'idea';
  const subjArticle = noun ? subject.article : 'an';              // 'an animal' / 'an object' / 'an idea'

  const leadShapes = [
    `Type "${prompt}" into the generator and this is what comes back: ${article} ${np} — no brush, no ruler, no cutting mat.`,
    `Some ideas look better in paper than on paper. Rendered as ${article} ${np}, "${prompt}" finally looks like something you could pick up.`,
    `"${prompt}" was the whole brief behind this ${np}, and it turned into ${subjArticle} ${subjectWord} with visible folds, layered depth and a soft studio background.`,
    `Half the charm of a paper model is the way it catches light. That is what this ${np} of "${prompt}" is leaning on.`,
    `Describe "${prompt}", pick a style, and the papercraft generator does the rest — ${article} ${np}, downloaded in seconds.`,
    `A sentence went in, ${article} ${np} came out. The sentence was "${prompt}".`,
    `Paper is an odd medium for a machine to imitate, yet here it is: ${article} ${np} built around "${prompt}".`,
    `"${prompt}" reads differently once it is folded. That is the short version of this ${np}.`,
    `Nothing was cut, scored or glued to make the picture above — it is ${article} ${np} of "${prompt}", drawn rather than built.`,
    `One line went into the prompt box. ${subjArticle.charAt(0).toUpperCase() + subjArticle.slice(1)} ${subjectWord} in paper came out, styled as a ${np}.`,
  ];
  const lead = leadShapes[h % leadShapes.length];

  const styleNotes = STYLE_NOTES[style] || STYLE_NOTES.cute;
  const look = styleNotes[h % styleNotes.length];
  const tips = SUBJECT_TIPS[subject.category] || SUBJECT_TIPS.abstract;
  const tip = tips[Math.floor(h / 7) % tips.length];
  const secondPara = h % 3 === 0 ? `${tip} ${look}` : `${look} ${tip}`;

  const scenes = ARTICLE_SCENES[subject.category] || ARTICLE_SCENES.abstract;
  const dirSentences = scenes.map((scene, i) => {
    const opener = DIRECTION_OPENERS[(h + i * 3) % DIRECTION_OPENERS.length];
    return `${opener} try "${prompt}, ${scene.suffix}".`;
  }).join(' ');
  const dirIntros = [
    'The first result is rarely the one you keep.',
    'Most people generate three or four versions before settling on one.',
    'One generation is a starting point, not a finished piece.',
    'The obvious version is easy; the interesting one usually takes a second prompt.',
    'If the first take feels flat, that is normal — the follow-ups are where it gets interesting.',
    'Worth remembering: every one of these is one sentence away from a different picture.',
    'Nothing here is final until you stop generating.',
    'Each of these keeps the subject and changes the staging.',
  ];

  const materials = STYLE_MATERIALS[style] || STYLE_MATERIALS.cute;
  const material = materials[Math.floor(h / 13) % materials.length];
  const honestNote = HONEST_NOTES[h % HONEST_NOTES.length];
  const hasCatPage = ['animal', 'dragon', 'vehicle', 'building'].includes(subject.category);
  const catLink = hasCatPage
    ? `[more ${subject.category} papercraft designs](/gallery/${subject.category}/)`
    : '[the rest of the gallery](/gallery/)';
  const closings = [
    'Looking for another angle?',
    'Still deciding on a direction?',
    'Want to see how other ideas turned out?',
    'If you would rather start from something finished,',
    'For more of the same subject,',
    'Not sure where to go next?',
    'Hunting for a place to start?',
    'Curious what else people are making?',
  ];

  return [
    lead,
    '',
    secondPara,
    '',
    '## Ways to take this further',
    '',
    `${dirIntros[h % dirIntros.length]} ${dirSentences} Paste any of them into the generator and the same idea comes back with a different mood — same subject, different light, different level of detail.`,
    '',
    '## Building it in real paper',
    '',
    `${material}`,
    '',
    `${honestNote} ${closings[Math.floor(h / 5) % closings.length]} Browse ${catLink}, grab a [printable template](/printables/) when you want fold lines already drawn, or fold something by hand with the [origami tutorials](/origami/).`,
  ].join('\n');
}

const STYLE_LABEL: Record<string, string> = {
  cute: 'Cute', lowpoly: 'Low Poly', pixel: 'Pixel', fantasy: 'Fantasy', minecraft: 'Blocky',
};

export function buildMeta(promptRaw: string, styleRaw: string): Generated {
  const style = (styleRaw || 'cute').toString().toLowerCase();
  const prompt = stripArticle(promptRaw.trim());
  const subject = detectSubject(prompt);
  // Title: prefer the real prompt (unique per page); fall back to style + subject.
  // No "— Free X Design" suffix — that pattern made 90+ pages read identically.
  const styleLabel = STYLE_LABEL[style] || '';
  const promptTitle = capitalizeWords(prompt);
  const subjectTitle = capitalizeWords(subject.label);
  const titleCandidates = [
    `${promptTitle} Papercraft Design`,
    `${styleLabel} ${subjectTitle} Papercraft Design`,
    `${promptTitle} Papercraft`,
    `${subjectTitle} Papercraft Design`,
  ]
    .map(t => t.replace(/\s+/g, ' ').trim())
    .filter(t => t.length > 0 && t.length <= 60);
  const title = titleCandidates[0] || `${subjectTitle} Papercraft Design`;

  const styleWord = styleLabel ? styleLabel.toLowerCase() + ' ' : '';
  // Descriptions rotate between four skeletons (picked by a stable hash of the prompt)
  // so neighbouring pages do not share one sentence pattern.
  const hash = [...prompt].reduce((a, c) => a + c.charCodeAt(0), 0);
  const descSkeletons = [
    `A free ${styleWord}${subject.label} papercraft design of "${prompt}" — AI-generated artwork with the prompt ready to copy and remix.`,
    `Free ${styleWord}${subject.label} papercraft design: "${prompt}". AI papercraft artwork plus follow-up prompts to try next.`,
    `"${prompt}" rendered as a ${styleWord}${subject.label} papercraft design. Free AI-generated artwork, no sign-up needed.`,
    `Turn one sentence into a ${styleWord}${subject.label} papercraft design. This one started from "${prompt}" — free and instant.`,
  ];
  const rotated = descSkeletons.map((_, i) => descSkeletons[(hash + i) % descSkeletons.length]);
  let description = rotated.find(d => d.length <= 160) || descSkeletons[0];

  const caption = `AI-generated ${styleWord ? styleWord : ''}papercraft of ${prompt}.`;
  const intro = buildIntro(prompt, subject, style, styleWord);
  const quality = promptQuality(prompt);

  return {
    prompt, style, title, description, caption, intro,
    emoji: pickEmoji(prompt), slug: slugify(title),
    noindex: !quality.ok,
    noindexReason: quality.reason,
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
  const rejection = publishRejection(promptRaw);
  if (rejection) return { error: rejection };

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
  // AI-personalized directions: analyze the idea for 3-5 concrete directions, each
  // with a ready-to-use generation prompt. Falls back to the deterministic intro
  // if the LLM is unavailable, times out, or returns unparseable output.
  let intro = meta.intro;
  let description = meta.description;
  let title = meta.title;
  try {
    const ai = await generateArticleContent(meta.prompt, (env as any)?.AI);
    if (ai) {
      intro = ai.intro;
      if (ai.description) description = ai.description;
      if (ai.title) title = ai.title;
    }
  } catch { /* keep deterministic fallback */ }
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
        `title: ${yamlStr(title)}`,
        `description: ${yamlStr(description)}`,
        `emoji: ${yamlStr(meta.emoji)}`,
        meta.style ? `style: ${yamlStr(meta.style)}` : null,
        `updated: "${today}"`,
        `order: 99`,
        `draft: false`,
        // Quality gate: weak prompts (non-English / no concrete subject) are
        // published but excluded from the index at the source.
        meta.noindex ? `noindex: true` : null,
      ].filter(Boolean).join('\n');
      mdContent = `---\n${fm}\n---\n\n${intro}${imageLine(imgUrl, meta.caption)}\n`;
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
