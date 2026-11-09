import type { CanvasDoc } from "./model";
import { freeCopy, freeText } from "./copy";
// Обзор для владельца: без внутреннего формата, ID и путей хранилища.
export function canvasSummary(
  canvas: CanvasDoc | undefined,
  previous: CanvasDoc | undefined,
  locale: string,
): string {
  if (!canvas) return "";
  const c = freeCopy(locale),
    t = (text: string) => freeText(locale, text);
  const imageLabel =
    locale === "ru"
      ? "Загруженное изображение, см. предпросмотр"
      : locale === "es"
        ? "Imagen subida, ver vista previa"
        : "Uploaded image, see preview";
  const changedLabel =
    locale === "ru"
      ? "Новое или заменённое изображение, см. предлагаемый сайт"
      : locale === "es"
        ? "Imagen nueva o sustituida, ver página propuesta"
        : "New or replaced image, see proposed page";
  const lines = [
    `${c.name}: ${canvas.title}`,
    `${c.background}: ${canvas.background}`,
    `${c.desktop}: ${c.height} ${canvas.height.desktop}px; ${c.phone}: ${canvas.height.phone}px`,
  ];
  canvas.elements.forEach((e, index) => {
    lines.push(
      "",
      `${index + 1}. ${e.name} (${t(e.type === "text" ? "Text" : e.type === "image" ? "Image" : "Shape")})`,
      `${c.layers}: ${e.layer + 1}`,
    );
    for (const device of ["desktop", "phone"] as const) {
      const b = e[device];
      lines.push(
        `${c[device]}: X ${b.x}, Y ${b.y}; ${t("Width")} ${b.width}px, ${t("Height")} ${b.height}px`,
      );
    }
    if (e.type === "text") {
      lines.push(
        `${t("Text")}: ${e.text}`,
        `${t("Text role")}: ${t(e.tag === "h1" ? "Main heading" : e.tag === "h2" ? "Section heading" : "Paragraph")}`,
        `${t("Typeface")}: ${t(e.style.font === "sans" ? "Sans serif" : e.style.font === "serif" ? "Serif" : "Monospace")}, ${e.style.weight}`,
        `${t("Font size")}: ${c.desktop} ${e.style.size}px; ${c.phone} ${e.phoneSize}px`,
        `${t("Line height")}: ${e.style.lineHeight}; ${t("Text colour")}: ${e.style.colour}`,
        `${t("Alignment")}: ${t(e.style.align === "left" ? "Left" : e.style.align === "center" ? "Centre" : "Right")}; ${t("Inner spacing")}: ${e.style.padding}px`,
      );
    } else if (e.type === "image") {
      const old = previous?.elements.find((old) => old.id === e.id);
      lines.push(
        old?.type === "image" && old.src === e.src ? imageLabel : changedLabel,
        `${t("Image description")}: ${e.alt}`,
        `${t("Fit")}: ${t(e.fit === "cover" ? "Fill frame" : "Show whole image")}`,
      );
    } else lines.push(`${t("Fill")}: ${e.fill}`);
    if (e.type !== "text") lines.push(`${t("Corner radius")}: ${e.radius}px`);
    if (e.type !== "shape" && e.href)
      lines.push(`${t("Link (optional)")}: ${e.href}`);
  });
  return lines.join("\n");
}
