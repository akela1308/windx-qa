import { cookies } from "next/headers";
import { en, type Dict } from "./en";
import { ru } from "./ru";
import { es } from "./es";

// Язык кабинета хранится в cookie. По умолчанию английский.

export const LOCALES = { en, ru, es } as const;
export type Locale = keyof typeof LOCALES;
export const LOCALE_COOKIE = "windx_lang";
export type { Dict };

export function isLocale(x: unknown): x is Locale {
  return typeof x === "string" && x in LOCALES;
}

// Вызывать только внутри <Suspense>: cookies() это данные запроса.
export async function getDict(): Promise<{ locale: Locale; t: Dict }> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(value) ? value : "en";
  return { locale, t: LOCALES[locale] };
}

export { fmt } from "./format";
