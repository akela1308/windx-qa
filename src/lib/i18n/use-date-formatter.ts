"use client";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

// Сервер и первый render гидратации совпадают независимо от часового пояса.
// После гидратации даты показываются в местном времени браузера.
export function useDateFormatter(locale: string, options: Intl.DateTimeFormatOptions) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    ...options,
    timeZone: options.timeZone ?? (hydrated ? undefined : "UTC"),
  });
}
