import type { ProbeResult } from "./page-probe";

// Насколько различаются композиции двух страниц.
// 0 = одинаковый скелет, 1 = ничего общего.

function blockToken(b: ProbeResult["blocks"][number]): string {
  return b.kind;
}

function levenshtein(a: string[], b: string[]): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

export function skeleton(p: ProbeResult): string[] {
  return p.blocks.map(blockToken);
}

// Порядок блоков и их форма (редакционное расстояние по последовательности).
export function sequenceDistance(a: ProbeResult, b: ProbeResult): number {
  const sa = skeleton(a);
  const sb = skeleton(b);
  return levenshtein(sa, sb) / Math.max(sa.length, sb.length, 1);
}

// Набор форм без учёта порядка: насколько разный «словарь» приёмов.
export function vocabularyDistance(a: ProbeResult, b: ProbeResult): number {
  const A = new Set(skeleton(a));
  const B = new Set(skeleton(b));
  const inter = [...A].filter((x) => B.has(x)).length;
  return 1 - inter / new Set([...A, ...B]).size;
}

// Совпадение визуального характера: тот же набор шрифтов и близкий цвет фона.
export function sameCharacter(a: ProbeResult, b: ProbeResult): { font: boolean; bg: boolean } {
  const fa = [...new Set(a.fonts)].sort().join("|");
  const fb = [...new Set(b.fonts)].sort().join("|");
  return { font: fa === fb, bg: colorDistance(a.bodyBg, b.bodyBg) < 20 };
}

// Расстояние между цветами rgb(...) в простых единицах RGB; меньше 20 глазом почти не различить.
function colorDistance(x: string, y: string): number {
  const p = (c: string) => (c.match(/\d+/g) ?? []).slice(0, 3).map(Number);
  const [a, b] = [p(x), p(y)];
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
