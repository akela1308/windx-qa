import type { NextConfig } from "next";
import { CATALOGUE_ASSET_VERSION } from "./src/lib/showcase";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: { localPatterns: [
    { pathname: "/showcase/*.jpg", search: `?v=${CATALOGUE_ASSET_VERSION}` },
    { pathname: "/**", search: "" },
  ] },
  // Копия проекта содержит изображения. По умолчанию proxy обрезает тело на 10 МБ.
  // Обработчик восстановления дополнительно ограничивает поток и число операций.
  experimental: { proxyClientMaxBodySize: "64mb" },
  // Сохраняем origin внутреннего rewrite: нормализация 127.0.0.1/::1
  // в localhost иначе превращает его в повторный HTTP-запрос и теряет Host.
  skipProxyUrlNormalize: true,
  // Значок режима разработки мешает смотреть кабинет и скриншотам.
  devIndicators: false,
  partialPrefetching: true,
};

export default nextConfig;
