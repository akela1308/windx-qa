"use client";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { canvasAction, type CanvasState } from "@/app/canvas-actions";
import {
  history,
  commit,
  undo,
  redo,
  patchBox,
  reorder,
  type CanvasDoc,
  type Device,
  type Element,
} from "@/lib/free-editor/model";
import { newElement } from "@/lib/free-editor/examples";
import { freeCopy } from "@/lib/free-editor/copy";
import { Canvas } from "./Canvas";
import { Inspector, NumberField } from "./Inspector";
import { styles } from "./styles";
import { EditReview } from "@/components/editor/EditReview";
import type { EditorT } from "@/components/editor/Editor";
import { useCanvasDrafts } from "./useCanvasDrafts";
import { CanvasDraftNotice } from "./CanvasDraftNotice";
import { canRestoreCanvas, type CanvasDraft } from "@/lib/editor-drafts/canvas";
import { canvasDraftCopy } from "@/lib/editor-drafts/canvas-copy";

export type CanvasEditorData = {
  draftOwner?: string;
  sectionIds: string[];
  siteId: string;
  siteName: string;
  version: number;
  sectionId: string | null;
  doc: CanvasDoc;
  baseline: CanvasDoc;
  locale: string;
  blocked: boolean;
  initial: CanvasState;
  sections: { index: number; name: string }[];
  saved: boolean;
};
export function SiteCanvasEditor({
  data,
  t,
}: {
  data: CanvasEditorData;
  t: EditorT;
}) {
  const c = freeCopy(data.locale),
    [h, setHistory] = useState(() => history(data.doc)),
    [selected, setSelected] = useState<string | null>(
      data.doc.elements[0]?.id ?? null,
    ),
    [device, setDevice] = useState<Device>("desktop"),
    [preview, setPreview] = useState(false),
    [snap, setSnap] = useState(false),
    [after, setAfter] = useState("footer");
  const [state, action, pending] = useActionState(
    canvasAction.bind(null, data.siteId),
    data.initial,
  );
  const [linkInputs, setLinkInputs] = useState<Record<string, string>>({});
  const links = useMemo(() => Object.fromEntries(Object.entries(linkInputs).filter(([id]) => h.present.elements.some(e => e.id === id && e.type !== "shape"))), [linkInputs, h.present]);
  const pendingLinks = Object.entries(links).some(([id, value]) => value !== ((h.present.elements.find(e => e.id === id) as {href?: string})?.href ?? ""));
  const reviewing = state.status === "review",
    doc = h.present,
    dirty = JSON.stringify(doc) !== JSON.stringify(data.baseline) || !data.sectionId && after !== "footer" || pendingLinks;
  const drafts = useCanvasDrafts({ owner: data.draftOwner, site: data.siteId, sectionId: data.sectionId, version: data.version, doc, after, links, device, selected, dirty, reviewing, blocked: data.blocked });
  const disabled = pending || reviewing || data.blocked || !drafts.ready || !!drafts.candidate;
  const active = doc.elements.find((e) => e.id === selected),
    stack = [...doc.elements].sort((a, b) => a.layer - b.layer);
  const [uploading, setUploading] = useState(false),
    [uploadError, setUploadError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if ((!dirty && !uploading) || reviewing) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, reviewing, uploading]);
  function change(next: CanvasDoc) {
    setHistory((previous) => commit(previous, next));
  }
  function add(type: Element["type"]) {
    if (doc.elements.length >= 40) return;
    let element = newElement(type, `e-${crypto.randomUUID().slice(0, 8)}`);
    element = {
      ...element,
      name:
        type === "text"
          ? c.newText
          : type === "image"
            ? c.newImage
            : c.newShape,
      layer: Math.min(
        10000,
        Math.max(-1, ...doc.elements.map((e) => e.layer)) + 1,
      ),
    };
    if (element.type === "text") {
      element.text = c.newText;
      element.style = {
        ...element.style,
        colour:
          doc.elements.find((e) => e.type === "text")?.style.colour ??
          "#20201d",
      };
    }
    if (element.type === "image") {
      element.src = "";
      element.alt = c.newImage;
    }
    const next = { ...doc, elements: [...doc.elements, element] };
    change(
      patchBox(
        patchBox(next, element.id, "desktop", {}),
        element.id,
        "phone",
        {},
      ),
    );
    setSelected(element.id);
    setPreview(false);
  }
  function duplicate() {
    if (!active || doc.elements.length >= 40) return;
    const e = {
      ...structuredClone(active),
      id: `e-${crypto.randomUUID().slice(0, 8)}`,
      layer: Math.min(
        10000,
        Math.max(-1, ...doc.elements.map((e) => e.layer)) + 1,
      ),
    };
    const next = { ...doc, elements: [...doc.elements, e] };
    change(
      patchBox(
        patchBox(next, e.id, "desktop", {
          x: e.desktop.x + 16,
          y: e.desktop.y + 16,
        }),
        e.id,
        "phone",
        { x: e.phone.x + 8, y: e.phone.y + 8 },
      ),
    );
    setSelected(e.id);
  }
  const form = useRef<HTMLFormElement>(null);
  function key(event: KeyboardEvent<HTMLElement>) {
    if (disabled || uploading) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (!pendingLinks) form.current?.requestSubmit();
      return;
    }
    if ((event.target as HTMLElement).closest("input,textarea,select")) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      setHistory((v) => (event.shiftKey ? redo(v) : undo(v)));
    }
    if (event.key === "Escape") setSelected(null);
  }
  async function upload(image: File) {
    if (!active || active.type !== "image") return;
    const id = active.id;
    setUploading(true);
    setUploadError("");
    try {
      if (image.size > 8 * 1024 * 1024) throw Error();
      const r = await fetch(`/sites/${data.siteId}/images`, {
        method: "POST",
        headers: { "content-type": image.type },
        body: image,
      });
      const value = await r.json();
      if (!r.ok) throw Error();
      setHistory((previous) =>
        commit(previous, {
          ...previous.present,
          elements: previous.present.elements.map((e) =>
            e.id === id && e.type === "image" ? { ...e, src: value.src } : e,
          ),
        }),
      );
    } catch {
      setUploadError(c.uploadError);
    } finally {
      setUploading(false);
      if (file.current) file.current.value = "";
    }
  }
  const recover = (draft: CanvasDraft) => {
    if (pending || uploading || data.blocked || !canRestoreCanvas(draft, data.version, data.sectionId, data.sectionIds)) return;
    setHistory(commit(history(data.baseline), draft.doc)); setAfter(draft.after); setDevice(draft.device); setLinkInputs(draft.links);
    setSelected(draft.doc.elements.some(e => e.id === draft.selected) ? draft.selected : draft.doc.elements[0]?.id ?? null);
    setPreview(false); drafts.restore();
  };
  const reset = () => {
    setLinkInputs({}); setHistory(history(data.baseline)); setAfter("footer"); setSelected(data.baseline.elements[0]?.id ?? null); setPreview(false); drafts.clear(data.sectionId);
  };
  const leave = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!reviewing && (uploading || dirty && drafts.status !== "saved") && !window.confirm(canvasDraftCopy(data.locale).leave)) event.preventDefault();
  };
  return (
    <main className={`${styles.lab} wfe-client`} onKeyDown={key}>
      <header className={styles.header}>
        <div>
          <Link href={`/sites/${data.siteId}`} onClick={leave}>
            {c.back}
          </Link>
          <h1>{c.title}</h1>
          <p>
            {data.siteName}. {c.clean}: {data.version}
          </p>
        </div>
        <div className={styles.actions}>
          <button
            onClick={() => setHistory(undo)}
            disabled={disabled || !h.past.length}
          >
            {c.undo}
          </button>
          <button
            onClick={() => setHistory(redo)}
            disabled={disabled || !h.future.length}
          >
            {c.redo}
          </button>
          <button
            disabled={
              disabled ||
              uploading ||
              pendingLinks ||
              (!dirty && !!data.sectionId) ||
              (!data.sectionId && data.sections.length >= 16)
            }
            className={styles.primary}
            form="canvas-proposal"
            name="intent"
            value="save"
            type="submit"
          >
            {pending ? c.working : c.review}
          </button>
        </div>
      </header>
      <p className={styles.notice} role="status">
        {data.blocked
          ? c.blocked
          : reviewing
            ? c.reviewHint
            : data.saved && !dirty
              ? c.saved
              : dirty
                ? canvasDraftCopy(data.locale).notApplied
                : c.intro}
      </p>
      {!reviewing && drafts.drafts.map(draft => <CanvasDraftNotice key={draft.sectionId ?? "new"} draft={draft} locale={data.locale} siteId={data.siteId}
        stale={draft.baseVersion !== data.version || draft.sectionId !== null && !data.sectionIds.includes(draft.sectionId)} current={draft.sectionId === data.sectionId} restorable={canRestoreCanvas(draft, data.version, data.sectionId, data.sectionIds)} exists={draft.sectionId === null || data.sectionIds.includes(draft.sectionId)}
        busy={pending || uploading || data.blocked} restore={() => recover(draft)} discard={() => drafts.clear(draft.sectionId)} />)}
      {!reviewing && drafts.status !== "idle" && <p className={styles.notice} role={drafts.status === "unavailable" ? "alert" : "status"}>{canvasDraftCopy(data.locale)[drafts.status]}</p>}
      {!reviewing && dirty && !drafts.candidate && <div className="mx-auto max-w-3xl px-4"><button type="button" disabled={pending || uploading || data.blocked} onClick={reset}>{canvasDraftCopy(data.locale).reset}</button></div>}
      {!reviewing && pendingLinks && <p role="status" className={styles.notice}>{canvasDraftCopy(data.locale).links}</p>}
      {state.status === "error" && (
        <p role="alert" className={styles.warnings}>
          {c.error}
        </p>
      )}
      {state.status === "review" && (
        <ol className="mx-auto max-w-3xl p-4">
          <EditReview
            state={state}
            siteId={data.siteId}
            currentVersion={data.version}
            t={t}
            action={action}
            pending={pending}
          />
        </ol>
      )}
      <form id="canvas-proposal" ref={form} action={action} onSubmit={event => { if (pendingLinks) event.preventDefault(); }}>
        <input type="hidden" name="baseVersion" value={data.version} />
        <input type="hidden" name="sectionId" value={data.sectionId ?? ""} />
        <input type="hidden" name="after" value={after} />
        <input type="hidden" name="canvas" value={JSON.stringify(doc)} />
      </form>
      <div inert={disabled || uploading}>
        <div className={styles.toolbar}>
          <div className={styles.actions}>
            <button
              aria-pressed={device === "desktop"}
              onClick={() => setDevice("desktop")}
            >
              {c.desktop}
            </button>
            <button
              aria-pressed={device === "phone"}
              onClick={() => setDevice("phone")}
            >
              {c.phone}
            </button>
            <button aria-pressed={preview} onClick={() => setPreview(!preview)}>
              {preview ? c.editing : c.preview}
            </button>
          </div>
          <label>
            <input
              type="checkbox"
              checked={snap}
              onChange={(e) => setSnap(e.target.checked)}
            />
            {c.snap}
          </label>
          {!data.sectionId && (
            <label>
              {c.position}
              <select value={after} onChange={(e) => setAfter(e.target.value)}>
                <option value="footer">{c.beforeFooter}</option>
                <option value="-1">{c.top}</option>
                {data.sections.map((s) => (
                  <option key={s.index} value={s.index}>
                    {s.index + 1}: {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className={styles.workspace}>
          <aside className={styles.layers}>
            <h2>{c.layers}</h2>
            <div className={styles.addButtons}>
              <button
                disabled={doc.elements.length >= 40}
                onClick={() => add("text")}
              >
                {c.text}
              </button>
              <button
                disabled={doc.elements.length >= 40}
                onClick={() => add("image")}
              >
                {c.image}
              </button>
              <button
                disabled={doc.elements.length >= 40}
                onClick={() => add("shape")}
              >
                {c.shape}
              </button>
            </div>
            <ol className={styles.layerList}>
              {[...stack].reverse().map((e) => (
                <li key={e.id}>
                  <button
                    aria-label={`${c.layers}: ${e.name}`}
                    aria-pressed={selected === e.id}
                    onClick={() => {
                      setSelected(e.id);
                      setPreview(false);
                    }}
                  >
                    {e.name}
                  </button>
                </li>
              ))}
            </ol>
            <div className={styles.layerTools}>
              <button
                disabled={!active || stack.at(-1)?.id === selected}
                onClick={() => selected && change(reorder(doc, selected, 1))}
              >
                {c.forward}
              </button>
              <button
                disabled={!active || stack[0]?.id === selected}
                onClick={() => selected && change(reorder(doc, selected, -1))}
              >
                {c.backward}
              </button>
              <button
                disabled={!active || doc.elements.length >= 40}
                onClick={duplicate}
              >
                {c.duplicate}
              </button>
              <button
                disabled={!active}
                onClick={() => {
                  change({
                    ...doc,
                    elements: doc.elements.filter((e) => e.id !== selected),
                  });
                  setSelected(null);
                }}
              >
                {c.remove}
              </button>
            </div>
            <label className={styles.field}>
              {c.name}
              <input
                aria-label={c.name}
                value={doc.title}
                maxLength={100}
                onChange={(e) => {
                  if (e.target.value.trim())
                    change({ ...doc, title: e.target.value });
                }}
              />
            </label>
            <label className={styles.field}>
              {c.background}
              <input
                type="color"
                value={doc.background}
                onChange={(e) => change({ ...doc, background: e.target.value })}
              />
            </label>
            <NumberField
              label={`${device === "phone" ? c.phone : c.desktop}: ${c.height}`}
              value={doc.height[device]}
              min={Math.max(
                200,
                ...doc.elements.map((e) =>
                  Math.ceil(e[device].y + e[device].height),
                ),
              )}
              max={3000}
              onChange={(height) =>
                change({ ...doc, height: { ...doc.height, [device]: height } })
              }
            />
            <p className={styles.hint}>{c.separate}</p>
            <p className={styles.hint}>{c.limit}</p>
            {data.sectionId && (
              <button
                form="canvas-proposal"
                name="intent"
                value="remove"
                type="submit"
              >
                {c.removeBlock}
              </button>
            )}
          </aside>
          <section className={styles.stage}>
            <Canvas
              key={device}
              doc={doc}
              device={device}
              selected={selected}
              onSelect={setSelected}
              onCommit={change}
              preview={preview}
              snap={snap}
              viewportWidth={device === "phone" ? 360 : 1120}
              locale={data.locale}
            />
          </section>
          <aside className={styles.properties}>
            <Inspector
              key={selected}
              doc={doc}
              device={device}
              selected={selected}
              onCommit={change}
              locale={data.locale}
              linkInputs={links}
              onLinkInput={(id, value) => setLinkInputs(old => { const next = {...old}; if (value === null) delete next[id]; else next[id] = value; return next; })}
              imageControl={
                <div>
                  <input
                    ref={file}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label={c.upload}
                    hidden
                    onChange={(e) => {
                      if (e.target.files?.[0]) void upload(e.target.files[0]);
                    }}
                  />
                  <button onClick={() => file.current?.click()}>
                    {uploading ? c.uploading : c.upload}
                  </button>
                  {uploadError && <p role="alert">{uploadError}</p>}
                </div>
              }
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
