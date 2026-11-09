// Функция выполняется внутри браузера (Playwright page.evaluate).
// Она снимает «скелет» страницы: список крупных блоков и форму каждого,
// и ищет сетки одинаковых карточек с иконками. Одинаково для подходов A и B.

export type BlockShape = {
  kind: string; // грубая форма блока: photo-split, grid-3, list, type, prose...
  height: number;
  cols: number;
  photos: number;
  maxFont: number;
  textLen: number;
  rows: number;
  bg: boolean; // фон отличается от фона страницы
};

export type ProbeResult = {
  blocks: BlockShape[];
  cardGrids: { icon: boolean; count: number; sample: string }[];
  fonts: string[];
  bodyBg: string;
  scrollWidth: number;
  viewport: number;
  invisibleText: string[]; // текст того же цвета, что фон под ним
};

export function probe(): ProbeResult {
  const W = document.documentElement.clientWidth;
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const isPhoto = (el: Element) => el.matches(".ph,.photo,[data-photo],img,picture,video");

  // 1. Список блоков: шапка, дети <main> (без обёрток из одного ребёнка), подвал.
  const flatten = (el: Element): Element => {
    let cur = el;
    while (cur.children.length === 1 && cur.firstElementChild!.getBoundingClientRect().height > cur.getBoundingClientRect().height * 0.8) cur = cur.firstElementChild!;
    return cur;
  };
  const main = document.querySelector("main");
  const outer = [...document.body.children].filter((e) => !["SCRIPT", "STYLE", "NOSCRIPT"].includes(e.tagName));
  const blocksEls: Element[] = [];
  for (const e of outer) {
    if (main && (e === main || e.contains(main))) {
      const m = main;
      blocksEls.push(...[...m.children].filter((c) => c.getBoundingClientRect().height >= 24));
      // Шапка или подвал внутри обёртки рядом с main.
      if (e !== main) blocksEls.push(...[...e.children].filter((c) => c !== main && !c.contains(main) && c.getBoundingClientRect().height >= 24));
    } else if (e.getBoundingClientRect().height >= 24) blocksEls.push(e);
  }
  blocksEls.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

  // Элементы в одном ряду: вертикальный центр одного попадает в высоту первого.
  // Так колонки с выравниванием по центру тоже считаются рядом.
  const sameRow = (els: Element[]) => {
    const rows: { top: number; bottom: number; items: Element[] }[] = [];
    for (const e of els) {
      const r = e.getBoundingClientRect();
      const mid = (r.top + r.bottom) / 2;
      const row = rows.find((x) => mid >= x.top && mid <= x.bottom);
      if (row) row.items.push(e);
      else rows.push({ top: r.top, bottom: r.bottom, items: [e] });
    }
    return rows.map((x) => x.items);
  };

  const blocks: BlockShape[] = blocksEls.map((raw) => {
    const el = flatten(raw);
    const r = el.getBoundingClientRect();
    // Внутренности SVG (круги, текст по кругу) не считаем блоками вёрстки.
    const all = [el, ...el.querySelectorAll("*")].filter((x) => !x.parentElement?.closest("svg"));
    let cols = 1;
    let rows = 0;
    for (const p of all) {
      if (p.tagName.toLowerCase() === "svg") continue;
      const kids = [...p.children].filter((k) => {
        const kr = k.getBoundingClientRect();
        return kr.width >= r.width * 0.12 && kr.height >= 30;
      });
      if (kids.length < 2) continue;
      for (const row of sameRow(kids)) cols = Math.max(cols, row.length);
      // Стопка похожих строк одна под другой (список, прайс, таблица).
      const stacked = kids.filter((k) => k.getBoundingClientRect().width >= r.width * 0.45);
      if (stacked.length >= 3 && sameRow(stacked).length === stacked.length) rows = Math.max(rows, stacked.length);
    }
    const photosEls = all.filter(isPhoto);
    const photoArea = photosEls.reduce((s, p) => {
      const pr = p.getBoundingClientRect();
      return s + pr.width * pr.height;
    }, 0);
    let maxFont = 0;
    for (const t of all) {
      if (![...t.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())) continue;
      maxFont = Math.max(maxFont, parseFloat(getComputedStyle(t).fontSize));
    }
    const textLen = ((el as HTMLElement).innerText ?? el.textContent ?? "").trim().length;
    const bgOf = (x: Element | null): string => {
      while (x) {
        const c = getComputedStyle(x).backgroundColor;
        if (c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c;
        x = x.parentElement;
      }
      return bodyBg;
    };
    const bg = bgOf(el) !== bodyBg;

    let kind = "prose";
    if (photoArea > r.width * r.height * 0.6) kind = "photo-full";
    else if (photosEls.length >= 3 && cols >= 2) kind = "gallery";
    else if (cols >= 3) kind = `grid-${Math.min(cols, 4)}`;
    else if (cols === 2 && photosEls.length) kind = "photo-split";
    else if (rows >= 3) kind = "list";
    else if (cols === 2) kind = "two-col";
    else if (maxFont >= 64 && textLen < 240) kind = "type";
    if (r.height < 120 && textLen < 160) kind = `strip-${kind}`;
    return { kind, height: Math.round(r.height), cols, photos: photosEls.length, maxFont: Math.round(maxFont), textLen, rows, bg };
  });

  // 2. Сетки карточек: 3+ соседних блока одной ширины в ряд, у каждого рамка/фон/тень.
  const cardGrids: ProbeResult["cardGrids"] = [];
  for (const p of document.querySelectorAll("body *")) {
    const kids = [...p.children].filter((k) => k.getBoundingClientRect().width > 120 && k.getBoundingClientRect().height > 80);
    if (kids.length < 3) continue;
    for (const row of sameRow(kids)) {
      if (row.length < 3) continue;
      const ws = row.map((k) => k.getBoundingClientRect().width);
      if (Math.max(...ws) / Math.min(...ws) > 1.15) continue;
      const pBg = getComputedStyle(p).backgroundColor;
      const boxed = row.every((k) => {
        const s = getComputedStyle(k);
        const border = ["Top", "Right", "Bottom", "Left"].filter((side) => parseFloat(s.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0).length >= 3;
        const fill = s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== pBg;
        return border || fill || s.boxShadow !== "none";
      });
      if (!boxed) continue;
      const hasIcon = row.every((k) =>
        [...k.querySelectorAll("*")].some((d) => {
          const dr = d.getBoundingClientRect();
          if (dr.width === 0 || dr.width > 80 || dr.height > 80) return false;
          if (d.tagName.toLowerCase() === "svg" || d.tagName === "IMG") return true;
          const s = getComputedStyle(d);
          return s.backgroundColor !== "rgba(0, 0, 0, 0)" && dr.width > 24 && Math.abs(dr.width - dr.height) < 8;
        }),
      );
      const hasHeading = row.every((k) => k.querySelector("h2,h3,h4,strong,b") || [...k.querySelectorAll("*")].some((d) => parseInt(getComputedStyle(d).fontWeight) >= 600));
      if (!hasHeading) continue;
      cardGrids.push({ icon: hasIcon, count: row.length, sample: ((row[0] as HTMLElement).innerText ?? "").slice(0, 60).replace(/\s+/g, " ") });
    }
  }

  const fonts = [...new Set([...document.querySelectorAll("h1,h2,p,li")].map((e) => getComputedStyle(e).fontFamily.split(",")[0].replace(/['"]/g, "").trim()))];
  // 3. Невидимый текст: цвет букв совпадает с цветом фона под ними.
  const bgUnder = (x: Element | null): string => {
    while (x) {
      const c = getComputedStyle(x).backgroundColor;
      if (c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c;
      x = x.parentElement;
    }
    return bodyBg;
  };
  const invisibleText = [...document.querySelectorAll("body *")]
    .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()) && getComputedStyle(e).color === bgUnder(e))
    .map((e) => (e.textContent ?? "").trim().slice(0, 40));

  return { blocks, cardGrids, fonts, bodyBg, scrollWidth: document.documentElement.scrollWidth, viewport: W, invisibleText };
}
