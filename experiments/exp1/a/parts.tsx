import type { CSSProperties } from "react";
import { z } from "zod";

// Общие кирпичики секций и их схемы.

export const text = z.string().min(1);
export const PhotoSchema = z.object({
  subject: text.max(500).describe("Описание изображения для посетителя, альтернативный текст"),
  src: z.string().regex(/^\/media\/[a-z0-9-]{1,80}\/[a-f0-9-]{36}\.webp$/).optional(),
  fit: z.enum(["cover", "contain"]).optional(),
  positionX: z.number().min(0).max(100).optional(),
  positionY: z.number().min(0).max(100).optional(),
});
export const CtaSchema = z.object({ label: text, href: text });
export type Photo = z.infer<typeof PhotoSchema>;
export type Cta = z.infer<typeof CtaSchema>;

// Фото клиента пока нет, поэтому рисуем честный плейсхолдер с подписью,
// что именно нужно снять. Стоковые фото не используем.
export function PhotoSlot({ photo, ratio = "4 / 3", className = "" }: { photo: Photo; ratio?: string; className?: string }) {
  if (photo.src) return <div className={`ph ph-image ${className}`} style={{ aspectRatio: ratio }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={photo.src} alt={photo.subject} style={{ width: "100%", height: "100%", objectFit: photo.fit ?? "cover", objectPosition: `${photo.positionX ?? 50}% ${photo.positionY ?? 50}%`, position: "absolute", inset: 0 }} />
  </div>;
  return (
    <div className={`ph ${className}`} style={{ aspectRatio: ratio }} role="img" aria-label={photo.subject}>
      <span>Photo: {photo.subject}</span>
    </div>
  );
}

export function BrandLogo({ photo }: { photo: Photo }) {
  if (!photo.src) return null;
  // Логотип не обрезается, имя бизнеса остаётся доступным текстом.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="brand-logo" src={photo.src} alt={photo.subject} />;
}

export function Button({ cta, ghost = false }: { cta?: Cta; ghost?: boolean }) {
  if (!cta) return null;
  return (
    <a className={ghost ? "btn btn-ghost" : "btn"} href={cta.href}>
      {cta.label}
    </a>
  );
}

// Размер главного заголовка по длине фразы: заголовок первого экрана не должен занимать
// больше ~3 строк, иначе кнопка уходит за экран (длинная фраза в «афише» на 13vw не помещалась).
// share: какую долю ширины занимает колонка заголовка. Результат: CSS-переменная --fit в vw,
// и --fit-h в vh (потолок по высоте окна); их берут стили заголовков первого экрана.
export function fitHeadline(headline: string, share = 1, lines = 3): CSSProperties {
  const n = Math.max(headline.length, 8);
  const vw = Math.min(14, Math.max(3, (85 * share * lines) / (0.56 * n)));
  // Потолок по высоте окна: короткой фразе (1-2 строки) можно быть крупнее.
  const vh = n <= 20 ? 22 : n <= 32 ? 17 : n <= 48 ? 13 : 11;
  return { ["--fit" as string]: `${vw.toFixed(2)}vw`, ["--fit-h" as string]: `${vh}vh` } as CSSProperties;
}

export const baseCss = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--f-body);font-size:1.0625rem;line-height:1.6}
img{max-width:100%;display:block}
.brand-logo{display:inline-block;width:auto;max-width:9rem;height:2.5rem;object-fit:contain;vertical-align:middle;margin-right:.65rem}
.ph.ph-image{background:transparent}
a{color:inherit}
.wrap{max-width:var(--max);margin:0 auto;padding:0 clamp(1.25rem,4vw,3rem)}
.sec{padding:var(--section) 0}
.tone-surface{background:var(--surface)}
.tone-accent{background:var(--accent);color:var(--accent-ink)}
.tone-accent .muted{color:inherit;opacity:.8}
.tone-ink{background:var(--ink);color:var(--bg)}
.tone-ink .muted{color:inherit;opacity:.7}
/* На тёмном фоне акцент может совпасть с фоном (accent = ink). Акцентные детали фирменных блоков берут цвет страницы. */
.tone-ink .mq .sp,.tone-ink .gf .v,.tone-ink .stp svg,.tone-ink .dr svg,.tone-ink .cs2 .accent,.tone-ink .ml .mk svg{color:var(--bg)}
.tone-ink .ml .marker .mk{background:linear-gradient(transparent 55%,color-mix(in srgb,var(--bg) 30%,transparent) 55%,color-mix(in srgb,var(--bg) 30%,transparent) 92%,transparent 92%)}
.disp,h1,h2,h3{font-family:var(--f-display);font-weight:var(--d-weight);text-transform:var(--d-case);letter-spacing:var(--d-track);font-style:var(--d-style);line-height:1.04;margin:0}
h1{font-size:min(var(--h1),var(--fit,100vw),calc(var(--fit-h,14vh) * .86))}
/* Первый экран: меньше воздуха сверху, чтобы заголовок и кнопка были видны без прокрутки. */
[data-section^="hero."]>.sec{padding-top:clamp(2rem,6vh,4.5rem)}
h2{font-size:var(--h2)}
h3{font-size:clamp(1.25rem,2vw,1.6rem);line-height:1.2}
p{margin:0}
.muted{color:var(--muted)}
.lead{font-size:clamp(1.1rem,1.6vw,1.35rem);line-height:1.5;max-width:38em}
.btn{display:inline-block;padding:.9em 1.5em;background:var(--accent);color:var(--accent-ink);text-decoration:none;border-radius:var(--radius);font-weight:600}
.btn-ghost{background:transparent;color:inherit;border:1px solid currentColor}
.tone-accent .btn{background:var(--accent-ink);color:var(--accent)}
.ph{position:relative;width:100%;border-radius:var(--radius);overflow:hidden;
background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--ink) 9%,transparent) 0 1px,transparent 1px 11px),color-mix(in srgb,var(--ink) 5%,var(--bg))}
.ph span{position:absolute;left:.9rem;bottom:.8rem;right:.9rem;font-size:.75rem;letter-spacing:.04em;color:var(--muted)}
.rule{border:0;border-top:1px solid var(--line);margin:0}
`;
