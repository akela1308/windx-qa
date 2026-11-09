import type { RequirementsInputs } from "./types";
export type LocationHint = { country: string; evidence: string };
// Только явные названия стран. Город, язык сайта и номер телефона не доказывают юрисдикцию.
export function suggestCountry(text: string): LocationHint | null {
  const countries: [RegExp, string][] = [
    [/\bNigeria\b|Нигери[яию]|\bnigerian\b/iu,"Nigeria"],
    [/\bPortugal\b|Португали[яию]/iu,"Portugal"],
    [/\bUnited Kingdom\b|\bUK\b|\bBritain\b|Великобритани[яию]/iu,"United Kingdom"],
    [/\bUnited States\b|\bUSA\b|\bСША\b/iu,"United States"],
    [/\bCanada\b|Канад[аыу]/iu,"Canada"],
    [/\bGermany\b|Германи[яию]/iu,"Germany"],
    [/\bFrance\b|Франци[яию]/iu,"France"],
    [/\bSpain\b|\bEspaña\b|Испани[яию]/iu,"Spain"],
  ];
  const found = countries.flatMap(([pattern,country]) => { const match = text.match(pattern); return match ? [{ country, evidence: match[0] }] : []; });
  return found.length === 1 ? found[0] : null;
}
export function geographyCopy(locale: string) {
  return locale === "ru" ? {
    country: "В какой стране работает бизнес?", countryWhy: "Подтвердите страну бизнеса. Название города не определяет страну регистрации и применимое право.",
    customers: "В каких странах находятся ваши клиенты?", customersWhy: "Укажите страны, на которые рассчитан сайт, если это важно для бизнеса. Можно оставить неизвестным.",
    suggestion: "Предположение из описания, подтвердите или исправьте:", confirmed: "Страна бизнеса", unknown: "Сначала подтвердите страну бизнеса и рынки клиентов. По языку или городу страну не определяем.",
    unsupported: "Местная правовая проверка для этой страны не реализована. Общая карта функций и данных не является проверкой местного законодательства.",
    uk: "Подготовка по британским источникам: владелец подтвердил работу с рынком UK. Это не проверка законодательства других стран.",
  } : locale === "es" ? {
    country: "¿En qué país opera el negocio?", countryWhy: "Confirma el país del negocio. Una ciudad no demuestra el país de registro ni la ley aplicable.",
    customers: "¿En qué países están tus clientes?", customersWhy: "Indica los mercados del sitio si son relevantes. Puedes dejarlo sin confirmar.",
    suggestion: "Sugerencia de la descripción, confirma o corrige:", confirmed: "País del negocio", unknown: "Confirma el país y los mercados. No deducimos el país por el idioma o la ciudad.",
    unsupported: "La revisión legal local para este país no está disponible. El mapa general de funciones y datos no revisa las leyes locales.",
    uk: "Preparación con fuentes británicas: el propietario confirmó el mercado UK. No revisa las leyes de otros países.",
  } : {
    country: "In which country does the business operate?", countryWhy: "Confirm the business country. A city does not prove its registration country or applicable law.",
    customers: "In which countries are your customers?", customersWhy: "List the markets this site targets, if relevant. You may leave this unknown.",
    suggestion: "Suggestion from the description, confirm or correct:", confirmed: "Business country", unknown: "First confirm the business country and customer markets. We do not infer a country from language or a city.",
    unsupported: "A local legal review for this country is not implemented. The general feature and data map is not a review of local law.",
    uk: "Preparation using UK sources: the owner confirmed the UK market. This does not review other countries' laws.",
  };
}
export function geographyStatus(inputs: RequirementsInputs | undefined, locale: string) {
  const c = geographyCopy(locale);
  if (!inputs?.country?.trim() || inputs.market === "unknown") return c.unknown;
  return `${c.confirmed}: ${inputs.country}. ${inputs.market === "uk" ? c.uk : c.unsupported}`;
}
