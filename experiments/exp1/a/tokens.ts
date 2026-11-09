import { z } from "zod";
import { FONT_KEYS, FONTS } from "./fonts";

// Визуальный характер сайта как набор токенов. AI задаёт их сам
// в пределах ограничений; секции берут оформление только отсюда.

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Цвет в формате #RRGGBB");

export const TokensSchema = z.object({
  displayFont: z.enum(FONT_KEYS).describe("Шрифт заголовков"),
  bodyFont: z.enum(FONT_KEYS).describe("Шрифт основного текста"),
  displayWeight: z.number().int().min(200).max(900),
  displayCase: z.enum(["none", "uppercase"]),
  displayTracking: z.number().min(-0.06).max(0.2).describe("letter-spacing заголовков в em"),
  displayItalic: z.boolean().describe("Курсив в заголовках, если шрифт его поддерживает"),
  scale: z.enum(["modest", "large", "huge"]).describe("Размер главных заголовков"),
  colors: z.object({
    bg: hex,
    surface: hex.describe("Второй фон для чередования секций"),
    ink: hex.describe("Основной текст"),
    muted: hex.describe("Второстепенный текст"),
    accent: hex,
    accentInk: hex.describe("Текст поверх accent"),
    line: hex.describe("Линии и разделители"),
  }),
  radius: z.number().int().min(0).max(32).describe("Скругление кнопок и фото в px"),
  density: z.enum(["airy", "regular", "compact"]).describe("Вертикальный ритм секций"),
  width: z.enum(["narrow", "regular", "wide"]).describe("Ширина колонки контента"),
});

export type Tokens = z.infer<typeof TokensSchema>;

const SCALE = {
  modest: ["clamp(2.2rem, 4vw, 3.4rem)", "clamp(1.6rem, 2.6vw, 2.2rem)"],
  large: ["clamp(2.8rem, 6.5vw, 5.6rem)", "clamp(1.9rem, 3.4vw, 3rem)"],
  huge: ["clamp(3.4rem, 10vw, 9.5rem)", "clamp(2.2rem, 4.6vw, 4.2rem)"],
} as const;
const DENSITY = { airy: "clamp(5rem, 11vw, 10rem)", regular: "clamp(4rem, 8vw, 7rem)", compact: "clamp(2.8rem, 5vw, 4.5rem)" };
const WIDTH = { narrow: "64rem", regular: "76rem", wide: "90rem" };

export function tokensToCss(t: Tokens): string {
  const c = t.colors;
  return `:root{
--bg:${c.bg};--surface:${c.surface};--ink:${c.ink};--muted:${c.muted};
--accent:${c.accent};--accent-ink:${c.accentInk};--line:${c.line};
--f-display:${FONTS[t.displayFont].css};--f-body:${FONTS[t.bodyFont].css};
--d-weight:${t.displayWeight};--d-case:${t.displayCase};--d-track:${t.displayTracking}em;
--d-style:${t.displayItalic ? "italic" : "normal"};
--h1:${SCALE[t.scale][0]};--h2:${SCALE[t.scale][1]};
--radius:${t.radius}px;--section:${DENSITY[t.density]};--max:${WIDTH[t.width]};
}`;
}

// Контраст по WCAG: нужен валидатору, чтобы AI не выдал нечитаемую палитру.
function luminance(hexColor: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hexColor.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
