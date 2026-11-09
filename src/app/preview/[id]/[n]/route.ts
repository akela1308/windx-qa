import { renderDoc } from "@/lib/design/render";
import { getStore } from "@/lib/storage";

// Готовая HTML-страница сайта конкретной версии. Показывается в редакторе внутри iframe.
// С ?edit=1 (только в редакторе) добавляется скрипт выбора блока: редактор включает режим
// сообщением, блок под курсором подсвечивается, клик сообщает редактору номер блока.
export async function GET(req: Request, ctx: RouteContext<"/preview/[id]/[n]">) {
  const { id, n } = await ctx.params;
  const version = await (await getStore()).getVersion(id, Number(n)).catch(() => null);
  if (!version) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  let html = renderDoc(version.doc);
  const params = new URL(req.url).searchParams;
  // Карточка открывает редактор, а не взаимодействует с вложенной страницей.
  // Убираем ложную подсказку прокрутки только в миниатюре, не в полном превью.
  if (params.get("thumbnail") === "1") html = html.replace("</head>", "<style>html,body{overflow:hidden!important;scrollbar-width:none!important}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none!important}</style></head>");
  else if (params.get("edit") === "1") html = html.replace("</body>", `${PICKER}</body>`);
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

// window.origin сохраняет унаследованный origin srcDoc; location.origin для
// about:srcdoc равен "null". Проверка отправителя и точного origin сохраняется.
const PICKER = `<style>[data-windx-hover]{outline:3px solid #25d366!important;outline-offset:-3px;cursor:pointer}[data-windx-picked]{outline:3px solid #128c7e!important;outline-offset:-3px}[data-windx-selecting] .wc-frame{pointer-events:none}</style>
<script>(()=>{let on=false,hov=null;const secs=()=>[...document.querySelectorAll("[data-section]")];
const unhover=()=>{hov&&hov.removeAttribute("data-windx-hover");hov=null};
addEventListener("message",e=>{if(e.source!==parent||e.origin!==window.origin)return;const d=e.data||{};if(d.windx==="mode"){on=!!d.on;document.documentElement.toggleAttribute("data-windx-selecting",on);if(!on)unhover()}
if(d.windx==="picked")secs().forEach((s,i)=>i===d.index?s.setAttribute("data-windx-picked",""):s.removeAttribute("data-windx-picked"))});
document.addEventListener("mouseover",e=>{if(!on)return;const s=e.target.closest("[data-section]");if(s===hov)return;unhover();hov=s;s&&s.setAttribute("data-windx-hover","")},true);
document.addEventListener("click",e=>{if(!on)return;const s=e.target.closest("[data-section]");if(!s)return;e.preventDefault();e.stopPropagation();unhover();
parent.postMessage({windx:"pick",index:secs().indexOf(s),composition:s.dataset.section},window.origin)},true);
parent.postMessage({windx:"ready"},window.origin)})();</script>`;
