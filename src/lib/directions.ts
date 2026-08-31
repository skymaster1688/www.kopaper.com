// Shared "directions to take it further" rules, used by BOTH the client generator
// (Generator.astro) and the server-side gallery article generator (gallery.ts) so
// the on-page suggestions and the published article stay consistent.
// Pure functions only — safe to run in the browser and in the Cloudflare Worker.

export interface Direction {
  id: string;
  title: string;
  hint: string;
  test: RegExp;
  build: (q: string) => string;
}

export const DIRECTION_RULES: Direction[] = [
  { id: 'scene',  title: 'Cozy scene',     hint: 'Warm lamp light, plants and a cozy corner that tells a story.', test: /(room|desk|home|kitchen|garden|forest|table|window|coffee)/, build: (q) => q + ', placed in a cozy warm scene with soft lamp light and a few plants' },
  { id: 'detail', title: 'Extra detail',   hint: 'Intricate folds, visible paper texture and delicate cut lines.', test: /(detail|intricate|complex|ornate|texture)/, build: (q) => q + ', with intricate paper folds, visible paper texture and delicate cut details' },
  { id: 'cute',   title: 'Cuter look',     hint: 'Big sparkling eyes and chubby, rounded proportions.', test: /(cute|kawaii|adorable|chubby|baby|tiny)/, build: (q) => q + ', with big sparkling eyes, chubby rounded proportions and kawaii charm' },
  { id: 'glow',   title: 'Fantasy glow',   hint: 'Soft sparkles and gentle light rays for a magical feel.', test: /(magic|fantasy|dream|glow|sparkl|fairy|dragon|wizard)/, build: (q) => q + ', glowing softly in a magical scene with sparkles and gentle light rays' },
  { id: 'studio', title: 'Minimal studio', hint: 'Clean studio product shot on a soft cream background.', test: /(minimal|clean|modern|simple|elegant)/, build: (q) => q + ', minimalist clean studio product shot on a soft cream background' },
  { id: 'vivid',  title: 'Vivid colors',   hint: 'A vivid, saturated palette with playful composition.', test: /(color|colour|vivid|bright|vibrant|rainbow|bold)/, build: (q) => q + ', with a vivid saturated color palette and playful composition' },
];

// Pick `count` (default 4) directions: keyword matches first, then fill by default order.
export function pickDirections(q: string, count = 4): Direction[] {
  const text = ' ' + (q || '').toLowerCase() + ' ';
  const matched = DIRECTION_RULES.filter((d) => d.test.test(text));
  const rest = DIRECTION_RULES.filter((d) => !matched.includes(d));
  return matched.concat(rest).slice(0, count);
}
