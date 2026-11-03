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
  // Whole-word matching. Substring matching sent "card" to vehicles, "catalog" to
  // animals and, worst of all, "papercraft" to watercraft via "raft".
  const has = (...k: string[]) => k.some(x => new RegExp(`\\b${x}s?\\b`).test(p));
  if (has('dragon')) return { category: 'dragon', label: 'dragon', article: 'a' };
  if (has('cat','dog','bear','fox','rabbit','panda','bird','owl','eagle','fish','shark','elephant','tiger','lion','wolf','horse','cow','pig','snake','deer','frog','penguin','butterfly','bee','crab','octopus','whale','mouse','monkey','koala','unicorn','iguana','triceratops','hedgehog','panther','dolphin','hamster','turtle')) return { category: 'animal', label: 'animal', article: 'an' };
  // Word-boundary so "bath"/"battle" do not count as a bat.
  if (/\bbats?\b/.test(p)) return { category: 'animal', label: 'animal', article: 'an' };
  // Watercraft get their own category: reusing the vehicle scenes told ships to
  // park on a paper road, which is exactly the kind of nonsense a template emits.
  if (has('ship','boat','sailboat','yacht','canoe','kayak','submarine','galleon','raft','ferry','schooner','vessel')) return { category: 'watercraft', label: 'boat', article: 'a' };
  if (has('car','truck','vehicle','bike','motorcycle','plane','airplane','train','bus','tank','helicopter')) return { category: 'vehicle', label: 'vehicle', article: 'a' };
  if (has('castle','house','home','building','temple','tower','church','statue','pyramid','cottage','cabin','skyscraper','ferris','cathedral','bridge','lighthouse','windmill','palace')) return { category: 'building', label: 'building', article: 'a' };
  if (has('robot','knight','warrior','soldier','mecha','ninja','princess','queen','king','wizard','golem','explorer','character','girl','boy','person','figure','hero','villain','samurai','astronaut','pirate','fairy','elf')) return { category: 'character', label: 'character', article: 'a' };
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
// House style for article bodies. These rules exist because the previous version
// read unmistakably machine-written, so do not "smooth" them back out:
//   · short sentences, one idea each. The em dash is banned outright.
//   · no tricolon flourishes, no closing line that restates the paragraph.
//   · section count, heading wording, direction count and link count all shift
//     with the prompt hash, so no two pages share an outline.
const STYLE_NOTES: Record<string, string[]> = {
  cute: [
    'The cute style leans on proportion more than detail. Big head, small body, rounded everywhere. Nothing here has a sharp corner to hide behind, so the shapes have to be right.',
    'Soft edges and a pastel palette carry this one. Chubby proportions, wide-set eyes, and very little geometry to get wrong.',
    'Cute is mostly subtraction. Fewer planes, rounder edges, and colour doing the emotional work.',
    'Nothing in a cute design is complicated on its own. The difficulty is keeping every soft shape at the same level of round.',
  ],
  lowpoly: [
    'The look comes from flat triangular facets. A tight palette keeps every plane readable, and the hard edges do the modelling instead of shading.',
    'Facets are the whole idea. Each triangle catches light at a slightly different angle, so the geometry reads even in a flat image.',
    'Low poly means the shape is described by a small number of planes. Folded paper does that naturally, which is why the style suits it.',
    'Flat planes, no gradients, and a palette small enough to count on one hand. That is the entire trick.',
  ],
  pixel: [
    'Chunky blocks and a cut-down palette give it the feel of a game sprite that was printed, trimmed, then stood up by hand.',
    'Every edge here is a right angle. The charm is in the staircase outlines and how few colours it takes to read the subject.',
    'The pixel style trades curves for squares. That makes it the most forgiving look to rebuild with a ruler and a blade.',
    'Pixel art is a grid with opinions. Once the grid is set, the detail is just choosing which squares to fill.',
  ],
  fantasy: [
    'Layered scenery, a warm light source and a little glow push this toward illustration rather than studio product shot.',
    'Fantasy styling brings atmosphere. Low light, depth layers, and a bit of haze around the edges of the subject.',
    'This one is staged rather than photographed. Foreground, subject and backdrop read as separate planes.',
    'The mood is doing as much work as the model here. Warm light from below, cool shadow behind, and the paper becomes scenery.',
  ],
  minecraft: [
    'Everything is built from cubes, so it reads as a stack of blocks rather than one folded sheet.',
    'The voxel style is all right angles and repeated units. Big cubes set the silhouette, smaller ones add detail.',
    'Blocks instead of folds. The shape is assembled from cubes, which is why the edges look so deliberately stepped.',
    'Voxel shapes are easy to read and hard to get wrong. The only real decision is how big each cube should be.',
  ],
};
const STYLE_MATERIALS: Record<string, string[]> = {
  cute: [
    'Heavy cardstock, somewhere near 200 to 250 gsm, holds rounded shapes without sagging. Score the curves lightly with the back of a blade before folding so the paper does not crack.',
    'Rounded paper shapes need a little give. 180 to 220 gsm card bends cleanly, and anything heavier fights you at every curve.',
    'For soft forms, crease gently over a dowel instead of pressing hard. The paper keeps its curve rather than kinking.',
    'Score curves, do not fold them. Two light passes with a blunt tool beats one hard crease every time.',
  ],
  lowpoly: [
    'Score every fold line against a steel rule before creasing. 250 to 300 gsm card keeps the facets flat instead of bulging.',
    'Faceted models only look sharp if the edges are dead straight. Fresh blade, fold over a ruler, and never crease the same line twice.',
    'Stiffer card helps here. 260 gsm and up keeps the large planes from flexing once the piece is standing.',
    'Cut every face before you fold any of them. Faceted builds go together much faster when the parts are already on the table.',
  ],
  pixel: [
    'Build it on a grid. Print a light 5 mm grid, count squares instead of eyeballing, and keep a fresh blade in the knife so every step stays square.',
    'Squared shapes tolerate copy paper surprisingly well, though 160 to 200 gsm card holds the stepped edges far better.',
    'Work outwards from one corner so the grid squares stay aligned. Drift shows up immediately on a pixel silhouette.',
    'A set square and a self-healing mat do more for a pixel build than expensive paper does.',
  ],
  fantasy: [
    'Layer it. Foreground, middle ground and background on separate sheets, stacked with foam pads so the depth reads at a glance.',
    'The depth comes from spacing. Mount each layer a few millimetres in front of the last and let the shadows do the rest.',
    'Use two paper weights. Thin sheets for distant layers, heavier card for the subject, so the focus lands where you want it.',
    'Backlight it if you can. A single warm lamp behind the layers sells the scene better than any amount of extra cutting.',
  ],
  minecraft: [
    'Cubes are forgiving. Cut identical squares, score all four edges, glue the seams with PVA and weight the assembly while it dries.',
    'Batch the cubes. Cut and score everything of one size before folding, and the build goes together twice as fast.',
    'A cutting mat and a set square matter more than fancy paper. Voxel models live or die on consistent right angles.',
    'Keep the cubes slightly under size and the gaps will read as joints. Oversized cubes always look like a mistake.',
  ],
};
// One short, plain caveat. It appears on some pages and not others, because a
// disclaimer on every single article is itself a tell.
const HONEST_NOTES = [
  'Worth saying plainly: this is artwork, not a printable net. No fold lines are included.',
  'No cut lines here. The image shows the finished look only.',
  'This is a reference image rather than a template. The build is yours to work out.',
  'You will not be able to print and fold this one. It is a picture of the finished idea.',
  'Treat the artwork as the target, not the pattern.',
  'Handy for colour, scale and pose. Useless as something to trace.',
  'The render shows how it should read, not where to cut.',
  'Great for matching proportions. Not a cutting guide.',
];
// Second-paragraph subject advice. Four variants per category, so neighbouring
// pages of the same category never share a sentence.
const SUBJECT_TIPS: Record<string, string[]> = {
  animal: [
    'Four-legged and winged subjects look best when the legs and joints are glued firmly. Heavier cardstock helps the figure stand on its own.',
    'Animals live or die on the silhouette. Get the ears, tail and stance right first, then add surface detail if the shape already reads.',
    'If you build the paper version, give it a base. A small strip of card under the paws stops the whole figure tipping forward.',
    'Fur is not worth chasing in paper. Group the shapes into a few large masses and let the outline say animal.',
  ],
  dragon: [
    'Dragons have long tails and wings that like to droop. Score the fold lines crisply and consider a small stand so the model stays upright on a shelf.',
    'Wings are the hard part. Cut them as one piece with a fold down the middle so both sides stay symmetrical.',
    'A dragon reads better with a slight curve in the neck and tail than with everything held perfectly straight.',
    'Tails need either wire or a rolled paper core. Unsupported, they sag within a day.',
  ],
  vehicle: [
    'Vehicles depend on straight cuts along the body panels. A steel ruler and a fresh blade make the difference between a toy that looks crisp and one that looks rough.',
    'Wheels are the detail people notice first. Cut them last, when the body already holds its shape.',
    'Keep the body flat while the glue dries. A warp of a millimetre shows up badly on a vehicle.',
    'Panel gaps are free detail. Leave a hair of space between the body and the wheels and it reads as a real vehicle.',
  ],
  building: [
    'Towers and castles read better with sharp creases at every corner. Fold toward yourself and run a bone folder along each edge.',
    'Roofs and spires set the scale. Measure those first and work downwards toward the base.',
    'Architecture is where paper behaves best. Straight folds, square corners, almost no shaping required.',
    'Cut the windows before you fold the walls. Doing it afterwards risks crushing the corner you just creased.',
  ],
  character: [
    'Characters carry a lot of small parts. Assemble the torso first, then attach limbs and head so the proportions stay balanced as you build.',
    'Give a character one clear prop or colour accent. Without it the figure tends to read as generic.',
    'Build the head first and match everything else to it. Proportion problems always show up there.',
    'Keep the pose slightly off-centre. A perfectly symmetrical character looks like a paper doll rather than a character.',
  ],
  plant: [
    'Petals and leaves curve nicely if you curl them gently around a pencil after cutting.',
    'Stems need wire or a rolled paper core, otherwise they bend as soon as the flower head goes on.',
    'Keep the vein side of the card facing up on leaves. The texture catches light and stops them looking like flat shapes.',
    'Build flowers in threes or fives. Odd numbers sit together more naturally than pairs do.',
  ],
  food: [
    'Layered treats like cakes look best built bottom-up. Let each tier dry before adding the next so the stack stays straight.',
    'Food reads through texture more than shape. A light emboss on the surface sells the idea faster than extra detail.',
    'Small props help a lot when the main subject is simple. A paper plate or a folded napkin does half the work.',
    'Keep the palette warm and limited. Paper food goes wrong when the colours get too saturated.',
  ],
  object: [
    'Simple geometric objects are a good first project. Precise cutting and a dab of glue at each tab is all it takes.',
    'Symmetry matters with objects. Cut one face, then use it as the template for the rest.',
    'Objects photograph well in sets, so a matching trio is often a stronger result than one perfect piece.',
    'Hollow shapes need a hidden support. A folded card rib inside keeps a box from denting when you pick it up.',
  ],
  abstract: [
    'Start with the largest pieces to set the silhouette, then fill in the smaller details last.',
    'When the idea is abstract, contrast does the work. One bold colour against a quiet background.',
    'Abstract shapes benefit from hard light. The shadow becomes part of the composition.',
    'Let the edges stay visible. On abstract work, the cut line is often the most interesting part.',
  ],
  watercraft: [
    'Boats need a flat keel or they will not stand up. Cut the hull as one piece and double the base strip so it holds.',
    'Sails are the fragile part. Fold them around a thin wire so they keep their shape instead of drooping after a day on the shelf.',
    'Build the hull first and check it sits level before adding masts. A leaning mast is very hard to correct later.',
    'Water is easier to fake than to build. A strip of torn tissue under the hull reads as a wake without any cutting.',
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
  watercraft: [
    { label: 'on waves', suffix: 'sitting on layered paper waves with a torn tissue wake' },
    { label: 'at a pier', suffix: 'docked at a small paper pier with folded bollards' },
    { label: 'tissue sails', suffix: 'with sails made from folded tissue paper catching low light' },
    { label: 'deck cutaway', suffix: 'cut open along the hull so the deck and cabin show' },
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

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const wordCount = prompt.split(/\s+/).filter(Boolean).length;

  // Opening lines. Short, plain, and never two sentences of scene-setting in a row.
  const leadShapes = [
    `The prompt was "${prompt}". This is what came back.`,
    `"${prompt}" is about as short as a brief gets. The result is ${article} ${np}.`,
    `Short version: ${article} ${np} of "${prompt}".`,
    `Put "${prompt}" in the box, pick a style, and this is the kind of thing that comes out.`,
    `${cap(article)} ${np} of "${prompt}", from one line of text.`,
    `One prompt, "${prompt}", a few seconds of waiting. That gets you here.`,
    `This started as "${prompt}". It ended up as ${article} ${np}.`,
    `Nothing was cut or glued to make the picture below. It came from the prompt "${prompt}".`,
    `Here is what "${prompt}" looks like once it is described in paper terms.`,
    `A ${wordCount}-word prompt, "${prompt}", and ${article} ${np} at the other end.`,
    `The brief behind this one was "${prompt}", typed straight into the generator.`,
    `Type "${prompt}" and the generator reads it as ${article} ${np}. That is the whole setup.`,
  ];
  const lead = leadShapes[h % leadShapes.length];

  const styleNotes = STYLE_NOTES[style] || STYLE_NOTES.cute;
  const look = styleNotes[Math.floor(h / 3) % styleNotes.length];
  const tips = SUBJECT_TIPS[subject.category] || SUBJECT_TIPS.abstract;
  const tip = tips[Math.floor(h / 11) % tips.length];
  // Body varies in shape too: some pages carry only the style note, some only the
  // build advice, some both in either order. Uniform "style then tip, always" was
  // half of what made these pages read as one template.
  const bodyShapes = [look, tip, `${look}\n\n${tip}`, `${tip}\n\n${look}`];
  const extraNotes = [
    'The background stays plain, which is what keeps the silhouette readable.',
    'The palette is narrow on purpose. Three or four tones, no more.',
    'Look at the shadow under the base. That is what makes it sit on a table rather than float.',
    'Flat lighting, soft falloff, no reflections. Paper is easier to read that way.',
    'Nothing in the frame competes with the subject, which is most of the reason it works.',
  ];
  const useExtra = h % 5 === 0;
  const extraNote = extraNotes[Math.floor(h / 17) % extraNotes.length];

  const scenes = ARTICLE_SCENES[subject.category] || ARTICLE_SCENES.abstract;
  const materials = STYLE_MATERIALS[style] || STYLE_MATERIALS.cute;
  const material = materials[Math.floor(h / 19) % materials.length];
  const honestNote = HONEST_NOTES[Math.floor(h / 29) % HONEST_NOTES.length];

  // Outline variant. A fixed two-heading structure repeated on 117 pages was the
  // loudest template signal on the site, so heading count, heading wording,
  // direction count and link count all shift per page.
  type Shape = { heads: 0 | 1 | 2; dirs: number; build: boolean; links: 1 | 2 | 3; note: boolean };
  const shapes: Shape[] = [
    { heads: 0, dirs: 3, build: true, links: 2, note: false },
    { heads: 0, dirs: 4, build: true, links: 1, note: true },
    { heads: 1, dirs: 3, build: false, links: 2, note: true },
    { heads: 1, dirs: 4, build: true, links: 1, note: false },
    { heads: 1, dirs: 3, build: false, links: 2, note: false },
    { heads: 2, dirs: 3, build: true, links: 3, note: true },
    { heads: 2, dirs: 4, build: true, links: 2, note: false },
    { heads: 2, dirs: 2, build: true, links: 3, note: false },
  ];
  const shape = shapes[h % shapes.length];

  // Pages without headings need a little more body to keep the section from
  // reading as a stub, so they always carry the extra observation.
  let body = bodyShapes[Math.floor(h / 7) % bodyShapes.length];
  if (useExtra || shape.heads === 0) body += (h % 3 === 0 ? '\n\n' : ' ') + extraNote;

  const headPrompts = [
    'Other directions', 'Taking it further', 'Variations worth trying',
    'Follow-up prompts', 'If you want a different mood', 'Where to go next',
    'Prompts to try after this one', 'Changing the staging',
  ];
  const headBuild = [
    'Making it in paper', 'If you build it', 'Paper and tools',
    'Notes for the build', 'Building it for real', 'Before you cut anything',
    'The paper part', 'Practical notes',
  ];

  // Direction formats rotate inside the paragraph. Fifteen shapes, stride coprime
  // with 15 so a page never repeats one. Every lead-in stays neutral on purpose:
  // lines like "swap the background" read as nonsense next to a "caught mid-leap"
  // suffix, and "pushes it somewhere else entirely" was pure filler.
  const dirFormats: ((s: { label: string; suffix: string }) => string)[] = [
    (s) => `"${prompt}, ${s.suffix}".`,
    (s) => `Try "${prompt}, ${s.suffix}".`,
    (s) => `Or "${prompt}, ${s.suffix}".`,
    (s) => `Then there is "${prompt}, ${s.suffix}".`,
    (s) => `One worth a go: "${prompt}, ${s.suffix}".`,
    (s) => `Another angle: "${prompt}, ${s.suffix}".`,
    (s) => `Also worth generating: "${prompt}, ${s.suffix}".`,
    (s) => `Or this: "${prompt}, ${s.suffix}".`,
    (s) => `Another variation: "${prompt}, ${s.suffix}".`,
    (s) => `Worth an attempt: "${prompt}, ${s.suffix}".`,
    (s) => `Same subject: "${prompt}, ${s.suffix}".`,
    (s) => `A different direction: "${prompt}, ${s.suffix}".`,
    (s) => `If the first one felt off, "${prompt}, ${s.suffix}".`,
    (s) => `One more: "${prompt}, ${s.suffix}".`,
    (s) => `Last one: "${prompt}, ${s.suffix}".`,
  ];
  // Lead-ins must not imply a plural that may not follow (two directions are
  // common), and must not promise a change the suffix does not make.
  const dirLeads = [
    'One generation is rarely the end of it.',
    'The first result is usually the safe one.',
    'If you want a different mood, the prompt is the only dial worth turning.',
    'Another attempt is usually worth the extra minute.',
    'The subject can stay put while everything around it changes.',
    'Two or three variations usually beat one perfect prompt.',
    'Small prompt edits move the result further than you would expect.',
    'Nothing is fixed until you stop generating.',
    'The obvious version is not always the best one.',
    'Same prompt, different staging, is usually enough.',
    'It is worth seeing the idea in more than one setting.',
    'The subject does not have to change for the picture to.',
  ];
  const dirLines = scenes.slice(0, shape.dirs).map((s, i) => dirFormats[(h + i * 7) % dirFormats.length](s));
  const dirBlock = `${dirLeads[Math.floor(h / 23) % dirLeads.length]} ${dirLines.join(' ')}`;

  // Outgoing links: 1 to 3, worded differently each time. The old fixed
  // "Browse X, grab Y, or fold Z" tail ran on every single page.
  const catName = subject.label === 'papercraft' ? 'paper' : subject.label;
  const hasCatPage = ['animal', 'dragon', 'vehicle', 'building'].includes(subject.category);
  const catLinks = hasCatPage
    ? [
        `There are more ${catName} designs in [the ${catName} gallery](/gallery/${subject.category}/).`,
        `For more ${catName} designs, browse [the ${catName} gallery](/gallery/${subject.category}/).`,
        `[The ${catName} gallery](/gallery/${subject.category}/) has the rest of the set.`,
      ]
    : [
        `[The full gallery](/gallery/) has plenty more like this.`,
        `More in [the gallery](/gallery/).`,
        `Browse [everything else](/gallery/) if this is the look you are after.`,
      ];
  const printLinks = [
    'If you would rather have the fold lines drawn for you, start from a [printable template](/printables/).',
    '[Printable templates](/printables/) are the shortcut if you want to build today.',
    'Prefer a ready-made net? Try [printable templates](/printables/).',
    'There are [printable templates](/printables/) if you want the cutting already worked out.',
    'Ready to build rather than browse? [Printable templates](/printables/) skip the guesswork.',
    'The [printable templates](/printables/) are worth a look if you would rather fold than design.',
  ];
  const origamiLinks = [
    'And if folding by hand appeals more, the [origami tutorials](/origami/) go step by step.',
    'For plain folding practice, work through the [origami tutorials](/origami/).',
    'There are also [origami tutorials](/origami/) if you would rather fold than cut.',
    'If you prefer creases to cuts, the [origami tutorials](/origami/) are the place to start.',
    'The [origami tutorials](/origami/) cover the traditional side of paper, one fold at a time.',
    'Hand folding instead? The [origami tutorials](/origami/) walk through it slowly.',
  ];
  const linkPool = [
    catLinks[Math.floor(h / 31) % catLinks.length],
    printLinks[Math.floor(h / 37) % printLinks.length],
    origamiLinks[Math.floor(h / 41) % origamiLinks.length],
  ];
  const closeText = linkPool.slice(0, shape.links).join(' ');

  const dirSection = shape.heads >= 1 && !(shape.heads === 1 && shape.build)
    ? ['## ' + headPrompts[Math.floor(h / 11) % headPrompts.length], '', dirBlock]
    : [dirBlock];
  const buildSection = shape.build
    ? shape.heads === 0
      ? [material]
      : ['## ' + headBuild[Math.floor(h / 13) % headBuild.length], '', material]
    : [];

  const parts: string[] = [lead, '', body, '', ...dirSection];
  if (buildSection.length) parts.push('', ...buildSection);
  if (shape.note) parts.push('', honestNote);
  parts.push('', closeText);
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const STYLE_LABEL: Record<string, string> = {
  cute: 'Cute', lowpoly: 'Low Poly', pixel: 'Pixel', fantasy: 'Fantasy', minecraft: 'Blocky',
};

export function buildMeta(promptRaw: string, styleRaw: string): Generated {
  const style = (styleRaw || 'cute').toString().toLowerCase();
  // Collapse runs of whitespace: raw prompts sometimes arrive with double spaces,
  // which then show up inside every quoted prompt on the page.
  const prompt = stripArticle(promptRaw.trim()).replace(/\s+/g, ' ');
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
  // Descriptions rotate between skeletons (picked by a stable hash of the prompt)
  // so neighbouring pages do not share one sentence pattern. They also do not just
  // restate the title: they say what the visitor can actually do next.
  const hash = [...prompt].reduce((a, c) => a + c.charCodeAt(0), 0);
  const subj = subject.label === 'papercraft' ? '' : subject.label + ' ';
  const sw = styleWord ? styleWord.trim() : '';
  const descSkeletons = [
    sw
      ? `A ${sw} take on "${prompt}", generated with the free AI papercraft generator. Save it or reuse the prompt for your own version.`
      : `"${prompt}" as a papercraft design, generated with the free AI papercraft generator. Save it or reuse the prompt.`,
    `Papercraft design of "${prompt}"${sw ? ' in ' + sw + ' style' : ''}. Free AI artwork, no account needed, and follow-up prompts to try next.`,
    `See how "${prompt}" reads as paper. Free ${sw ? sw + ' ' : ''}${subj}papercraft artwork from koPaper, with the exact prompt included.`,
    `Made from one line: "${prompt}". A free ${sw ? sw + ' ' : ''}papercraft design you can download, plus variations worth generating.`,
    `"${prompt}" turned into ${sw ? 'a ' + sw + ' ' : 'a '}papercraft design. Free AI generator, instant results, no sign-up.`,
  ];
  const rotated = descSkeletons.map((_, i) => descSkeletons[(hash + i) % descSkeletons.length]);
  let description = rotated.find(d => d.length <= 160) || descSkeletons[0];
  if (description.length > 160) description = description.slice(0, 157).replace(/[,;\s]+\S*$/, '') + '.';

  // Alt text: describe the image, do not stuff the raw prompt in. Raw prompts are
  // often conversational or misspelled, which used to leak straight into alt text.
  const conversational = /\bi want\b|\bmake me\b|\bplease\b|\bcreat\b/i.test(prompt);
  const capUsable = !conversational && prompt.split(/\s+/).length <= 12 && promptQuality(prompt).ok;
  const promptHasStyle = styleLabel
    ? new RegExp(`\\b${styleLabel.toLowerCase().replace(/\s+/g, '\\s+')}\\b`).test(prompt.toLowerCase())
    : false;
  const caption = !capUsable
    ? `${styleLabel || 'Papercraft'} papercraft design`
    : promptHasStyle
      ? `${prompt.charAt(0).toUpperCase() + prompt.slice(1)} papercraft design`
      : `${styleLabel} papercraft design of ${prompt}`;
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
