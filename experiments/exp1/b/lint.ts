import { readFileSync } from "node:fs";

// Статическая проверка HTML подхода B по дизайн-брифу.
// Поведение в браузере (переполнение на телефоне, сетки карточек)
// проверяет measure/page-probe.ts, а здесь только то, что видно из текста.

export type LintResult = { errors: string[]; warnings: string[] };

export function lintHtml(html: string): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lower = html.toLowerCase();

  if (!lower.trimStart().startsWith("<!doctype html")) errors.push("Документ должен начинаться с <!doctype html>");
  if (!/<html[^>]*lang="en-gb"/i.test(html)) errors.push('Нужен <html lang="en-GB">');
  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push("Нет <title>");
  if (!/<meta[^>]+name="description"/i.test(html)) errors.push('Нет <meta name="description">');
  if ((lower.match(/<h1[\s>]/g) ?? []).length !== 1) errors.push("Нужен ровно один <h1>");
  if (!/<main[\s>]/i.test(html)) errors.push("Нет <main>");

  // Шрифты: Inter и подобные как основной запрещены.
  const families = [...html.matchAll(/family=([^&"':]+)/g)].map((m) => decodeURIComponent(m[1]).replace(/\+/g, " "));
  for (const f of families) if (/^(inter|roboto|open sans)$/i.test(f.trim())) errors.push(`Запрещённый шрифт: ${f}`);
  if (/font-family:\s*['"]?inter['"]?[,;]/i.test(html)) errors.push("Inter в font-family");

  // Внешние ресурсы: только Google Fonts.
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)/gi)) errors.push(`Внешний скрипт: ${m[1]}`);
  for (const m of html.matchAll(/<link[^>]+href=["'](https?:[^"']+)/gi)) {
    if (!/fonts\.(googleapis|gstatic)\.com/.test(m[1])) errors.push(`Внешний ресурс: ${m[1]}`);
  }
  for (const m of html.matchAll(/<img[^>]+src=["'](https?:[^"']+)/gi)) errors.push(`Внешняя картинка: ${m[1]}`);

  if (/backdrop-filter/i.test(html)) errors.push("backdrop-filter (glassmorphism) запрещён");
  for (const m of html.matchAll(/linear-gradient\(([^)]*)\)/gi)) {
    if (/(#[5-9a][0-9a-f]{1}[0-9a-f]{2}f[0-9a-f]|purple|violet|indigo)/i.test(m[1])) warnings.push(`Подозрение на фиолетово-синий градиент: ${m[0].slice(0, 60)}`);
  }
  if (/IntersectionObserver/.test(html)) errors.push("Анимации появления при прокрутке запрещены");
  if (/@keyframes/i.test(html) && !/prefers-reduced-motion/i.test(html)) errors.push("Есть анимация, но нет учёта prefers-reduced-motion");

  // Длинное тире в видимом тексте (без CSS и скриптов).
  const visible = html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "");
  if (visible.includes("—") || /&mdash;/.test(visible)) errors.push("Длинное тире в тексте сайта");

  if (/(build the future|elevate your|unlock your|your journey starts)/i.test(visible)) errors.push("Шаблонный AI-заголовок");
  if (/(made with|built with|powered by)/i.test(visible)) warnings.push("Похоже на подпись конструктора");

  if (!/data-photo=/.test(html)) warnings.push("Нет ни одного места под фото");
  const facts = html.match(/<script type="application\/json" id="facts-to-confirm">([\s\S]*?)<\/script>/);
  if (!facts) errors.push("Нет списка facts-to-confirm");
  else {
    try {
      const list = JSON.parse(facts[1]);
      if (!Array.isArray(list)) errors.push("facts-to-confirm должен быть массивом");
    } catch {
      errors.push("facts-to-confirm: невалидный JSON");
    }
  }

  const scripts = [...html.matchAll(/<script(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/gi)];
  const jsLines = scripts.reduce((n, m) => n + m[1].split("\n").filter((l) => l.trim()).length, 0);
  if (jsLines > 20) errors.push(`Слишком много JavaScript: ${jsLines} строк`);

  return { errors, warnings };
}

// Запуск из командной строки: npx tsx experiments/exp1/b/lint.ts file.html
if (process.argv[1]?.endsWith("lint.ts") && process.argv[2]) {
  const r = lintHtml(readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.errors.length ? 1 : 0);
}
