import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** La fuente de verdad es el atributo de <html>, que el script de la cabecera fija antes del
 *  primer pintado. Así React nunca disputa el tema con el CSS. */
function current(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** El tema actual y cómo cambiarlo. Recuerda la elección; sin elección, manda el sistema. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, current, () => "light" as Theme);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch { /* sin almacenamiento: vale para esta visita */ }
    listeners.forEach((l) => l());
  }, []);

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
