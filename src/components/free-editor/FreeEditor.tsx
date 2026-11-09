"use client";

import { useEffect, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import Link from "next/link";
import { examples, newElement } from "@/lib/free-editor/examples";
import { history, commit, undo, redo, parseDocument, patchBox, reorder, type CanvasDoc, type Device, type Element } from "@/lib/free-editor/model";
import { appendSnapshot, decodeSnapshots, storageKey, type Snapshot } from "@/lib/free-editor/storage";
import { Canvas } from "./Canvas";
import { Inspector, NumberField } from "./Inspector";
import { Modal } from "./Modal";
import { styles } from "./styles";

const subscribe = () => () => {};
function load(example: typeof examples[number]): { doc: CanvasDoc; snapshots: Snapshot[]; error: string } {
  try {
    const snapshots = decodeSnapshots(localStorage.getItem(storageKey(example.id)));
    return { doc: snapshots.at(-1)?.doc ?? example.doc, snapshots, error: "" };
  } catch { return { doc: example.doc, snapshots: [], error: "Saved data could not be read. The example is open; saving will replace its local draft history." }; }
}

export function FreeEditor() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return mounted ? <Editor /> : <main className={styles.loading}>Opening the free block prototype…</main>;
}

function Editor() {
  const [initial] = useState(() => load(examples[0]));
  const [h, setHistory] = useState(() => history(initial.doc));
  const [exampleId, setExampleId] = useState(examples[0].id);
  const [snapshots, setSnapshots] = useState(initial.snapshots);
  const [saved, setSaved] = useState(() => JSON.stringify(initial.doc));
  const [status, setStatus] = useState(initial.error || "Local prototype. No AI calls or publication.");
  const [selected, setSelected] = useState<string | null>("headline");
  const [viewportWidth, setViewportWidth] = useState(1120);
  const [preview, setPreview] = useState(false), [snap, setSnap] = useState(false);
  const [pendingExample, setPendingExample] = useState<string | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false), [json, setJson] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [restoreIndex, setRestoreIndex] = useState("");
  const doc = h.present, device: Device = viewportWidth <= 760 ? "phone" : "desktop";
  const dirty = JSON.stringify(doc) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [dirty]);
  const active = doc.elements.find((e) => e.id === selected);
  const stack = [...doc.elements].sort((a, b) => a.layer - b.layer);
  function change(next: CanvasDoc) { setHistory((previous) => commit(previous, next)); }
  function openExample(id: string) {
    const example = examples.find((e) => e.id === id); if (!example) return;
    const loaded = load(example); setExampleId(id); setHistory(history(loaded.doc));
    setSnapshots(loaded.snapshots); setSaved(JSON.stringify(loaded.doc)); setSelected("headline");
    setStatus(loaded.error || "Example opened. Each example has its own local drafts."); setPendingExample(null); setRestoreIndex("");
  }
  function save() {
    try {
      const next = appendSnapshot(snapshots, doc);
      localStorage.setItem(storageKey(exampleId), JSON.stringify(next));
      setSnapshots(next); setSaved(JSON.stringify(doc)); setRestoreIndex(""); setStatus("Draft saved in this browser. The latest 8 saved versions are kept. Nothing is published.");
    } catch { setStatus("Could not save in this browser. Your work is still open. Copy the document from Document JSON before leaving."); }
  }
  function add(type: Element["type"]) {
    if (doc.elements.length >= 40) { setStatus("This prototype supports up to 40 elements."); return; }
    const element = { ...newElement(type, `e-${crypto.randomUUID().slice(0, 8)}`), layer: Math.max(-1, ...doc.elements.map((e) => e.layer)) + 1 };
    // Низкий холст также допускает добавление: рамка ограничивается его высотой.
    const next = { ...doc, elements: [...doc.elements, element] };
    const bounded = patchBox(patchBox(next, element.id, "desktop", {}), element.id, "phone", {});
    change(bounded); setSelected(element.id); setPreview(false);
  }
  function duplicate() {
    if (!active || doc.elements.length >= 40) return;
    const element = { ...structuredClone(active), id: `e-${crypto.randomUUID().slice(0, 8)}`, name: `${active.name.slice(0, 70)} copy`, layer: Math.max(...doc.elements.map((e) => e.layer)) + 1 };
    const next = { ...doc, elements: [...doc.elements, element] };
    change(patchBox(patchBox(next, element.id, "desktop", { x: element.desktop.x + 16, y: element.desktop.y + 16 }), element.id, "phone", { x: element.phone.x + 8, y: element.phone.y + 8 })); setSelected(element.id);
  }
  function key(event: KeyboardEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("input,textarea,select")) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") { event.preventDefault(); setHistory((v) => event.shiftKey ? redo(v) : undo(v)); }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); save(); }
  }
  return <main className={styles.lab} onKeyDown={key}>
    <div inert={jsonOpen || pendingExample !== null}>
    <header className={styles.header}>
      <div><Link href="/sites" className={styles.brand}>WINDX <span>/ LAB</span></Link><h1>Free block</h1><p>Prototype · changes stay in this browser</p></div>
      <div className={styles.actions}>
        <button onClick={() => setHistory(undo)} disabled={!h.past.length} aria-label="Undo">Undo</button>
        <button onClick={() => setHistory(redo)} disabled={!h.future.length} aria-label="Redo">Redo</button>
        <button onClick={() => { setJson(JSON.stringify(doc, null, 2)); setJsonError(""); setJsonOpen(true); }}>Document JSON</button>
        <button aria-label="Save draft" className={styles.primary} onClick={save}>Save draft{dirty ? " *" : ""}</button>
      </div>
    </header>
    <div className={styles.notice} role="status">{status}</div>
    <div className={styles.toolbar}>
      <label>Example<select aria-label="Example" value={exampleId} onChange={(e) => dirty ? setPendingExample(e.target.value) : openExample(e.target.value)}>{examples.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
      <div className={styles.actions} role="group" aria-label="Screen width">
        {[1120, 768, 390, 360, 320].map((w) => <button key={w} aria-pressed={viewportWidth === w} onClick={() => setViewportWidth(w)}>{w === 1120 ? "Desktop" : w === 360 ? "Phone" : `${w} px`}</button>)}
      </div>
      <button aria-pressed={preview} onClick={() => setPreview(!preview)}>{preview ? "Back to editing" : "Preview"}</button>
      <label className={styles.checkbox}><input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} /> Snap to 8 px</label>
    </div>
    <div className={styles.workspace}>
      <aside className={styles.layers} aria-label="Layers and block settings">
        <h2>Layers</h2><p className={styles.hint}>Top of this list is the front layer. Changing layers keeps the text reading order.</p>
        <div className={styles.addButtons}><button onClick={() => add("text")}>+ Text</button><button onClick={() => add("image")}>+ Image</button><button onClick={() => add("shape")}>+ Shape</button></div>
        <ol className={styles.layerList}>{[...stack].reverse().map((e) => <li key={e.id}><button aria-label={`Layer: ${e.name}`} aria-pressed={selected === e.id} onClick={() => { setSelected(e.id); setPreview(false); }}><span aria-hidden="true">{e.type === "text" ? "T" : e.type === "image" ? "▧" : "□"}</span>{e.name}</button></li>)}</ol>
        <div className={styles.layerTools}>
          <button disabled={!active || stack.at(-1)?.id === selected} onClick={() => selected && change(reorder(doc, selected, 1))}>Bring forward</button>
          <button disabled={!active || stack[0]?.id === selected} onClick={() => selected && change(reorder(doc, selected, -1))}>Send backward</button>
          <button disabled={!active || doc.elements.length >= 40} onClick={duplicate}>Duplicate</button>
          <button disabled={!active} onClick={() => { change({ ...doc, elements: doc.elements.filter((e) => e.id !== selected) }); setSelected(null); }}>Delete element</button>
        </div>
        <h2>Block</h2>
        <label className={styles.field}>Block name<input aria-label="Block name" value={doc.title} maxLength={100} onChange={(e) => { if (e.target.value.trim()) change({ ...doc, title: e.target.value }); }} /></label>
        <label className={styles.field}>Background<input type="color" value={doc.background} onChange={(e) => change({ ...doc, background: e.target.value })} /></label>
        <NumberField label={`${device === "phone" ? "Phone" : "Desktop"} block height`} value={doc.height[device]} min={Math.max(200, ...doc.elements.map((e) => Math.ceil(e[device].y + e[device].height)))} max={3000} onChange={(value) => change({ ...doc, height: { ...doc.height, [device]: value } })} />
        <p className={styles.hint}>Reducing the block height cannot hide existing frames. Adjust the elements first.</p>
        <h2>Saved versions</h2>
        <label className={styles.field}>Version<select aria-label="Saved version" value={restoreIndex} onChange={(e) => setRestoreIndex(e.target.value)}><option value="">Choose a version</option>{snapshots.map((s, index) => <option key={`${s.savedAt}-${index}`} value={index}>{index + 1} · {new Date(s.savedAt).toLocaleTimeString()}</option>)}</select></label>
        <button disabled={restoreIndex === ""} onClick={() => { const snapshot = snapshots[Number(restoreIndex)]; if (snapshot) { change(snapshot.doc); setSelected(null); setStatus("Saved version restored. Undo returns to your previous work; Save draft keeps this version."); } }}>Restore version</button>
        <p className={styles.hint}>Save before closing. Drafts do not sync between devices. Document JSON lets you copy a version to another browser.</p>
      </aside>
      <section className={styles.stage} aria-label="Canvas workspace"><Canvas key={`${device}-${exampleId}`} doc={doc} device={device} viewportWidth={viewportWidth} selected={selected} onSelect={setSelected} onCommit={change} preview={preview} snap={snap} /></section>
      <aside className={styles.properties} aria-label="Element properties"><Inspector doc={doc} device={device} selected={selected} onCommit={change} /></aside>
    </div>
    </div>
    {pendingExample && <Modal title="Unsaved changes" onClose={() => setPendingExample(null)}>
      <h2>Keep your current work?</h2><p>This example has unsaved changes. Save it before opening another example, or discard these changes.</p>
      <button autoFocus onClick={() => setPendingExample(null)}>Keep editing</button><button onClick={() => { save(); setPendingExample(null); }}>Save current draft</button><button onClick={() => openExample(pendingExample)}>Discard and open example</button>
    </Modal>}
    {jsonOpen && <Modal title="Document JSON" onClose={() => setJsonOpen(false)}>
      <h2>Document JSON</h2><p>Copy this document to keep a portable version. Loading replaces the open block and can be undone. The prototype validates the document before loading.</p>
      <textarea autoFocus aria-label="Document JSON source" rows={12} value={json} maxLength={250000} onChange={(e) => setJson(e.target.value)} spellCheck={false} />
      {jsonError && <p role="alert">{jsonError}</p>}
      <button onClick={() => setJsonOpen(false)}>Close document</button><button onClick={() => { try { change(parseDocument(json)); setSelected(null); setJsonOpen(false); setStatus("Document loaded. Save draft to keep it in this browser."); } catch { setJsonError("Document could not be loaded. Check its format, IDs, image URLs and element bounds. Your current work has been kept."); } }}>Load document</button>
    </Modal>}
  </main>;
}
