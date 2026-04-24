import { useSyncExternalStore } from "react";

// SSR-safe media-query subscription. Used to pick a layout branch
// once per render at the top of the tree, never inside individual
// components (per the spec: "one hard swap at 768px").
export function useMediaQuery(query: string): boolean {
  const subscribe = (cb: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
  };
  const get = () => window.matchMedia(query).matches;
  const getServer = () => false;
  return useSyncExternalStore(subscribe, get, getServer);
}

export function useIsMobile(): boolean {
  // Phones only — tablets and desktop keep the existing layout.
  return useMediaQuery("(max-width: 767.98px)");
}
