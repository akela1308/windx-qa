import { contentSections } from "@/lib/content/fields";
import { imageGuidance } from "@/lib/design/visual-plan";
import { canvasBlocks } from "@/lib/free-editor/site-service";
import {domainService} from "@/lib/domains/runtime";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { notificationSettingsView } from "@/lib/enquiries/notification-settings";
import { Editor, type EditorData } from "@/components/editor/Editor";
import { getDict } from "@/lib/i18n";
import { liveUrl, slugFor } from "@/lib/sites/publish";
import { getStore } from "@/lib/storage";
import { describeChanges, describeContentChanges, describeCodeChanges, describeFormChanges, describeCanvasChanges } from "@/lib/sites/edit-review";
import { codeBlocks } from "@/lib/sites/code";
import { currentIdentity } from "@/lib/auth/session";
import { requirementsState } from "@/lib/requirements/state";
import { searchFingerprint } from "@/lib/search/analyse";
import { searchPublicUrl } from "@/lib/search/probe";
import { worksFingerprint } from "@/lib/checks/analyse";
import { hasEnquiryForm } from "@/lib/enquiries/forms";

// Редактор сайта: своя рабочая рамка (без шапки главной), чат, история, факты и живое превью.
export default function SitePage({ params }: PageProps<"/sites/[id]">) {
  return (
    <Suspense fallback={<div className="h-dvh animate-pulse bg-bg" />}>
      <EditorLoader params={params} />
    </Suspense>
  );
}

async function EditorLoader({ params }: { params: PageProps<"/sites/[id]">["params"] }) {
  const { id } = await params;
  const store = await getStore();
  const site = await store.getSite(id).catch(() => null);
  if (!site) notFound();
  const [versions, { locale, t }, slug, pending] = await Promise.all([store.listVersions(id), getDict(), slugFor(site), store.getPendingEdit(id)]);
  const current = versions.find((v) => v.n === site.currentVersion);
  const base = pending && versions.find((v) => v.n === pending.baseVersion);
  const identity = await currentIdentity();
  const guest = !!identity?.guest;

  const published = site.published && versions.find(v => v.n === site.published!.version);
  const searchUrl = searchPublicUrl(slug).href;
  // В браузер отдаём только то, что нужно экрану, без полных документов версий.
  const data: EditorData = {
    draftOwner: !guest ? identity?.id : undefined,
    canvasBlocks: !guest&&current?canvasBlocks(current.doc).map(b=>({id:b.id,index:b.index,title:b.canvas.title})):[],
    guest,
    content: !guest && current ? contentSections(current.doc) : [],
    imagePlan: !guest && current ? imageGuidance(current.doc) : [],
    domain: guest ? {configured:false,published:!!site.published,connection:null} : await domainService(async()=>site).state(),
    requirements: await requirementsState(store,site),
    search: {draft: current ? searchFingerprint(site,current,"draft",searchUrl) : "", published: published ? searchFingerprint(site,published,"published",searchUrl) : null, reports: await store.listSearchReports(id,10)},
    works: {version: site.currentVersion, fingerprint: current ? worksFingerprint(site,current) : "", reports: await store.listWorksReports(id,10)},
    enquiries: { enabled: !!current && hasEnquiryForm(current.doc), recipient: site.enquiryRecipient?.email ?? null, confirmed: !!site.enquiryRecipient?.confirmedAt, records: guest ? [] : await store.listEnquiries(id, 5), notifications: guest ? undefined : await notificationSettingsView(site) },
    siteId: site.id,
    name: site.name,
    slug,
    liveUrl: liveUrl(slug),
    published: site.published ? { version: site.published.version } : null,
    currentVersion: site.currentVersion,
    locale,
    versions: versions.map((v) => ({ n: v.n, createdAt: v.createdAt, action: v.action, request: v.request, reply: v.reply, usage: v.usage, demo: v.demo, aiUsage:v.aiUsage })),
    facts: (current?.doc.factsToConfirm ?? []).map((f) => ({ ...f, status: site.facts[f.fact] ?? "unconfirmed" })),
    codeBlocks: current ? codeBlocks(current.doc) : [],
    sections: current?.doc.sections.map((s, index) => ({ index, composition: s.composition })) ?? [],
    pendingEdit: pending && base ? { status: "review", id: pending.id, baseVersion: pending.baseVersion, changes: (pending.version.action === "canvas" ? describeCanvasChanges : pending.version.action === "manual" ? describeContentChanges : pending.version.action === "code" ? describeCodeChanges : pending.version.action === "form" ? describeFormChanges : describeChanges)(base.doc, pending.version.doc, locale), reply: pending.version.reply, receipt:pending.version.aiUsage } : null,
  };
  return <Editor data={data} t={{ ...t.editor, tools: t.tools, publishing: t.publishing, trial: t.trial, enquiries: t.enquiries }} />;
}
