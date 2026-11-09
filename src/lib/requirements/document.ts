import type { SiteDoc } from "@/lib/design";
import { isEnquiryForm } from "@/lib/enquiries/forms";
const privacy =
  /\bprivacy\b|конфиденциальност|персональн.{0,10}данн|privacidad|protecci[oó]n de datos/iu;
// Анализируем только структурированный документ, не исполняем HTML/JS. Наличие
// фразы в документе не доказывает, что уведомление видно или достаточно по закону.
export function requirementsDocument(doc: SiteDoc) {
  const privacySections: number[] = [],
    privacyLinks: { section: number; href: string }[] = [],
    forms: number[] = [],
    codes: number[] = [];
  const texts: string[] = [];
  let limited = false,
    contact = false;
  function walk(value: unknown, section: number, depth = 0) {
    if (depth > 12) {
      limited = true;
      return;
    }
    if (typeof value === "string") {
      if (value.length > 8000) limited = true;
      texts.push(value.slice(0, 8000));
      return;
    }
    if (Array.isArray(value)) {
      if (value.length > 150) limited = true;
      value.slice(0, 150).forEach((v) => walk(v, section, depth + 1));
      return;
    }
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      const href = typeof record.href === "string" ? record.href : "";
      if (/^mailto:|^tel:/i.test(href)) contact = true;
      const label = [record.label, record.text, record.title]
        .filter((v) => typeof v === "string")
        .join(" ");
      if (
        href &&
        privacy.test(`${label} ${href}`) &&
        (/^https?:\/\//i.test(href) || /^#[a-z0-9-]+$/i.test(href))
      )
        privacyLinks.push({ section, href: href.slice(0, 400) });
      for (const [key, child] of Object.entries(record)) {
        if (
          /^(email|phone)$/i.test(key) &&
          typeof child === "string" &&
          child.trim()
        )
          contact = true;
        if (!/^(href|url|src|id|code|html|css|js|alt)$/i.test(key))
          walk(child, section, depth + 1);
      }
    }
  }
  for (const [i, s] of doc.sections.entries()) {
    if (isEnquiryForm(s.composition)) forms.push(i);
    if (s.composition === "embed.code") {
      codes.push(i);
      continue;
    }
    const before = texts.length;
    walk(s.props, i);
    // Только заголовок и явно названный якорь, не любое упоминание privacy.
    const heading = Object.entries(s.props as Record<string, unknown>)
      .filter(
        ([k, v]) =>
          /^(heading|title|eyebrow)$/i.test(k) && typeof v === "string",
      )
      .map(([, v]) => v)
      .join(" ");
    if (
      privacy.test(`${heading} ${s.id ?? ""}`) &&
      texts.slice(before).join(" ").trim().length > 40
    )
      privacySections.push(i);
  }
  const text = texts.join(" ").slice(0, 120_000);
  return {
    text,
    privacySections,
    privacyLinks: privacyLinks.slice(0, 30),
    forms,
    codes,
    contact,
    limited:
      limited || texts.join(" ").length > 120_000 || privacyLinks.length > 30,
  };
}
