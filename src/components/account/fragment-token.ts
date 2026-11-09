"use client";
import { useSyncExternalStore } from "react";
// Fragment существует только в браузере. Внешнее состояние читается после
// гидратации и сохраняется в памяти формы, пока адрес очищается от секрета.
let snapshot: string | null = null;
let pathname = "";
let subscribers = 0;
let cleanup: ReturnType<typeof setTimeout> | undefined;
function subscribe(notify: () => void) {
  clearTimeout(cleanup);
  subscribers++;
  const read = () => {
    if (pathname !== location.pathname || location.hash) {
      const raw = location.hash.length <= 160 ? new URLSearchParams(location.hash.slice(1)).get("token") ?? "" : "";
      snapshot = /^[a-f0-9]{64}$/.test(raw) ? raw : "";
      pathname = location.pathname;
    }
    if (snapshot === null) snapshot = "";
    history.replaceState(history.state, "", location.pathname);
    notify();
  };
  read();
  window.addEventListener("hashchange", read);
  return () => {
    window.removeEventListener("hashchange", read);
    subscribers--;
    cleanup = setTimeout(() => { if (!subscribers) { snapshot = null; pathname = ""; } }, 0);
  };
}
export function useFragmentToken() {
  return useSyncExternalStore(subscribe, () => snapshot, () => null);
}
