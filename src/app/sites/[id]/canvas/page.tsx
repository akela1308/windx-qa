import { Suspense } from "react";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { getManageStore } from "@/lib/storage";
import { getDict } from "@/lib/i18n";
import { canvasBlocks } from "@/lib/free-editor/site-service";
import { blankCanvas } from "@/lib/free-editor/blank";
import { freeCopy } from "@/lib/free-editor/copy";
import { describeCanvasChanges } from "@/lib/sites/edit-review";
import {
  SiteCanvasEditor,
  type CanvasEditorData,
} from "@/components/free-editor/SiteCanvasEditor";
import "@/components/free-editor/free-editor.css";
export const metadata = {
  title: "WINDX visual editor",
  robots: { index: false, follow: false },
};
export default function CanvasPage({
  params,
  searchParams,
}: PageProps<"/sites/[id]/canvas">) {
  return (
    <Suspense fallback={<main className="p-8">WINDX…</main>}>
      <Loader params={params} searchParams={searchParams} />
    </Suspense>
  );
}
async function Loader({
  params,
  searchParams,
}: PageProps<"/sites/[id]/canvas">) {
  const { id } = await params,
    query = await searchParams,
    store = await getManageStore(),
    site = await store.getSite(id).catch(() => null);
  if (!site) notFound();
  const current = await store.getVersion(id, site.currentVersion);
  if (!current) notFound();
  const { locale, t } = await getDict(),
    c = freeCopy(locale),
    pending = await store.getPendingEdit(id);
  const selected =
    typeof query.section === "string"
      ? query.section
      : pending?.canvas?.sectionId;
  const blocks = canvasBlocks(current.doc);
  const existing = blocks.find((b) => b.id === selected);
  const ownPending = !!pending?.canvas && pending.canvas.sectionId === selected;
  if (selected && !existing && !ownPending) notFound();
  const baseline =
    existing?.canvas ??
    blankCanvas(
      c.newBlock,
      c.newText,
      current.doc.tokens.colors.bg,
      current.doc.tokens.colors.ink,
    );
  const proposed = ownPending
    ? canvasBlocks(pending!.version.doc).find((b) => b.id === selected)?.canvas
    : undefined;
  const base = pending && (await store.getVersion(id, pending.baseVersion));
  const data: CanvasEditorData = {
    draftOwner: (await currentUser())?.id,
    sectionIds: blocks.map(b => b.id),
    siteId: id,
    siteName: site.name,
    version: site.currentVersion,
    sectionId: existing?.id ?? null,
    doc: proposed ?? baseline,
    baseline,
    locale,
    blocked: !!pending && !ownPending,
    initial:
      ownPending && base
        ? {
            status: "review",
            id: pending!.id,
            baseVersion: pending!.baseVersion,
            changes: describeCanvasChanges(base.doc, pending!.version.doc,locale),
            reply: pending!.version.reply,
            sectionId: selected,
          }
        : { status: "idle" },
    sections: current.doc.sections.map((s, index) => ({
      index,
      name: s.composition,
    })),
    saved: query.saved === "1",
  };
  return (
    <SiteCanvasEditor
      key={`${data.draftOwner}-${site.id}-${site.currentVersion}-${selected ?? "new"}`}
      data={data}
      t={{
        ...t.editor,
        tools: t.tools,
        publishing: t.publishing,
        trial: t.trial,
        enquiries: t.enquiries,
      }}
    />
  );
}
