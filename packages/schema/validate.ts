import type { NichePack } from "./pack";
import { SiteSchema, type Site } from "./site";

export type ValidationResult = { ok: true; site: Site } | { ok: false; errors: string[] };

// Полная проверка сайта: сначала общая схема ядра, потом секции и характер
// по правилам пакета ниши. Текст ошибок пригоден, чтобы отдать его AI на повтор.
export function validateSite(raw: unknown, pack: NichePack): ValidationResult {
  const base = SiteSchema.safeParse(raw);
  if (!base.success) {
    return {
      ok: false,
      errors: base.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }

  const site = base.data;
  const errors: string[] = [];

  if (site.pack !== pack.id) {
    errors.push(`pack: ожидался "${pack.id}", получен "${site.pack}"`);
  }
  if (!pack.characters.some((c) => c.id === site.character)) {
    const ids = pack.characters.map((c) => c.id).join(", ");
    errors.push(`character: "${site.character}" нет в пакете (есть: ${ids})`);
  }

  site.pages.forEach((page, pi) => {
    page.sections.forEach((section, si) => {
      const where = `pages.${pi}.sections.${si}`;
      const spec = pack.sections[section.type];
      if (!spec) {
        errors.push(`${where}.type: секции "${section.type}" нет в пакете`);
        return;
      }
      const props = spec.schema.safeParse(section.props);
      if (!props.success) {
        for (const i of props.error.issues) {
          errors.push(`${where}.props.${i.path.join(".")}: ${i.message}`);
        }
      }
    });
  });

  return errors.length ? { ok: false, errors } : { ok: true, site };
}
