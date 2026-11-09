import { NextResponse, type NextRequest } from "next/server";
import { cabinetHost, requestHostname } from "@/lib/domains/hostname";
import { publicDomain } from "@/lib/domains/public";
import { slugFor } from "@/lib/sites/publish";

// 1. Сайты клиентов: адрес <slug>.windx.app (локально <slug>.localhost) ведёт на опубликованный сайт.
//    www и сам домен остаются кабинетом.
// 2. Временная защита демо-кабинета общим паролем: включается, только если задана WINDX_DEMO_PASSWORD.
//    Сайтов клиентов пароль не касается.

const SITES_DOMAIN = process.env.WINDX_SITES_DOMAIN ?? "windx.app";

function siteSlug(host: string): string | null {
  const name = host.split(":")[0].toLowerCase();
  for (const root of [SITES_DOMAIN, "localhost"]) {
    if (name.endsWith(`.${root}`)) {
      const sub = name.slice(0, -root.length - 1);
      if (sub && sub !== "www" && !sub.includes(".")) return sub;
    }
  }
  return null;
}

export async function proxy(request: NextRequest) {
  // Перезаписываем входящий заголовок: доверяем Host, а не значению клиента.
  // Внутренний rewrite Next.js заменяет Host адресом сервера.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-windx-custom-site");
  requestHeaders.set("x-windx-request-host", request.headers.get("host") ?? "");
  const next = () => {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    if (/^\/(?:forgot-password|reset-password|verify-email)(?:\/|$)/.test(request.nextUrl.pathname)) {
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
      response.headers.set("X-Frame-Options", "DENY");
    }
    return response;
  };

  // Оптимизатор Next.js читает public-картинки внутренним запросом без Host.
  // Разрешаем только эти статические файлы, до проверки доменов и кабинета.
  if (
    /^\/(?:showcase\/[a-z0-9-]+\.jpg|brands\/google-g\.png)$/.test(
      request.nextUrl.pathname,
    )
  ) {
    return next();
  }
  const slug = siteSlug(request.headers.get("host") ?? "");
  if (slug) {
    if (/^\/media\/[a-z0-9-]{1,80}\/[a-f0-9-]{36}\.webp$/.test(request.nextUrl.pathname))
      return next();
    // На поддомене доступны главная и приём заявки; кабинет остаётся закрыт.
    const url = new URL(request.url);
    url.pathname =
      request.nextUrl.pathname === "/"
        ? `/live/${slug}`
        : request.nextUrl.pathname === "/_enquiry"
          ? `/live/${slug}/enquiry`
          : "/live/-missing-";
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  const host = requestHostname(request.headers.get("host") ?? "");
  if (!host || !cabinetHost(host)) {
    const { binding, unavailable } = host
      ? await publicDomain(host)
      : { binding: null, unavailable: false };
    const path = request.nextUrl.pathname;
    const challenge = path === "/.well-known/windx-domain-check";
    const media = !!binding && new RegExp(`^/media/${binding.site.id}/[a-f0-9-]{36}\\.webp$`).test(path);
    if (
      !binding ||
      (!challenge &&
        (binding.connection.status !== "active" || !binding.site.published)) ||
      (!media && !["/", "/_enquiry", "/.well-known/windx-domain-check"].includes(path))
    )
      return new NextResponse("No site at this address yet.", {
        status: unavailable ? 503 : 404,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-Robots-Tag": "noindex",
        },
      });
    requestHeaders.set("x-windx-custom-site", binding.site.id);
    if (media) return next();
    const slug = await slugFor(binding.site),
      url = new URL(request.url);
    url.pathname = challenge
      ? "/domain-check"
      : path === "/_enquiry"
        ? `/live/${slug}/enquiry`
        : `/live/${slug}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // У закрытого стенда нет потокового HTML-ответа с кодом 200 от notFound().
  const labPath = request.nextUrl.pathname.replace(/\/$/, "");
  if (
    labPath === "/lab/free-editor" &&
    process.env.NODE_ENV === "production" &&
    process.env.WINDX_EDITOR_LAB !== "1"
  ) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  }

  const password = process.env.WINDX_DEMO_PASSWORD;
  if (!password)
    return next();

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    if (decoded.slice(decoded.indexOf(":") + 1) === password)
      return next();
  }
  return new NextResponse("Password required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="WINDX demo", charset="UTF-8"',
    },
  });
}

export const config = {
  // Служебные файлы Next.js (скрипты, стили) пропускаем.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
