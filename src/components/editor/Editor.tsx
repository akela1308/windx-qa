"use client";

import { textDraftCopy } from "@/lib/editor-drafts/text-copy";
import { draftCopy } from "@/lib/editor-drafts/copy";
import { ContentPanel } from "./ContentPanel";
import { CanvasPanel } from "./CanvasPanel";
import { freeCopy } from "@/lib/free-editor/copy";
import { contentCopy } from "@/lib/content/copy";
import type { ContentSection } from "@/lib/content/fields";
import {DomainPanel} from "./DomainPanel";
import {domainCopy} from "@/lib/domains/copy";
import type {DomainClientState} from "@/lib/domains/types";
import { useState } from "react";
import type { Dict } from "@/lib/i18n/en";
import type { FactStatus, SiteVersion } from "@/lib/storage/types";
import { ChatPanel } from "./ChatPanel";
import { FactsPanel } from "./FactsPanel";
import { HistoryPanel } from "./HistoryPanel";
import { Preview } from "./Preview";
import { TopBar } from "./TopBar";
import type { EditChange } from "@/lib/sites/edit-review";
import type { CodeBlock } from "@/lib/sites/code";
import { CodePanel } from "./CodePanel";
import { TrialPanel } from "./TrialPanel";
import { EnquiriesPanel } from "./EnquiriesPanel";
import type { RequirementsCheckState } from "@/lib/requirements/types";
import { RequirementsPanel } from "./RequirementsPanel";
import { requirementsCopy } from "@/lib/requirements/copy";
import type { SearchCheckState } from "@/lib/search/types";
import { SearchPanel } from "./SearchPanel";
import { searchCopy } from "@/lib/search/copy";
import type { WorksCheckState } from "@/lib/checks/types";
import { WorksPanel } from "./WorksPanel";
import { worksCopy } from "@/lib/checks/copy";
import type { Enquiry } from "@/lib/enquiries/types";

export type VersionInfo = Omit<SiteVersion, "doc">;
export type FactInfo = { fact: string; where: string; status: FactStatus };
export type EditorData = {
  imagePlan?: import("@/lib/design/visual-plan").ImageGuidance[];
  draftOwner?: string;
  canvasBlocks: {id:string;index:number;title:string}[];
  content: ContentSection[];
  domain: DomainClientState;
  requirements: RequirementsCheckState;
  search: SearchCheckState;
  works: WorksCheckState;
  enquiries: { enabled: boolean; recipient: string | null; confirmed: boolean; records: Enquiry[]; notifications?: import("@/lib/enquiries/notification-settings").NotificationSettingsView };
  guest: boolean;
  siteId: string;
  name: string;
  slug: string;
  liveUrl: string; // адрес сайта в интернете (будущий, если ещё не опубликован)
  published: { version: number } | null;
  currentVersion: number;
  locale: string;
  versions: VersionInfo[];
  facts: FactInfo[];
  codeBlocks: CodeBlock[];
  sections: { index: number; composition: string }[];
  pendingEdit: { status: "review"; id: string; baseVersion: number; changes: EditChange[]; reply: string; receipt?:import("@/lib/ai/estimate-types").AiUsageReceipt } | null;
};
export type EditorT = Dict["editor"] & { tools: Dict["tools"]; publishing: Dict["publishing"]; trial: Dict["trial"]; enquiries: Dict["enquiries"] };
// Блок сайта, выбранный кликом на превью: номер раздела (с нуля) и его композиция.
export type Picked = { index: number; composition: string };
export type Device = "desktop" | "phone";

// Оценка AI показывается перед запуском. Внутренняя себестоимость не является тарифом клиента.
const TABS = ["chat", "content", "canvas", "code", "history", "facts", "enquiries", "works", "search", "requirements", "domain"] as const;
type Tab = (typeof TABS)[number];

export function Editor({ data, t }: { data: EditorData; t: EditorT }) {
  const [draftRequest, setDraftRequest] = useState("");
  const [tab, setTab] = useState<Tab>("chat");
  const [contentDirty, setContentDirty] = useState(false);
  const [codeDirty, setCodeDirty] = useState(false);
  const canLeave = () => !((tab === "content" && contentDirty) || (tab === "code" && codeDirty)) || window.confirm(tab === "code" ? draftCopy(data.locale).leave : textDraftCopy(data.locale).leave);
  const changeTab = (next: Tab) => {
    if (next === tab) return true;
    if (!canLeave()) return false;
    setTab(next);
    return true;
  };
  const [device, setDevice] = useState<Device>("desktop");
  const [selecting, setSelecting] = useState(false);
  const [chosen, setPicked] = useState<(Picked & { version: number }) | null>(null);
  const activeTab = data.guest && data.published ? "chat" : tab;
  // Выбор действует только для той версии, где блок выбрали: новая версия может поменять порядок блоков.
  const picked = chosen?.version === data.currentVersion ? chosen : null;
  const pick = (p: Picked) => {
    if (!canLeave()) return;
    setPicked({ ...p, version: data.currentVersion });
    setSelecting(false);
    setTab(p.composition === "free.canvas" ? "canvas" : p.composition === "embed.code" ? "code" : tab === "content" ? "content" : "chat");
  };
  const manual = (index?: number) => {
    setPicked(index !== undefined ? { index, composition: index < 0 ? "meta" : data.sections[index].composition, version: data.currentVersion } : null);
    setTab("content");
  };
  const open = data.facts.filter((f) => f.status === "unconfirmed").length;
  const openDetails = open + (data.enquiries.enabled && !data.enquiries.confirmed ? 1 : 0);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar onLeave={canLeave} data={data} t={t} device={device} setDevice={setDevice} openFacts={open} showFacts={() => changeTab("facts")} showWorks={() => changeTab("works")} showSearch={() => changeTab("search")} showRequirements={() => changeTab("requirements")} showDomain={() => changeTab("domain")} />
      {/* На телефоне сначала сам сайт, под ним панель; на компьютере панель слева. */}
      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[400px_1fr]">
        <aside className="order-2 flex min-h-0 flex-1 flex-col border-line bg-panel lg:order-1 lg:border-r">
          <div role="tablist" aria-label={data.name} className="flex flex-wrap gap-1 border-b border-line px-3 pt-2">
            {(data.guest ? ["chat", ...(!data.published ? ["facts", "works", "search", "requirements"] : [])] as Tab[] : TABS).map((k) => (
              <button
                key={k}
                id={`tab-${k}`}
                role="tab"
                aria-selected={activeTab === k}
                aria-controls={`panel-${k}`}
                onClick={() => changeTab(k)}
                className={`-mb-px whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2.5 text-sm transition-colors ${activeTab === k ? "border-ink font-medium text-ink" : "border-transparent text-muted hover:text-ink"}`}
              >
                {data.guest && k === "chat" ? t.trial.title : k === "content" ? contentCopy(data.locale).tab : k === "canvas" ? freeCopy(data.locale).tab : k === "enquiries" ? t.enquiries.title : k === "works" ? worksCopy(data.locale).title : k === "search" ? searchCopy(data.locale).tab : k === "requirements" ? requirementsCopy(data.locale).tab : k === "domain" ? domainCopy(data.locale).tab : t.tabs[k]}
                {k === "facts" && openDetails > 0 && <span className="ml-1.5 rounded-full bg-brand px-1.5 py-0.5 text-xs font-medium text-on-brand ring-1 ring-ink">{openDetails}</span>}
              </button>
            ))}
          </div>
          <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="min-h-0 flex-1 overflow-y-auto">
            {activeTab === "chat" && (data.guest ? <TrialPanel data={data} t={t} showFacts={() => changeTab("facts")} /> : <ChatPanel key={draftRequest} draftRequest={draftRequest} data={data} t={t} picked={picked} clearPicked={() => setPicked(null)} />)}
            {!data.guest && activeTab === "content" && <ContentPanel key={`${data.draftOwner}-${data.siteId}-${data.currentVersion}-${picked?.index ?? "default"}`} data={data} t={t} selectedIndex={picked?.index} onDirty={setContentDirty} />}
            {!data.guest && activeTab === "canvas" && <CanvasPanel data={data} selectedIndex={picked?.index}/>}
            {!data.guest && activeTab === "code" && <CodePanel key={`${data.draftOwner}-${data.siteId}-${data.currentVersion}-${picked?.index ?? "new"}`} data={data} t={t} selectedIndex={picked?.composition === "embed.code" ? picked.index : undefined} onDirty={setCodeDirty} />}
            {!data.guest && activeTab === "history" && <HistoryPanel data={data} t={t} />}
            {(!data.guest || !data.published) && <div hidden={activeTab !== "requirements"}><RequirementsPanel data={data} onFacts={() => setTab("facts")} onCode={() => setTab("code")} onFix={(text, section) => { setDraftRequest(text); setPicked(section !== undefined ? { ...data.sections[section], version: data.currentVersion } : null); setTab("chat"); }} /></div>}
            {(!data.guest || !data.published) && <div hidden={activeTab !== "search"}><SearchPanel onManual={manual} data={data} onFacts={() => setTab("facts")} onFix={(text, section) => { setDraftRequest(text); setPicked(section !== undefined ? { ...data.sections[section], version: data.currentVersion } : null); setTab("chat"); }} /></div>}
            {(!data.guest || !data.published) && <div hidden={activeTab !== "works"}><WorksPanel onManual={manual} data={data} onFacts={() => setTab("facts")} onCode={() => setTab("code")} onFix={(text, section) => { setDraftRequest(text); setPicked(section !== undefined ? { ...data.sections[section], version: data.currentVersion } : null); setTab("chat"); }} /></div>}
            {activeTab === "facts" && <FactsPanel data={data} t={t} onEdit={data.guest ? undefined : manual} />}
            {!data.guest && activeTab === "domain" && <DomainPanel key={JSON.stringify(data.domain)} data={data} />}
            {!data.guest && activeTab === "enquiries" && <EnquiriesPanel data={data} t={t} />}
          </div>
        </aside>
        <div className={(activeTab === "works" || activeTab === "search" || activeTab === "requirements" || activeTab === "domain") ? "hidden lg:contents" : "contents"}><Preview data={data} device={device} t={t} selecting={selecting} setSelecting={setSelecting} picked={picked} onPick={pick} onEdit={() => { if (changeTab("content")) setSelecting(true); }} /></div>
      </div>
    </div>
  );
}
