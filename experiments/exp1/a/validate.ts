import { SiteDocSchema, type SiteDoc } from "./schema";
import { contrast } from "./tokens";
import { checkDirection, type Direction } from "./directions";
import { checkSlop } from "./slop";

export type DocCheck = { ok: true; doc: SiteDoc; warnings: string[] } | { ok: false; errors: string[] };

// Проверка ответа AI: схема, читаемость цветов, правила продукта.
// Тексты ошибок такие, чтобы их можно было отдать AI для повтора.
// direction: если задано визуальное направление, токены проверяются по его рамкам.
// antiSlop: включить проверку на AI-приёмы (эксперимент 1c и дальше).
export function validateDoc(raw: unknown, direction?: Direction, opts: { antiSlop?: boolean } = {}): DocCheck {
  const parsed = SiteDocSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.slice(0, 20).map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  const doc = parsed.data;
  const errors: string[] = [];
  const warnings: string[] = [];
  const c = doc.tokens.colors;

  const pairs: [string, string, string, number][] = [
    ["ink/bg", c.ink, c.bg, 4.5],
    ["ink/surface", c.ink, c.surface, 4.5],
    ["accentInk/accent", c.accentInk, c.accent, 4.5],
    ["muted/bg", c.muted, c.bg, 3],
  ];
  for (const [name, a, b, min] of pairs) {
    const r = contrast(a, b);
    if (r < min) errors.push(`tokens.colors ${name}: контраст ${r.toFixed(2)}, нужно не меньше ${min}`);
  }

  if (doc.tokens.bodyFont === "caveat") errors.push("tokens.bodyFont: рукописный шрифт нельзя для основного текста");

  const text = JSON.stringify(doc.sections.filter((s) => !["embed.code","free.canvas"].includes(s.composition)));
  if (text.includes("—")) errors.push("Длинное тире в текстах сайта запрещено, замени запятой, точкой или двоеточием");

  if (!doc.sections[0].composition.startsWith("header.")) warnings.push("Первая секция не шапка");
  if (doc.sections.filter((s) => s.composition.startsWith("hero.")).length !== 1) errors.push("Нужен ровно один hero");
  if (doc.sections.some((s) => s.composition === "services.cards")) warnings.push("Использована сетка карточек services.cards");

  if (direction) errors.push(...checkDirection(doc.tokens, direction));
  if (opts.antiSlop) errors.push(...checkSlop(doc));

  return errors.length ? { ok: false, errors } : { ok: true, doc, warnings };
}
