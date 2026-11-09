// Self-contained: runs in the browser via page.evaluate, without app internals.
export function inspectPageLayout() {
  const tolerance = 1.5;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  type Box = { left: number; right: number; top: number; bottom: number };
  type Issue = {
    kind: string;
    section: string;
    text: string;
    limit?: Box;
    bounds: Box;
    other?: string;
  };
  const issues: Issue[] = [];
  const boxes: {
    block: Element;
    section: Element | null;
    text: string;
    bounds: Box;
  }[] = [];
  const box = (r: DOMRect): Box => ({
    left: r.left + scrollX,
    right: r.right + scrollX,
    top: r.top + scrollY,
    bottom: r.bottom + scrollY,
  });
  const sectionName = (el: Element | null) =>
    el?.getAttribute("data-section") ?? "page";
  const walker = document.createTreeWalker(
    document.querySelector("main") ?? document.body,
    NodeFilter.SHOW_TEXT,
  );
  let node: Node | null;
  let fragments = 0;
  while ((node = walker.nextNode())) {
    const value = node.textContent ?? "",
      start = value.search(/\S/u),
      end = value.search(/\s*$/u);
    const parent = node.parentElement;
    if (
      start < 0 ||
      !parent ||
      parent.closest('script,style,noscript,[hidden],[aria-hidden="true"]')
    )
      continue;
    // Closed details can retain DOM Range rectangles for their invisible
    // answers. Only their summary belongs to the visible layout.
    const closed = parent.closest("details:not([open])");
    if (closed && !closed.querySelector("summary")?.contains(parent)) continue;
    const style = getComputedStyle(parent);
    if (style.visibility !== "visible" || Number(style.opacity) === 0) continue;
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    const rects = [...range.getClientRects()].filter(
      (r) => r.width > 0 && r.height > 0,
    );
    if (!rects.length) continue;
    const block =
      parent.closest(
        "p,h1,h2,h3,h4,h5,h6,li,td,th,figcaption,blockquote,a,button",
      ) ?? parent;
    const blockBox = box(block.getBoundingClientRect());
    const section = parent.closest("[data-section]");
    const text = value.trim().slice(0, 180);
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const transformed =
      style.textTransform === "uppercase"
        ? text.toUpperCase()
        : style.textTransform === "lowercase"
          ? text.toLowerCase()
          : text;
    const metrics = context.measureText(transformed);
    for (const rect of rects) {
      fragments++;
      const bounds = box(rect);
      if (bounds.left < -tolerance || bounds.right > innerWidth + tolerance)
        issues.push({
          kind: "text-outside-viewport",
          section: sectionName(section),
          text,
          bounds,
        });
      if (
        bounds.left < blockBox.left - tolerance ||
        bounds.right > blockBox.right + tolerance
      )
        issues.push({
          kind: "text-outside-block",
          section: sectionName(section),
          text,
          bounds,
          limit: blockBox,
        });
      const ink: Box = {
        ...bounds,
        top:
          bounds.top +
          metrics.fontBoundingBoxAscent -
          metrics.actualBoundingBoxAscent,
        bottom:
          bounds.top +
          metrics.fontBoundingBoxAscent +
          metrics.actualBoundingBoxDescent,
      };
      boxes.push({ block, section, text, bounds: ink });
      for (let clip: Element | null = parent; clip; clip = clip.parentElement) {
        const css = getComputedStyle(clip),
          r = box(clip.getBoundingClientRect());
        const limit = {
          left: r.left + parseFloat(css.borderLeftWidth),
          right: r.right - parseFloat(css.borderRightWidth),
          top: r.top + parseFloat(css.borderTopWidth),
          bottom: r.bottom - parseFloat(css.borderBottomWidth),
        };
        if (
          /^(hidden|clip|auto|scroll)$/.test(css.overflowX) &&
          (bounds.left < limit.left - tolerance ||
            bounds.right > limit.right + tolerance)
        )
          issues.push({
            kind: "text-clipped-x",
            section: sectionName(section),
            text,
            bounds,
            limit,
          });
        if (
          /^(hidden|clip|auto|scroll)$/.test(css.overflowY) &&
          (ink.top < limit.top - tolerance ||
            ink.bottom > limit.bottom + tolerance)
        )
          issues.push({
            kind: "text-clipped-y",
            section: sectionName(section),
            text,
            bounds: ink,
            limit,
          });
      }
    }
  }
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i],
        b = boxes[j];
      if (
        a.section !== b.section ||
        a.block === b.block ||
        a.block.contains(b.block) ||
        b.block.contains(a.block)
      )
        continue;
      const overlapX =
        Math.min(a.bounds.right, b.bounds.right) -
        Math.max(a.bounds.left, b.bounds.left);
      const overlapY =
        Math.min(a.bounds.bottom, b.bounds.bottom) -
        Math.max(a.bounds.top, b.bounds.top);
      if (overlapX > 3 && overlapY > 3)
        issues.push({
          kind: "text-overlap",
          section: sectionName(a.section),
          text: a.text,
          other: b.text,
          bounds: a.bounds,
          limit: b.bounds,
        });
    }
  const sections = [
    ...document.querySelectorAll<HTMLElement>("main>[data-section]"),
  ].map((el) => ({
    name: el.dataset.section!,
    bounds: box(el.getBoundingClientRect()),
  }));
  for (let i = 1; i < sections.length; i++)
    if (sections[i - 1].bounds.bottom > sections[i].bounds.top + tolerance)
      issues.push({
        kind: "section-overlap",
        section: sections[i].name,
        text: sections[i - 1].name,
        bounds: sections[i].bounds,
        limit: sections[i - 1].bounds,
      });
  const images = [...document.images].map((img) => ({
    alt: img.alt,
    loaded: img.complete && img.naturalWidth > 0,
    width: img.getBoundingClientRect().width,
    height: img.getBoundingClientRect().height,
  }));
  const primary = document
    .querySelector('[data-section^="hero."] .btn')
    ?.getBoundingClientRect();
  return {
    width: innerWidth,
    viewportHeight: innerHeight,
    primaryActionBottom: primary ? primary.bottom + scrollY : null,
    scrollWidth: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    fragments,
    issues,
    images,
    sections,
    fonts: [...document.fonts]
      .filter((font) => font.status === "loaded")
      .map((font) => font.family),
  };
}
