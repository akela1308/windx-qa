import Link from "next/link";
import { freeCopy } from "@/lib/free-editor/copy";
import type { EditorData } from "./Editor";
export function CanvasPanel({
  data,
  selectedIndex,
}: {
  data: EditorData;
  selectedIndex?: number;
}) {
  const c = freeCopy(data.locale);
  return (
    <div className="p-4 text-sm">
      <h2 className="font-display text-lg font-bold">{c.tab}</h2>
      <p className="mt-3 leading-relaxed text-muted">{c.intro}</p>
      <Link
        className="mt-4 inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2"
        href={`/sites/${data.siteId}/canvas`}
      >
        {c.add}
      </Link>
      {data.canvasBlocks.length ? (
        <ul className="mt-5 space-y-3">
          {data.canvasBlocks.map((b) => (
            <li
              key={b.id}
              className={`rounded-xl border p-3 ${b.index === selectedIndex ? "border-ink" : "border-line"}`}
            >
              <p className="font-medium">{b.title}</p>
              <Link
                className="mt-2 inline-flex min-h-11 items-center underline underline-offset-4"
                href={`/sites/${data.siteId}/canvas?section=${b.id}`}
              >
                {c.open}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-muted">{c.noBlocks}</p>
      )}
    </div>
  );
}
