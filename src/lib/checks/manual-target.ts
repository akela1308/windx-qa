import type { ContentSection } from "@/lib/content/fields";

// Ручное исправление должно вести к существующему подходящему полю.
// Отсутствие цели означает подготовку просьбы в чате, а не открытие шапки.
export function manualFindingSection(content: ContentSection[], code: string, section?: number): number | undefined {
  if (code === "title" || code === "description") return content.find(s => s.index === -1 && s.fields.some(f => f.path === code))?.index;
  const kind = code === "missingPhone" || code === "phone" || code === "phoneFormat" ? "phone"
    : code === "missingEmail" ? "email"
    : code === "invalidContact" ? "contact"
    : code === "photo" || code === "alt" ? "photo"
    : code === "address" ? "address" : null;
  if (!kind) return undefined;
  const matches = (candidate: ContentSection) => candidate.fields.some(field => {
    const key = field.path.split(".").at(-1);
    const phone = key === "phone" || field.kind === "link" && /^tel:/i.test(field.value);
    const email = key === "email" || field.kind === "link" && /^mailto:/i.test(field.value);
    return kind === "phone" ? phone : kind === "email" ? email : kind === "contact" ? phone || email : kind === "photo" ? field.kind === "photo" : key === "address";
  });
  // Для замечания к конкретному блоку не предлагаем менять другой блок.
  return content.find(candidate => (section === undefined || candidate.index === section) && matches(candidate))?.index;
}
