// Проверка свободного SVG-рисунка от модели (фирменный элемент).
// Пропускаем только простые фигуры и разрешённые атрибуты. Никаких скриптов,
// внешних ссылок, обработчиков событий и встроенного HTML.

const TAGS = new Set(["g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "text", "tspan"]);
const ATTRS = new Set([
  "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "points",
  "transform", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray",
  "opacity", "fill-opacity", "stroke-opacity", "class", "font-size", "text-anchor", "font-weight", "letter-spacing",
]);
// Цвета только через наши токены: currentColor плюс классы ink, accent, muted, bg.
const PAINT = /^(none|currentColor)$/;
const CLASSES = /^(ink|accent|muted|bg)( (ink|accent|muted|bg))*$/;

export function checkSvg(markup: string): string[] {
  const errors: string[] = [];
  if (markup.length > 8000) errors.push(`svg: too long (${markup.length} chars, max 8000)`);
  // Убираем текст между тегами, остаются только теги.
  for (const m of markup.matchAll(/<\/?\s*([a-zA-Z][\w:-]*)([^>]*)>/g)) {
    const tag = m[1].toLowerCase();
    if (!TAGS.has(tag)) {
      errors.push(`svg: tag <${tag}> not allowed`);
      continue;
    }
    for (const a of m[2].matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
      const name = a[1].toLowerCase();
      const value = a[3] ?? a[4] ?? "";
      if (!ATTRS.has(name)) errors.push(`svg: attribute ${name} not allowed on <${tag}>`);
      else if ((name === "fill" || name === "stroke") && !PAINT.test(value)) errors.push(`svg: ${name}="${value}" not allowed, use currentColor or none and a class (ink, accent, muted, bg)`);
      else if (name === "class" && !CLASSES.test(value)) errors.push(`svg: class="${value}" not allowed`);
    }
  }
  if (/<!|<\?|&#|javascript:|url\(/i.test(markup)) errors.push("svg: comments, entities, url() and javascript: are not allowed");
  return [...new Set(errors)].slice(0, 10);
}
