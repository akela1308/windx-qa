import Link from "next/link";
import type { EditorData, EditorT } from "./Editor";

export function TrialPanel({ data, t, showFacts }: { data: EditorData; t: EditorT; showFacts: () => void }) {
  const next = encodeURIComponent(`/sites/${data.siteId}`);
  return <div className="p-5">
    <h1 className="text-2xl font-semibold">{t.trial.title}</h1>
    <p className="mt-4 leading-relaxed text-muted">{data.published ? t.trial.live : t.trial.intro}</p>
    {!data.published && data.facts.length > 0 && <button onClick={showFacts} className="mt-5 text-sm underline underline-offset-4">{t.trial.facts}</button>}
    <Link href={`/login?mode=register&next=${next}`} className="mt-7 flex justify-center rounded-full bg-brand px-4 py-3 text-center text-sm font-medium text-on-brand ring-1 ring-ink">{t.trial.register}</Link>
    <Link href={`/login?next=${next}`} className="mt-4 block text-sm text-muted underline underline-offset-4">{t.trial.signIn}</Link>
    <p className="mt-6 text-sm leading-relaxed text-muted">{t.trial.browser}</p>
  </div>;
}
