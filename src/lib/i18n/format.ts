// Подстановка значений в строку: fmt("Version {n}", { n: 3 }).
// Отдельный файл, чтобы его могли импортировать и браузерные компоненты.
export function fmt(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
