"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type KeyboardEvent } from "react";
import { WIDTH, patchBox, type Box, type CanvasDoc, type Device, type Element } from "@/lib/free-editor/model";
import { freeText } from "@/lib/free-editor/copy";
import { styles } from "./styles";

const fonts = { sans: "Arial, sans-serif", serif: "Georgia, serif", mono: "'Courier New', monospace" };
export function ElementContent({ element: e, device }: { element: Element; device: Device }) {
  if (e.type === "image") {
    if(!e.src)return <div role="img" aria-label={e.alt} style={{height:"100%",background:"#eee",border:"1px dashed #888",display:"grid",placeItems:"center"}}>{e.alt}</div>;
    // eslint-disable-next-line @next/next/no-img-element
    const image=<img src={e.src} alt={e.alt} draggable={false} referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: e.fit, borderRadius: e.radius }} />;
    return e.href?<a href={e.href} style={{display:"block",height:"100%"}}>{image}</a>:image;
  }
  if (e.type === "shape") return <div style={{ width: "100%", height: "100%", background: e.fill, borderRadius: e.radius }} />;
  const Tag = e.tag;
  const text=<Tag style={{ margin: 0, letterSpacing: "normal", textTransform: "none", fontStyle: "normal", minHeight: "100%", boxSizing: "border-box", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: fonts[e.style.font], fontSize: device === "phone" ? e.phoneSize : e.style.size, fontWeight: e.style.weight, lineHeight: e.style.lineHeight, color: e.style.colour, textAlign: e.style.align, padding: e.style.padding }}>{e.text}</Tag>;
  return e.href?<a href={e.href} style={{display:"block",height:"100%",color:"inherit"}}>{text}</a>:text;
}

export function Canvas({ doc, device, selected, onSelect, onCommit, preview, snap, viewportWidth, locale="en" }: {
  doc: CanvasDoc; device: Device; selected: string | null; onSelect: (id: string | null) => void;
  onCommit: (doc: CanvasDoc) => void; preview: boolean; snap: boolean; viewportWidth: number; locale?:string;
}) {
  const t=(s:string)=>freeText(locale,s);
  const host = useRef<HTMLDivElement>(null), scene = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0), [draft, setDraft] = useState<CanvasDoc | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const drag = useRef<{ id: string; box: Box; startX: number; startY: number; resize: boolean; current: CanvasDoc; scale: number } | null>(null);
  useEffect(() => {
    const el = host.current; if (!el) return;
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    observer.observe(el); return () => observer.disconnect();
  }, []);
  const shown = draft ?? doc, scale = Math.min(available, viewportWidth) / WIDTH[device];
  useEffect(() => {
    const root = scene.current; if (!root) return;
    // Текст растёт, а не обрезается рамкой. Показываем реальные пересечения после набора.
    const measure = () => {
      const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-element-id]"));
      const issues = new Set<string>();
      for (const node of nodes) {
        const e = shown.elements.find((e) => e.id === node.dataset.elementId);
        if (!e || e.type !== "text") continue;
        const text = node.firstElementChild as HTMLElement | null;
        if (!text) continue;
        const height = Math.max(e[device].height, text.scrollHeight);
        if (height > e[device].height + 2) issues.add(`${e.name}: ${freeText(locale,"text exceeds its frame. Increase height or move the next element.")}`);
        if (e[device].y + height > shown.height[device] + 2) issues.add(`${e.name}: ${freeText(locale,"text extends below the block.")}`);
        for (const other of shown.elements) {
          if (other.id === e.id || other.type === "shape") continue;
          const a = { ...e[device], height }, b = other[device];
          if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y)
            issues.add(`${e.name} ${freeText(locale,"overlaps")} ${other.name}. ${freeText(locale,"Check whether this is intentional.")}`);
        }
      }
      setWarnings([...issues]);
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(root);
    return () => observer.disconnect();
  }, [shown, device, locale]);
  function start(event: PointerEvent<HTMLElement>, e: Element, resize = false) {
    if (preview || event.button !== 0 || scale <= 0) return;
    event.preventDefault(); event.stopPropagation(); onSelect(e.id);
    event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: e.id, box: e[device], startX: event.clientX, startY: event.clientY, resize, current: doc, scale };
  }
  function move(event: PointerEvent<HTMLElement>) {
    const d = drag.current; if (!d) return;
    const unit = snap ? 8 : 1;
    const dx = (event.clientX - d.startX) / d.scale, dy = (event.clientY - d.startY) / d.scale;
    const round = (n: number) => Math.round(n / unit) * unit;
    d.current = patchBox(doc, d.id, device, d.resize ? { width: round(d.box.width + dx), height: round(d.box.height + dy) } : { x: round(d.box.x + dx), y: round(d.box.y + dy) });
    setDraft(d.current);
  }
  function end() { const d = drag.current; drag.current = null; setDraft(null); if (d) onCommit(d.current); }
  function key(event: KeyboardEvent<HTMLElement>, e: Element) {
    if (preview) return;
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(e.id); }
    const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    if (direction) {
      event.preventDefault(); const b = e[device], amount = event.shiftKey ? 10 : 1;
      onCommit(patchBox(doc, e.id, device, { x: b.x + direction[0] * amount, y: b.y + direction[1] * amount }));
    }
    if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); onCommit({ ...doc, elements: doc.elements.filter((n) => n.id !== e.id) }); onSelect(null); }
  }
  return <div className={styles.canvasArea}>
    <div className={styles.canvasHost} ref={host}>
      <div style={{ width: WIDTH[device] * scale, height: shown.height[device] * scale, position: "relative", margin: "0 auto" }}>
        <div ref={scene} data-testid="free-canvas" data-device={device} className={styles.scene}
          onPointerDown={(e) => { if (e.target === e.currentTarget) onSelect(null); }}
          style={{ width: WIDTH[device], height: shown.height[device], transform: `scale(${scale})`, background: shown.background }}>
          {shown.elements.map((e) => <div key={e.id} data-element-id={e.id} data-testid={`element-${e.id}`}
            role={preview ? undefined : "button"} aria-label={preview ? undefined : `${t("Select")} ${e.name}`} tabIndex={preview ? undefined : 0}
            onClickCapture={event=>{if((event.target as HTMLElement).closest("a"))event.preventDefault();}}
            className={`${styles.element} ${!preview ? styles.editable : ""} ${selected === e.id && !preview ? styles.selected : ""}`}
            style={{ left: e[device].x, top: e[device].y, width: e[device].width, height: e[device].height, zIndex: e.layer + 1 } as CSSProperties}
            onPointerDown={(event) => start(event, e)} onPointerMove={move} onPointerUp={end}
            onPointerCancel={() => { drag.current = null; setDraft(null); }} onKeyDown={(event) => key(event, e)}>
            <ElementContent element={e} device={device} />
            {!preview && selected === e.id && <button type="button" aria-label={`${t("Resize")} ${e.name}`} className={styles.handle}
              onPointerDown={(event) => start(event, e, true)} onPointerMove={move} onPointerUp={(event) => { event.stopPropagation(); end(); }}
              onPointerCancel={(event) => { event.stopPropagation(); drag.current = null; setDraft(null); }} onKeyDown={(event) => event.stopPropagation()} />}
          </div>)}
        </div>
      </div>
    </div>
    <p className={styles.canvasNote}>{t(preview ? "Preview" : "Drag to move. Use arrow keys for 1 px, Shift + arrows for 10 px. Resize with the corner or fields.")} · {Math.round(scale * 100)}% · {viewportWidth} px</p>
    {warnings.length > 0 && <div className={styles.warnings} role="status"><strong>{t("Check the layout")}</strong><ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>}
  </div>;
}
