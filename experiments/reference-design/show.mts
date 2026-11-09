import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";
import { renderDoc } from "../../src/lib/design/render";
import { validateDoc } from "../../src/lib/design";
import {
  imageGuidance,
  fitCreationImages,
  type CreationAsset,
} from "../../src/lib/design/visual-plan";

const source = path.resolve(
  process.argv[2] ?? "data/verification/reference-design-2026-11-06",
);
const out = path.resolve("docs/generator-comparison-2026-11-06");
const manifest = JSON.parse(
  await readFile(path.join(source, "manifest.json"), "utf8"),
);
const cases = JSON.parse(
  await readFile("experiments/reference-design/cases.json", "utf8"),
) as {
  id: string;
  name: string;
  brief: string;
  assets: (CreationAsset & { file: string })[];
}[];
const esc = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
for (const sub of ["pages", "screenshots", "outputs"])
  await mkdir(path.join(out, sub), { recursive: true });
for (const c of cases)
  for (const asset of c.assets) {
    const dest = path.join(out, asset.src.slice(1));
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(
      path.join("experiments/reference-design/assets", asset.file),
      dest,
    );
  }
const labels = {
  before: "Прежние правила",
  after: "Новый генератор",
  opus: "Новый генератор + Opus",
};
const browser = await chromium.launch({ headless: true });
const checks: Record<string, unknown>[] = [];
const sections: string[] = [];
try {
  const page = await browser.newPage();
  for (const c of cases) {
    const cards: string[] = [];
    for (const variant of ["before", "after", "opus"] as const) {
      const key = `${c.id}-${variant}`;
      const raw = await readFile(path.join(source, key + ".json"), "utf8");
      const checked = validateDoc(JSON.parse(raw));
      if (!checked.ok) throw Error(key + ": " + checked.errors.join("; "));
      const doc =
        variant === "before"
          ? checked.doc
          : fitCreationImages(checked.doc, c.assets);
      let html = renderDoc(doc);
      for (const asset of c.assets)
        html = html.replaceAll(
          `src="${asset.src}"`,
          `src="../${asset.src.slice(1)}"`,
        );
      await writeFile(path.join(out, "pages", key + ".html"), html);
      await writeFile(path.join(out, "outputs", key + ".json"), raw);
      await writeFile(
        path.join(out, "outputs", key + "-rendered.json"),
        JSON.stringify(doc, null, 2) + "\n",
      );
      for (const width of [1440, 390]) {
        await page.setViewportSize({
          width,
          height: width === 390 ? 844 : 1000,
        });
        await page.goto(
          pathToFileURL(path.join(out, "pages", key + ".html")).href,
        );
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            [...document.images].map((image) => image.decode()),
          );
        });
        const measurements = await page.evaluate(() => {
          const hero = document.querySelector('[data-section^="hero."]');
          const cta = hero?.querySelector(".btn")?.getBoundingClientRect();
          return {
            width: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            h1: document.querySelectorAll("h1").length,
            ctaBottom: cta?.bottom ?? null,
            images: [...document.images].map((i) => ({
              loaded: i.complete && i.naturalWidth > 0,
              alt: !!i.alt,
            })),
            photoPlaceholders:
              document.querySelectorAll(".ph:not(.ph-image)").length,
            fontsReady: document.fonts.status === "loaded",
          };
        });
        const screenshot =
          key + (width === 390 ? "-mobile.jpg" : "-desktop.jpg");
        await page.screenshot({
          path: path.join(out, "screenshots", screenshot),
          type: "jpeg",
          quality: 85,
          fullPage: true,
        });
        checks.push({ key, ...measurements });
      }
      const result = manifest.results.find(
        (r: { caseId: string; variant: string }) =>
          r.caseId === c.id && r.variant === variant,
      );
      const guidance = imageGuidance(doc);
      const plans = guidance
        .map(
          (p) =>
            `<li><strong>${esc(p.subject)}</strong><p>${esc(p.purpose)}</p><p>${esc(p.placement)}</p><p>Кадр: ${esc(p.framing)} · Фокус: ${esc(p.focalPoint)} · ${p.state === "included" ? "Используется" : "Необязательное дополнение"}</p></li>`,
        )
        .join("");
      cards.push(
        `<article><h2>${labels[variant]}</h2><p class="small">${esc(result?.model ?? "unknown")} · ${result?.seconds ?? "?"} с · $${Number(result?.usage?.costUsd ?? 0).toFixed(4)}</p><a href="pages/${key}.html" target="_blank" rel="noopener"><img src="screenshots/${key}-desktop.jpg" alt="${esc(c.name)}, ${labels[variant]}"></a><div class="links"><a href="pages/${key}.html" target="_blank" rel="noopener">Открыть страницу ↗</a><a href="screenshots/${key}-mobile.jpg" target="_blank" rel="noopener">Телефон ↗</a></div><p class="small">${esc(
          doc.sections
            .filter(
              (s) =>
                !s.composition.startsWith("header.") &&
                !s.composition.startsWith("footer.") &&
                !s.composition.startsWith("signature."),
            )
            .map((s) => s.composition)
            .join(" → "),
        )}</p><details><summary>Решение и план изображений</summary><p>${esc(doc.rationale)}</p>${doc.visualPlan ? `<p>${esc(doc.visualPlan.layout)}</p><ul>${plans || "<li>Для этой композиции изображения не требуются.</li>"}</ul>` : "<p>В прежнем контракте отдельного плана изображений не было.</p>"}</details></article>`,
      );
    }
    sections.push(
      `<section data-case="${c.id}"${c.id === cases[0].id ? "" : " hidden"}><h2>${esc(c.name)}</h2><details><summary>Одинаковый исходный бриф</summary><p>${esc(c.brief)}</p></details><div class="grid">${cards.join("")}</div></section>`,
    );
  }
} finally {
  await browser.close();
}
await writeFile(
  path.join(out, "checks.json"),
  JSON.stringify(checks, null, 2) + "\n",
);
await writeFile(
  path.join(out, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
await writeFile(
  path.join(out, "index.html"),
  `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WINDX · сравнение генератора и моделей</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f5f6;color:#172329;font:16px/1.55 system-ui}main{max-width:1600px;margin:auto;padding:32px 24px}h1{font-size:clamp(28px,4vw,50px);line-height:1.1;max-width:950px}h2{font-size:22px}header>p{max-width:1000px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:24px}article{padding:18px;background:white;border:1px solid #cad4d9;min-width:0}article img{width:100%;height:650px;object-fit:cover;object-position:top;border:1px solid #d5dce0}article h2{margin-top:0}.small{font-size:13px;overflow-wrap:anywhere;color:#425b66}.links{display:flex;flex-wrap:wrap;gap:14px;margin:14px 0}a{color:#12564f;text-underline-offset:3px}details{margin:16px 0}summary{cursor:pointer;font-weight:600}details p{margin:.7rem 0}li+li{margin-top:18px}nav{display:flex;flex-wrap:wrap;gap:10px;margin:24px 0}button{padding:12px 18px;border:1px solid #62747c;background:white;font:inherit;cursor:pointer}button[aria-pressed=true]{background:#172f3a;color:white}button:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid #ac461c;outline-offset:3px}[hidden]{display:none!important}@media(max-width:1000px){.grid{grid-template-columns:1fr}article img{height:600px;object-fit:contain;object-position:top;background:#e3e8eb}main{padding:24px 16px}}</style><main><header><p>WINDX / РЕАЛЬНАЯ ГЕНЕРАЦИЯ / 6 НОЯБРЯ 2026</p><h1>Одни брифы и материалы.<br>Три способа собрать страницу.</h1><p>Слева прежние правила и текущая модель; в центре новый генератор на той же модели; справа новый генератор на Opus. Страницы получены реальными API-вызовами и показаны текущим движком. Для предметного фото новый генератор программно сохраняет весь объект и формат исходного материала; исходный и обработанный документы сохранены отдельно. Портрет и керамика созданы ImageGen для вымышленных демо-брифов и поданы одинаково во все варианты. В брифах технической услуги и музыкального вечера фотографий нет.</p><p>Это малый сравнительный прогон, по одному результату на конфигурацию и бриф. Он позволяет увидеть конкретные решения, но не доказывает статистическое превосходство модели. Расход всего прогона: $${Number(manifest.spentUsd ?? 0).toFixed(4)}.</p><nav>${cases.map((c, i) => `<button type="button" data-pick="${c.id}" aria-pressed="${i === 0}">${esc(c.name)}</button>`).join("")}</nav></header>${sections.join("")}</main><script>for(const b of document.querySelectorAll('[data-pick]'))b.addEventListener('click',()=>{for(const s of document.querySelectorAll('[data-case]'))s.hidden=s.dataset.case!==b.dataset.pick;for(const other of document.querySelectorAll('[data-pick]'))other.setAttribute('aria-pressed',String(other===b))})</script></html>\n`,
);
for (const variant of ["after", "opus"]) {
  const pieces = [];
  for (const [i, c] of cases.entries()) {
    const shot = await sharp(
      path.join(out, "screenshots", `${c.id}-${variant}-desktop.jpg`),
    )
      .resize(640, 1250, {
        fit: "contain",
        position: "north",
        background: "#ffffff",
      })
      .toBuffer();
    const label = Buffer.from(
      `<svg width="640" height="60"><rect width="640" height="60" fill="#172f3a"/><text x="18" y="37" font-family="Arial" font-size="22" fill="white">${esc(c.name)}</text></svg>`,
    );
    pieces.push(
      { input: label, left: i * 660, top: 0 },
      { input: shot, left: i * 660, top: 60 },
    );
  }
  await sharp({
    create: {
      width: cases.length * 660 - 20,
      height: 1310,
      channels: 3,
      background: "#cbd5da",
    },
  })
    .composite(pieces)
    .jpeg({ quality: 90 })
    .toFile(path.join(out, `overview-${variant}.jpg`));
}
await copyFile(
  path.join(out, "overview-after.jpg"),
  path.join(out, "overview.jpg"),
);
const phases = ["before", "after", "opus"].map((variant) => {
  const rows = manifest.results.filter(
    (r: { variant: string }) => r.variant === variant,
  ) as {
    model: string;
    usage: { costUsd: number };
    seconds: number;
    receipt: { requests: number };
    hero: string;
    sequence: string[];
  }[];
  return {
    variant,
    model: rows[0]?.model,
    cases: rows.length,
    costUsd: rows.reduce((n, r) => n + r.usage.costUsd, 0),
    seconds: rows.reduce((n, r) => n + r.seconds, 0),
    requests: rows.reduce((n, r) => n + r.receipt.requests, 0),
    uniqueHeroes: new Set(rows.map((r) => r.hero)).size,
    uniqueCoreSequences: new Set(rows.map((r) => r.sequence.join(","))).size,
  };
});
await writeFile(
  path.join(out, "metrics.json"),
  JSON.stringify(
    {
      phases,
      totalCostUsd: manifest.spentUsd,
      totalRequests: manifest.actualRequests,
      renderedPages: cases.length * 3,
      viewportCaptures: checks.length,
      horizontalOverflow: checks.filter(
        (c) => Number(c.scrollWidth) > Number(c.width) + 1,
      ).length,
      failedImages: checks
        .flatMap((c) => c.images as { loaded: boolean }[])
        .filter((i) => !i.loaded).length,
      photoPlaceholders: checks.reduce(
        (n, c) => n + Number(c.photoPlaceholders),
        0,
      ),
      mobilePrimaryActionVisible: checks.filter(
        (c) =>
          c.width === 390 && c.ctaBottom !== null && Number(c.ctaBottom) <= 844,
      ).length,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    out,
    pages: cases.length * 3,
    captures: checks.length,
    overflow: checks.filter((c) => Number(c.scrollWidth) > Number(c.width) + 1),
    missingImages: checks.filter((c) =>
      (c.images as { loaded: boolean }[]).some((i) => !i.loaded),
    ),
    photoPlaceholders: checks.filter((c) => Number(c.photoPlaceholders) > 0),
  }),
);
