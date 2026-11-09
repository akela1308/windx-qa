import { readFile } from "node:fs/promises";
import path from "node:path";
export async function responseLanguagePrompt(locale: string) {
  const language = locale === "ru" ? "Russian" : locale === "es" ? "Spanish" : "English";
  return (await readFile(path.join(process.cwd(), "src/lib/prompts/response-language.md"), "utf8")).replaceAll("{{LANGUAGE}}", language);
}
export function demoCreationReply(locale: string, matched: boolean) {
  if (locale === "ru") return "Демо-версия создана по готовому примеру для этого типа бизнеса." + (matched ? "" : " Для выбранного стиля пока нет готового примера, поэтому показан ближайший вариант.");
  if (locale === "es") return "Versión de demostración creada a partir de un ejemplo de este tipo de negocio." + (matched ? "" : " No hay un ejemplo del estilo elegido; se muestra el más cercano.");
  return "Demo site created from a prepared example for this type of business." + (matched ? "" : " There is no prepared example for the chosen style, so this is the closest one.");
}
