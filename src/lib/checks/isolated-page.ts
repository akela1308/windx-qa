export function inspectHtml<T>(html: string, width: number, inspect: (doc: Document) => T): Promise<T> {
  return new Promise((resolve,reject) => {
    const frame = document.createElement("iframe");
    frame.title = `WINDX layout check ${width}px`;
    frame.setAttribute("aria-hidden","true"); frame.tabIndex = -1; frame.referrerPolicy = "no-referrer";
    // Скрипты и вложенные виджеты не запускаются. Существующие шрифты разрешены;
    // ссылки и формы никто не нажимает. iframe не получает полномочий кабинета.
    frame.setAttribute("sandbox","allow-same-origin");
    frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${width}px;height:844px;border:0;pointer-events:none`;
    const policy = "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:; frame-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'";
    // CSP должен действовать и для HTML с <HEAD>, атрибутами head или без head.
    const safe = `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer">${html.replace(/^\s*<!doctype[^>]*>/i, "")}`;
    const timeout = setTimeout(() => { frame.remove(); reject(new Error("Check timed out")); },15000);
    frame.onload = async () => {
      try {
        const doc = frame.contentDocument; if (!doc) throw new Error("Preview unavailable");
        await Promise.race([doc.fonts.ready,new Promise(r=>setTimeout(r,3500))]);
        const result = inspect(doc); clearTimeout(timeout);frame.remove();resolve(result);
      } catch (e) { clearTimeout(timeout);frame.remove();reject(e); }
    };
    frame.srcdoc = safe; document.body.append(frame);
  });
}
