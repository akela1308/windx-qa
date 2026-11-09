import type { SiteDoc } from "@/lib/design";
import type { DemoEdit } from "@/lib/ai/stub-fixtures";

// Правки, которые в демо-режиме делает код, а не модель.
// Это не заглушка «для вида»: «показать раздел иначе» для совместимых
// композиций и дальше можно делать без вызова AI, это бесплатно и мгновенно.

type Section = SiteDoc["sections"][number] & { props: Record<string, unknown> };

const SERVICE_CYCLE = ["services.ledger", "services.index", "services.prose-columns"];

export function applyDemoEdit(doc: SiteDoc, edit: DemoEdit, russian = false): { doc: SiteDoc; reply: string } {
  const sections = structuredClone(doc.sections) as Section[];

  if (edit === "calm-hero") {
    const i = sections.findIndex((s) => s.composition.startsWith("hero."));
    const p = sections[i].props;
    const statement = String(p.headline ?? p.statement ?? doc.meta.businessName);
    sections[i] = {
      composition: "hero.statement",
      tone: "default",
      props: { statement, detail: typeof p.sub === "string" ? p.sub : undefined, cta: p.cta, align: "left" },
    } as Section;
    return { doc: { ...doc, sections } as SiteDoc, reply: russian ? "Главный экран стал спокойнее: одна фраза на простом фоне и одна кнопка." : "The hero is now a single quiet statement on a plain background, with one button." };
  }

  if (edit === "services") {
    const i = sections.findIndex((s) => s.composition.startsWith("services.") && s.composition !== "services.cta-band");
    if (i < 0) return { doc, reply: russian ? "На этом сайте нет раздела услуг, который можно перестроить." : "This site has no services section to rearrange." };
    const s = sections[i];
    const p = s.props;
    // Все услуги одним списком, откуда бы они ни пришли.
    const items = (p.items as unknown[]) ?? [p.featured, ...((p.others as unknown[]) ?? [])].filter(Boolean);
    const next = SERVICE_CYCLE[(SERVICE_CYCLE.indexOf(s.composition) + 1) % SERVICE_CYCLE.length];
    const list = next === "services.index" ? items.slice(0, 6) : items;
    sections[i] = { composition: next, tone: s.tone, id: s.id, props: { title: p.title, intro: p.intro, items: list } } as Section;
    const names: Record<string, string> = { "services.ledger": "a price list", "services.index": "a large numbered index", "services.prose-columns": "short paragraphs beside the heading" };
    const ruNames: Record<string, string> = { "services.ledger": "прайс-лист", "services.index": "крупный нумерованный список", "services.prose-columns": "абзацы рядом с заголовком" };
    return { doc: { ...doc, sections } as SiteDoc, reply: russian ? `Теперь услуги представлены как ${ruNames[next]}.` : `Services are now shown as ${names[next]}.` };
  }

  // memorable: круглая печать с названием, если её ещё нет.
  if (sections.some((s) => s.composition === "signature.stamp")) return { doc, reply: russian ? "На сайте уже есть печать. Другой элемент можно будет запросить после подключения AI." : "The site already has a stamp. Ask for a different element once the AI is connected." };
  const name = doc.meta.businessName;
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  const hero = sections.findIndex((s) => s.composition.startsWith("hero."));
  sections.splice(hero + 1, 0, { composition: "signature.stamp", tone: "default", props: { ringText: name.slice(0, 40), center: initials, align: "right" } } as Section);
  return { doc: { ...doc, sections } as SiteDoc, reply: russian ? "Под главным экраном добавлена медленно вращающаяся круглая печать с названием." : "Added a slowly turning round stamp with your name under the hero." };
}
