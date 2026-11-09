import type { SiteDoc } from "./schema";

// Проверка на узнаваемые AI-приёмы (docs/anti-slop.md).
// Тексты ошибок адресованы модели: она получит их и переделает ответ.

// Обороты, которые выдают AI в любом тексте сайта.
const BANNED_ANYWHERE: [RegExp, string][] = [
  [/\b(done|made|handled|fixed) (properly|carefully|right)\b/i, '"X, done properly" style phrasing'],
  [/\bon purpose\b/i, '"... on purpose" slogan'],
  [/\b(no fuss|fuss-free|hassle[- ]free)\b/i, '"no fuss" / "hassle-free"'],
  [/\b(seamless|tailored|elevate|unlock|peace of mind|look no further|whether you'?re|we believe|your journey|one-stop|cutting-edge|state-of-the-art|world-class|passionate about|second to none)\b/i, "empty marketing words"],
  [/\bnot (just|only|simply) (a|an|another)\b/i, '"not just a ..." construction'],
  [/[✦✧★☆✨❖]/, "sparkle or star symbols"],
];

// Шаблонные формы заголовков: девизы, «не X, а Y», тройки слов.
const BANNED_HEADING: [RegExp, string][] = [
  [/\bplain english\b/i, '"Plain English" slogan'],
  [/^[^.,]{1,30}, not [^.]{1,30}\.?$/i, '"X, not Y" slogan'],
  [/^\s*\w+\s+over\s+\w+\.?\s*$/i, '"X over Y" slogan'],
  [/^\s*\w+[.,]\s+\w+[.,]\s+(and\s+)?\w+\.?\s*$/i, "three-word triplet"],
  [/^(small|big|honest|simple|local|quiet)\b[^.]{0,20}\.$/i, "short adjective slogan ending with a full stop"],
];

const HEADING_KEYS = new Set(["title", "headline", "statement", "line", "claim", "marked", "word"]);

function walk(value: unknown, key: string, visit: (key: string, text: string) => void) {
  if (typeof value === "string") visit(key, value);
  else if (Array.isArray(value)) value.forEach((v) => walk(v, key, visit));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k, visit);
}

export function checkSlop(doc: SiteDoc): string[] {
  const errors: string[] = [];
  doc.sections.forEach((s, i) => {
    if (["embed.code", "free.canvas"].includes(s.composition)) return; // Исходники владельца не переписываем как маркетинговый текст.
    walk(s.props, "", (key, text) => {
      for (const [re, what] of BANNED_ANYWHERE) if (re.test(text)) errors.push(`sections.${i} (${s.composition}): ${what} in "${text.slice(0, 60)}". Rewrite it with a concrete detail from the brief.`);
      if (HEADING_KEYS.has(key))
        for (const [re, what] of BANNED_HEADING) if (re.test(text)) errors.push(`sections.${i} (${s.composition}): heading "${text}" is a ${what}, which reads as AI-written. Say something specific instead.`);
    });
  });

  // Композиционные предпочтения оцениваем визуально: квота рисунков и перестановка FAQ
  // не доказывают качество и не должны запускать переделку страницы при повторе AI.
  return [...new Set(errors)].slice(0, 12);
}
