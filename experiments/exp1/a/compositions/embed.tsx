import type { CSSProperties } from "react";
import { z } from "zod";
import { defineComposition } from "../registry";

export const CodePropsSchema = z.object({
  title: z.string().trim().min(1).max(80),
  html: z.string().max(50000),
  css: z.string().max(30000),
  js: z.string().max(30000),
  height: z.number().int().min(120).max(2000),
  mobileHeight: z.number().int().min(120).max(2000),
}).refine((p) => [p.html, p.css, p.js].some((s) => s.trim()), "Code is empty");
export type CodeProps = z.infer<typeof CodePropsSchema>;

// Не выдаём исходник отдельным URL на домене кабинета. Он только в srcdoc,
// экранированном React, с непрозрачным origin и без allow-same-origin.
export function codeDocument(p: CodeProps): string {
  const policy = "default-src 'none'; script-src 'unsafe-inline' https:; style-src 'unsafe-inline' https:; img-src https: data: blob:; font-src https: data:; connect-src https:; frame-src https:; media-src https: data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer"><style>html,body{margin:0;min-height:100%;overflow-wrap:anywhere}*,*::before,*::after{box-sizing:border-box}img,video{max-width:100%}\n${p.css.replace(/<\/style/gi, "<\\/style")}</style></head><body>${p.html}<script>${p.js.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
}

export const embed = {
  "embed.code": defineComposition({
    description: "Изолированная секция кода владельца. Добавляется и изменяется вручную во вкладке Code; AI сохраняет её без изменений.",
    props: CodePropsSchema,
    css: `.wc-frame{display:block;width:100%;height:var(--wc-height);border:0;background:transparent}@media(max-width:760px){.wc-frame{height:var(--wc-mobile-height)}}`,
    render: (p) => <section className="sec"><div className="wrap">
      <iframe title={p.title} className="wc-frame" sandbox="allow-scripts" referrerPolicy="no-referrer"
        allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'"
        style={{ "--wc-height": `${p.height}px`, "--wc-mobile-height": `${p.mobileHeight}px` } as CSSProperties}
        srcDoc={codeDocument(p)} />
    </div></section>,
  }),
};
