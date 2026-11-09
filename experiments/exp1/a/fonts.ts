// Курируемый список шрифтов Google Fonts для подхода A.
// Inter намеренно отсутствует (правило анти-слопа).
// css: значение для font-family, google: параметр family= в ссылке Google Fonts.

export const FONTS = {
  fraunces: { css: "'Fraunces', Georgia, serif", google: "Fraunces:opsz,wght@9..144,300..900" },
  "instrument-serif": { css: "'Instrument Serif', Georgia, serif", google: "Instrument+Serif:ital@0;1" },
  "dm-serif": { css: "'DM Serif Display', Georgia, serif", google: "DM+Serif+Display:ital@0;1" },
  "young-serif": { css: "'Young Serif', Georgia, serif", google: "Young+Serif" },
  cormorant: { css: "'Cormorant Garamond', Georgia, serif", google: "Cormorant+Garamond:ital,wght@0,300..700;1,300..700" },
  newsreader: { css: "'Newsreader', Georgia, serif", google: "Newsreader:ital,opsz,wght@0,6..72,300..800;1,6..72,300..800" },
  "source-serif": { css: "'Source Serif 4', Georgia, serif", google: "Source+Serif+4:ital,opsz,wght@0,8..60,300..800;1,8..60,300..800" },
  "space-grotesk": { css: "'Space Grotesk', system-ui, sans-serif", google: "Space+Grotesk:wght@300..700" },
  archivo: { css: "'Archivo', system-ui, sans-serif", google: "Archivo:wdth,wght@62..125,300..900" },
  bricolage: { css: "'Bricolage Grotesque', system-ui, sans-serif", google: "Bricolage+Grotesque:opsz,wght@12..96,300..800" },
  syne: { css: "'Syne', system-ui, sans-serif", google: "Syne:wght@400..800" },
  "big-shoulders": { css: "'Big Shoulders Display', system-ui, sans-serif", google: "Big+Shoulders+Display:wght@300..900" },
  unbounded: { css: "'Unbounded', system-ui, sans-serif", google: "Unbounded:wght@300..800" },
  "work-sans": { css: "'Work Sans', system-ui, sans-serif", google: "Work+Sans:wght@300..700" },
  "libre-franklin": { css: "'Libre Franklin', system-ui, sans-serif", google: "Libre+Franklin:wght@300..800" },
  karla: { css: "'Karla', system-ui, sans-serif", google: "Karla:wght@300..800" },
  "ibm-plex-sans": { css: "'IBM Plex Sans', system-ui, sans-serif", google: "IBM+Plex+Sans:wght@300..700" },
  "public-sans": { css: "'Public Sans', system-ui, sans-serif", google: "Public+Sans:wght@300..800" },
  "ibm-plex-mono": { css: "'IBM Plex Mono', ui-monospace, monospace", google: "IBM+Plex+Mono:wght@400;500;600" },
  "dm-mono": { css: "'DM Mono', ui-monospace, monospace", google: "DM+Mono:wght@400;500" },
  caveat: { css: "'Caveat', cursive", google: "Caveat:wght@400..700" },
} as const;

export type FontKey = keyof typeof FONTS;
export const FONT_KEYS = Object.keys(FONTS) as [FontKey, ...FontKey[]];

export function googleFontsHref(keys: FontKey[]): string {
  const families = [...new Set(keys)].map((k) => `family=${FONTS[k].google}`).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
