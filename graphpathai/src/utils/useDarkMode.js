import { useSyncExternalStore } from "react";

const QUERY = "(prefers-color-scheme: dark)";

const supported = typeof window !== "undefined" && typeof window.matchMedia === "function";

function subscribe(callback) {
  if (!supported) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

const getSnapshot = () => (supported ? window.matchMedia(QUERY).matches : false);

/**
 * Tracks the OS colour-scheme preference.
 *
 * `useSyncExternalStore` avoids the previous version's unguarded
 * `window.matchMedia` call during render, which threw in any non-browser
 * environment (SSR, jsdom without matchMedia).
 */
export default function useDarkMode() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
