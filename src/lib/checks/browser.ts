import type { BrowserScan } from "./types";

// Вызывается только для изолированного iframe проверки. Ни кликов, ни отправки форм.
export function scanPage(doc: Document, width: number): BrowserScan {
  const win = doc.defaultView!;
  const sections = [...doc.querySelectorAll("[data-section]")];
  const sectionOf = (el: Element) => sections.indexOf(el.closest("[data-section]")!);
  const visible = (el: Element) => { const r = el.getBoundingClientRect(); const s = win.getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden"; };
  const clip = (value: string | null) => (value ?? "").trim().slice(0, 400);
  const headings = [...doc.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible);
  const anchors = [...doc.querySelectorAll("a[href]")].filter(visible);
  const ids = [...doc.querySelectorAll("[id]")].map(el => el.id);
  const links = anchors.slice(0, 250).map(el => {
    const href = el.getAttribute("href") ?? "";
    let targetExists = true;
    if (href.startsWith("#") && href !== "#") { try { targetExists = !!doc.getElementById(decodeURIComponent(href.slice(1))); } catch { targetExists = false; } }
    return { section: sectionOf(el), href: clip(href), label: clip(el.textContent), targetExists };
  });
  const overflow = sections.flatMap((el, i) => el.getBoundingClientRect().right > width + 2 || el.getBoundingClientRect().left < -2 || [...el.querySelectorAll("h1,h2,h3,p,a,input,textarea,table")].some(child => {
    if (!visible(child) || child.closest(".eq-trap")) return false;
    const r = child.getBoundingClientRect(); return r.right > width + 2 || r.left < -2 || child.scrollWidth > child.clientWidth + 3 && win.getComputedStyle(child).overflowX === "visible";
  }) ? [i] : []);
  const smallTargets = [...new Set(anchors.filter(el => { const r = el.getBoundingClientRect(); return r.width < 24 || r.height < 24; }).map(sectionOf))];
  // Непрозрачные однотонные цвета: фон ищем по предкам. Градиенты,
  // изображения и прозрачность не превращаем в уверенный вывод.
  const rgb = (value: string) => { const m = value.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/); return m ? m.slice(1).map(Number) : null; };
  const lum = (c: number[]) => c.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i],0);
  const contrasts: BrowserScan["contrasts"] = [];
  for (const el of [...doc.querySelectorAll("h1,h2,h3,p,a,label,button,td,li,span")].slice(0, 1500)) {
    if (!visible(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent?.trim())) continue;
    let node: Element | null = el, background: number[] | null = null, uncertain = false;
    const style = win.getComputedStyle(el), color = rgb(style.color);
    while (node) {
      const s = win.getComputedStyle(node);
      if (Number(s.opacity) !== 1 || s.backgroundImage !== "none") uncertain = true;
      if (!background) background = rgb(s.backgroundColor);
      else if (s.backgroundColor !== "rgba(0, 0, 0, 0)" && !rgb(s.backgroundColor)) uncertain = true;
      if (!background && s.backgroundColor !== "rgba(0, 0, 0, 0)") uncertain = true;
      node = node.parentElement;
    }
    if (!color || !background || uncertain) continue;
    const a = lum(color), b = lum(background), ratio = (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    const size = parseFloat(style.fontSize), min = size >= 24 || size >= 18.66 && Number(style.fontWeight) >= 700 ? 3 : 4.5;
    if (ratio < min && contrasts.length < 50) contrasts.push({section:sectionOf(el),text:clip(el.textContent),ratio,min});
  }
  return {width,headings:headings.slice(0,150).map(el=>({section:sectionOf(el),text:clip(el.textContent)})),links,
    duplicateIds:[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))].slice(0,30),
    missingAlt:[...doc.querySelectorAll("img:not([alt])")].slice(0,50).map(sectionOf),overflow,smallTargets,
    contrasts,fontsReady:doc.fonts.status === "loaded" && doc.fonts.size > 0 && [...doc.fonts].every(font => font.status !== "error"),truncated:headings.length>150 || anchors.length>250};
}

export { inspectHtml } from "./isolated-page";
import { inspectHtml } from "./isolated-page";
export function measureHtml(html: string, width: number) { return inspectHtml(html, width, doc => scanPage(doc,width)); }
