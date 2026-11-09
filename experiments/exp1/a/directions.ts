import type { FontKey } from "./fonts";
import type { Tokens } from "./tokens";

// Визуальные направления (эксперимент 1b). Разнообразие задаём мы:
// модель получает направление как обязательное условие и не может
// незаметно вернуться к «бежевому журнальному» виду по умолчанию.
// Рамки проверяются кодом (checkDirection), описание идёт в промпт.

export type Family = "light" | "dark" | "colour";
export type Suit = "trade" | "professional" | "wellness" | "food" | "creative";

type Range = [number, number];

export type Direction = {
  id: string;
  name: string;
  family: Family;
  suits: Suit[];
  brief: string; // описание для модели, по-английски
  bg: { lightness: Range; saturation: Range; hue?: Range }; // HSL фона: L и S в процентах
  displayFonts: FontKey[];
  bodyFonts: FontKey[];
  radius: Range;
  displayCase?: Tokens["displayCase"];
  inkSameHue?: boolean; // текст того же оттенка, что фон (монохром)
  favour: string[]; // композиции, которые раскрывают направление
};

export const DIRECTIONS: Direction[] = [
  {
    id: "clear-product", name: "Clear product", family: "light", suits: ["professional", "trade", "creative"],
    brief: "A contemporary product or service interface. A cool near-white ground, blue or teal signal, clear medium-weight sans type and rounded controls. Lead with a concise explanation beside a useful diagram, as in the public example. If no diagram would clarify the supplied material, use a short left-aligned hero.statement instead; do not fabricate a dashboard, statistics or a process just to fill that side. Put service selection in the offering section below rather than repeating the studio direction's right-hand action desk. Follow with a featured service or a clear service explanation and a practical sequence. Avoid newspaper rules, oversized poster slogans and an icon-card grid. Specific owner layout instructions and an explicitly selected template take priority.",
    bg: {lightness:[94,100],saturation:[0,80]}, displayFonts:["space-grotesk","public-sans","work-sans","libre-franklin"], bodyFonts:["ibm-plex-sans","public-sans","work-sans","karla"],radius:[12,28],favour:["hero.split-graphic","hero.statement","services.feature-plus-list","process.steps-row"],
  },
  {
    id: "studio-grid", name: "Independent studio", family: "light", suits: ["creative", "professional"],
    brief: "An independent contemporary design studio. Neutral white, nearly black ink, disciplined asymmetry and distinctive sans letterforms. Let the visitor choose a project or service through an action desk, with staggered detailed sections below. Keep the work as the subject. No newspaper serif, compulsory doodles, badges, giant shop-sign type or icon-card grid. Do not invent project images or client work.",
    bg:{lightness:[94,100],saturation:[0,8]},displayFonts:["syne","space-grotesk","archivo","libre-franklin"],bodyFonts:["libre-franklin","public-sans","work-sans"],radius:[0,4],favour:["hero.action-desk","services.staggered","story.principles"],
  },
  {
    id: "newsprint", name: "Newsprint", family: "light", suits: ["professional", "trade", "food"],
    brief: "A local newspaper or printed bulletin. Pure white or barely grey paper (not cream), black ink, one restrained spot colour. Serif headlines, ruled lines between items, numbered labels, columns of text, square corners. Information-dense and trustworthy.",
    bg: { lightness: [95, 100], saturation: [0, 8] },
    displayFonts: ["newsreader", "source-serif", "dm-serif", "instrument-serif"], bodyFonts: ["source-serif", "newsreader", "public-sans", "libre-franklin", "ibm-plex-sans"],
    radius: [0, 2], favour: ["hero.editorial", "services.ledger", "services.table", "story.longform", "proof.quote-columns"],
  },
  {
    id: "swiss", name: "Swiss poster", family: "light", suits: ["trade", "professional", "creative"],
    brief: "International typographic style. White background, one strong signal colour (red, orange, cobalt or green), big grotesque type, strict grid, generous white space, uppercase small labels, no decoration except rules and numbers.",
    bg: { lightness: [96, 100], saturation: [0, 6] },
    displayFonts: ["archivo", "space-grotesk", "libre-franklin", "public-sans", "bricolage"], bodyFonts: ["public-sans", "libre-franklin", "ibm-plex-sans", "work-sans", "karla"],
    radius: [0, 4], favour: ["hero.type-poster", "services.index", "process.steps-row", "story.numbers"],
  },
  {
    id: "warm-editorial", name: "Warm editorial", family: "light", suits: ["wellness", "professional", "food"],
    brief: "A thoughtful magazine. Warm cream or sand paper, dark brown or green ink, one earthy accent, elegant serif headlines, long readable text, pull quotes, lots of air.",
    bg: { lightness: [86, 96], saturation: [15, 55], hue: [25, 55] },
    displayFonts: ["fraunces", "newsreader", "instrument-serif", "cormorant", "young-serif"], bodyFonts: ["karla", "work-sans", "public-sans", "source-serif", "newsreader"],
    radius: [0, 8], favour: ["hero.statement", "story.longform", "services.prose-columns", "proof.single-quote"],
  },
  {
    id: "soft-clay", name: "Soft clay", family: "light", suits: ["wellness", "food", "creative"],
    brief: "Soft, tactile and friendly. A pastel tinted background (sage, blush, pale clay, mint, butter; not beige and not lilac-blue), rounded shapes, friendly rounded or soft serif type. Use a centre-led introduction, as in the public example, rather than the conventional copy-left / illustration-right split. A short centred hero.statement is enough when an illustration would add no useful meaning. Use hero.center-stage when a central illustration earns its place; do not add art, notes or stamps just to fill space. Keep the main offer and its related alternatives grouped below the introduction. Specific owner layout instructions take priority.",
    bg: { lightness: [80, 93], saturation: [20, 70] },
    displayFonts: ["bricolage", "young-serif", "fraunces", "syne"], bodyFonts: ["karla", "work-sans", "bricolage", "public-sans"],
    radius: [14, 32], favour: ["hero.center-stage", "hero.statement", "services.feature-plus-list", "services.disclosure"],
  },
  {
    id: "night-shift", name: "Night shift", family: "dark", suits: ["trade", "creative", "food"],
    brief: "After hours. Near-black background, off-white text, one vivid accent (acid lime, safety orange, hot red or electric cyan). Condensed or wide grotesque headlines, hard edges, a workshop or club energy.",
    bg: { lightness: [3, 13], saturation: [0, 30] },
    displayFonts: ["big-shoulders", "archivo", "space-grotesk", "syne", "unbounded"], bodyFonts: ["ibm-plex-sans", "work-sans", "space-grotesk", "public-sans", "ibm-plex-mono"],
    radius: [0, 6], favour: ["hero.type-poster", "signature.marquee", "services.ledger", "contact.big-type"],
  },
  {
    id: "deep-ink", name: "Deep ink", family: "dark", suits: ["professional", "wellness", "food"],
    brief: "Quiet confidence. A deep saturated background (forest green, navy, oxblood or aubergine), light warm text, a light or italic serif, wide spacing, very little decoration. Calm and premium, never flashy.",
    bg: { lightness: [8, 26], saturation: [22, 80] },
    displayFonts: ["cormorant", "instrument-serif", "fraunces", "newsreader", "dm-serif"], bodyFonts: ["karla", "public-sans", "work-sans", "source-serif", "ibm-plex-sans"],
    radius: [0, 6], favour: ["hero.statement", "story.principles", "services.prose-columns", "process.conversation"],
  },
  {
    id: "signal", name: "Signal colour", family: "colour", suits: ["trade", "food", "creative"],
    brief: "Loud and direct. The whole page sits on one saturated colour (tomato red, cobalt, signal yellow, grass green or tangerine), with black or white type, heavy uppercase display, big numbers and blunt copy. Feels like a shop sign.",
    bg: { lightness: [38, 68], saturation: [55, 100] },
    displayFonts: ["unbounded", "big-shoulders", "archivo", "syne", "bricolage"], bodyFonts: ["work-sans", "public-sans", "space-grotesk", "ibm-plex-sans", "karla"],
    radius: [0, 10], displayCase: "uppercase", favour: ["hero.type-poster", "hero.band", "services.index", "signature.big-word"],
  },
  {
    id: "monotone", name: "One colour", family: "colour", suits: ["wellness", "professional", "creative"],
    brief: "Everything in one hue: a light-to-mid tint of a single colour as background (terracotta, sage, ochre, slate teal, rose) and a deep shade of the same hue for text. Calm, designed, unmistakable.",
    bg: { lightness: [62, 86], saturation: [20, 65] },
    displayFonts: ["fraunces", "instrument-serif", "bricolage", "young-serif", "space-grotesk", "dm-serif"], bodyFonts: ["karla", "work-sans", "public-sans", "source-serif"],
    radius: [0, 20], inkSameHue: true, favour: ["hero.statement", "hero.offset-photo", "story.letter", "services.feature-plus-list"],
  },
  {
    id: "poster-duo", name: "Two-colour poster", family: "colour", suits: ["creative", "food", "wellness"],
    brief: "A screen-printed poster in two strong colours: a bold coloured background and a contrasting second colour for headlines and accents. Playful type, stickers, marquee or stamp, a hand-made illustration. Joyful but still organised.",
    bg: { lightness: [45, 80], saturation: [45, 100] },
    displayFonts: ["bricolage", "syne", "unbounded", "young-serif", "dm-serif"], bodyFonts: ["karla", "work-sans", "bricolage", "public-sans"],
    radius: [0, 28], favour: ["hero.band", "signature.custom-svg", "signature.stamp", "signature.marquee"],
  },
];

export function getDirection(id: string): Direction | undefined {
  return DIRECTIONS.find((d) => d.id === id);
}

// Блок для промпта: что обязательно соблюсти.
export function directionPrompt(d: Direction): string {
  return `## Art direction (mandatory): ${d.name}

${d.brief}

Hard limits checked by the system:
- Page background (tokens.colors.bg): HSL lightness ${d.bg.lightness[0]}-${d.bg.lightness[1]}%, saturation ${d.bg.saturation[0]}-${d.bg.saturation[1]}%${d.bg.hue ? `, hue ${d.bg.hue[0]}-${d.bg.hue[1]}` : ""}.
- displayFont one of: ${d.displayFonts.join(", ")}. bodyFont one of: ${d.bodyFonts.join(", ")}.
- radius ${d.radius[0]}-${d.radius[1]}px.${d.displayCase ? `\n- displayCase: ${d.displayCase}.` : ""}${d.inkSameHue ? "\n- tokens.colors.ink must be a deep shade of the background hue (within 25 degrees)." : ""}
- Compositions that express this direction well: ${d.favour.join(", ")}. Use them where they fit the content.

Make this direction serve the business. Do not water it down toward a neutral beige page.`;
}

// HSL из #RRGGBB: h 0-360, s и l в процентах.
export function hsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

const inRange = (x: number, [a, b]: Range) => x >= a - 0.5 && x <= b + 0.5;
const hueGap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

export function checkDirection(t: Tokens, d: Direction): string[] {
  const errors: string[] = [];
  const bg = hsl(t.colors.bg);
  const f = (x: number) => x.toFixed(0);
  if (!inRange(bg.l, d.bg.lightness)) errors.push(`direction ${d.id}: bg lightness ${f(bg.l)}%, allowed ${d.bg.lightness.join("-")}%`);
  if (!inRange(bg.s, d.bg.saturation)) errors.push(`direction ${d.id}: bg saturation ${f(bg.s)}%, allowed ${d.bg.saturation.join("-")}%`);
  if (d.bg.hue && !inRange(bg.h, d.bg.hue)) errors.push(`direction ${d.id}: bg hue ${f(bg.h)}, allowed ${d.bg.hue.join("-")}`);
  if (!d.displayFonts.includes(t.displayFont)) errors.push(`direction ${d.id}: displayFont ${t.displayFont} not allowed (${d.displayFonts.join(", ")})`);
  if (!d.bodyFonts.includes(t.bodyFont)) errors.push(`direction ${d.id}: bodyFont ${t.bodyFont} not allowed (${d.bodyFonts.join(", ")})`);
  if (!inRange(t.radius, d.radius)) errors.push(`direction ${d.id}: radius ${t.radius}, allowed ${d.radius.join("-")}`);
  if (d.displayCase && t.displayCase !== d.displayCase) errors.push(`direction ${d.id}: displayCase must be ${d.displayCase}`);
  if (d.inkSameHue && hueGap(hsl(t.colors.ink).h, bg.h) > 25) errors.push(`direction ${d.id}: ink hue must be within 25 degrees of bg hue`);
  return errors;
}
