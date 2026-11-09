"use client";

import { useEffect, useState, type ComponentProps, type RefObject } from "react";
import { loadPreviewHtml, PREVIEW_ANCHORS } from "@/lib/sites/preview-html";

// Fetch the authorized HTML before creating its browsing context. srcDoc avoids
// the initial iframe navigation that can be lost during streaming/hydration.
export function PreviewFrame({ frameRef, src, onError, ...props }: Omit<ComponentProps<"iframe">, "src" | "srcDoc"> & {
  src: string;
  frameRef: RefObject<HTMLIFrameElement | null>;
  onError: () => void;
}) {
  const [page, setPage] = useState<{ source: string; html: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    loadPreviewHtml(src, controller.signal).then(html => {
      if (controller.signal.aborted) return;
      const doc = new DOMParser().parseFromString(html, "text/html");
      // Resources and modified link clicks use the original preview URL.
      // Ordinary fragment clicks scroll without navigating away from srcDoc.
      const base = doc.createElement("base");
      base.href = new URL(src, location.href).href;
      doc.head.prepend(base);
      const anchors = doc.createElement("script");
      anchors.textContent = PREVIEW_ANCHORS;
      doc.body.append(anchors);
      setPage({ source: src, html: `<!doctype html>${doc.documentElement.outerHTML}` });
    }).catch(() => { if (!controller.signal.aborted) onError(); });
    return () => controller.abort();
  }, [src, onError]);
  return page?.source === src ? <iframe ref={frameRef} {...props} srcDoc={page.html} loading="eager" /> : null;
}
