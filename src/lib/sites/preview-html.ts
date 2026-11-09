// Reuse the owner/guest authorization of the existing preview endpoint. Failed
// requests must not become a successful empty document or an embedded login.
export async function loadPreviewHtml(source: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(source, { signal, credentials: "same-origin", cache: "no-store" });
  if (!response.ok || response.redirected || !response.headers.get("content-type")?.includes("text/html")) {
    throw new Error("Preview unavailable");
  }
  const html = await response.text();
  if (!html.trim()) throw new Error("Empty preview");
  return html;
}

// srcDoc has no ordinary page URL. Scroll locally on a normal fragment click;
// modified clicks can still open the original, authorized preview via its base.
export const PREVIEW_ANCHORS = `(()=>{document.addEventListener("click",e=>{
if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
const a=e.target.closest?.('a[href^="#"]');if(!a)return;
const hash=a.getAttribute("href");e.preventDefault();
if(hash==="#"){scrollTo(0,0);return;}
try{document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();}catch{}
});})();`;
