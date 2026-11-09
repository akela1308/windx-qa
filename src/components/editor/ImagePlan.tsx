import type { ImageGuidance } from "@/lib/design/visual-plan";

const copy = (locale: string) =>
  locale === "ru"
    ? {
        title: "План изображений",
        included: "Уже используется",
        optional: "Можно добавить позже",
        section: "Раздел",
        purpose: "Зачем",
        crop: "Кадр",
        focus: "Сохранить в кадре",
        placement: "Расположение",
        open: "Открыть раздел",
        role: {
          person: "Человек",
          place: "Место",
          product: "Предмет",
          work: "Пример работы",
          explanation: "Объяснение",
          atmosphere: "Атмосфера",
        },
        framing: {
          portrait: "вертикальный",
          landscape: "горизонтальный",
          square: "квадратный",
          wide: "панорамный",
        },
      }
    : locale === "es"
      ? {
          title: "Plan de imágenes",
          included: "Ya incluida",
          optional: "Posible incorporación",
          section: "Sección",
          purpose: "Propósito",
          crop: "Encuadre",
          focus: "Conservar en el encuadre",
          placement: "Posición",
          open: "Abrir sección",
          role: {
            person: "Persona",
            place: "Lugar",
            product: "Objeto",
            work: "Trabajo",
            explanation: "Explicación",
            atmosphere: "Ambiente",
          },
          framing: {
            portrait: "vertical",
            landscape: "horizontal",
            square: "cuadrado",
            wide: "panorámico",
          },
        }
      : {
          title: "Image plan",
          included: "Already used",
          optional: "Optional later addition",
          section: "Section",
          purpose: "Purpose",
          crop: "Framing",
          focus: "Keep in the frame",
          placement: "Placement",
          open: "Open section",
          role: {
            person: "Person",
            place: "Place",
            product: "Object",
            work: "Work sample",
            explanation: "Explanation",
            atmosphere: "Atmosphere",
          },
          framing: {
            portrait: "portrait",
            landscape: "landscape",
            square: "square",
            wide: "wide",
          },
        };

export function ImagePlan({
  images,
  locale,
  onSection,
  onAdd,
}: {
  images: ImageGuidance[];
  locale: string;
  onSection?: (index: number) => void;
  onAdd?: (index: number) => void;
}) {
  if (!images.length) return null;
  const c = copy(locale);
  return (
    <details className="mt-4 rounded-lg border border-line p-3">
      <summary className="cursor-pointer font-medium">
        {c.title} · {images.length}
      </summary>
      <ol className="mt-3 space-y-4">
        {images.map((image, i) => (
          <li
            key={`${image.sectionId}-${i}`}
            className="border-t border-line pt-3 first:border-0 first:pt-0"
          >
            <p className="text-xs text-muted">
              {c.section} {image.sectionIndex + 1} · {c.role[image.role]} ·{" "}
              {image.state === "included" ? c.included : c.optional}
            </p>
            <p className="mt-1 font-medium">{image.subject}</p>
            <dl className="mt-2 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted">{c.purpose}</dt>
                <dd>{image.purpose}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{c.placement}</dt>
                <dd>{image.placement}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">
                  {c.crop}: {c.framing[image.framing]}
                </dt>
                <dd>
                  {c.focus}: {image.focalPoint}
                </dd>
              </div>
            </dl>
            {onSection && (
              <button
                type="button"
                onClick={() => onSection(image.sectionIndex)}
                className="mt-2 min-h-11 underline underline-offset-4"
              >
                {c.open}
              </button>
            )}
            {image.state === "optional" && onAdd && (
              <button
                type="button"
                onClick={() => onAdd(image.sectionIndex)}
                className="mt-2 min-h-11 underline underline-offset-4"
              >
                {locale === "ru"
                  ? "Добавить изображение в этом месте"
                  : locale === "es"
                    ? "Añadir imagen aquí"
                    : "Add an image here"}
              </button>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}
