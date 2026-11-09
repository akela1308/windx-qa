import { z } from "zod";

// Визуальный характер = набор токенов. Секции не знают конкретных цветов
// и шрифтов, они берут их из CSS-переменных, которые строятся из этих токенов.

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Цвет в формате #RRGGBB");

export const CharacterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  // Описание для AI: когда этот характер подходит бизнесу.
  description: z.string().min(1),
  fonts: z.object({
    display: z.string(), // ключ шрифта из src/render/fonts.ts
    body: z.string(),
    mono: z.string(),
  }),
  type: z.object({
    displayWeight: z.number(),
    displayTracking: z.string(), // letter-spacing, например "-0.02em"
    displayStretch: z.string(), // font-stretch, например "100%" или "125%"
    displayCase: z.enum(["none", "uppercase"]),
    h1: z.string(), // CSS-размер, можно clamp()
    h2: z.string(),
    h3: z.string(),
    body: z.string(),
    lineHeight: z.number(),
  }),
  colors: z.object({
    bg: color,
    surface: color,
    ink: color,
    muted: color,
    accent: color,
    accentInk: color, // цвет текста поверх accent
    line: color,
  }),
  radius: z.object({ card: z.string(), button: z.string() }),
  grid: z.object({
    maxWidth: z.string(),
    gutter: z.string(),
    // Заголовок секции слева от содержимого (true) или над ним (false).
    headingAside: z.boolean(),
  }),
  rhythm: z.object({ section: z.string(), block: z.string() }),
  rule: z.object({ width: z.string() }), // толщина разделителей
  labels: z.enum(["numbered", "plain"]), // «01 / Services» или просто «Services»
});

export type Character = z.infer<typeof CharacterSchema>;
