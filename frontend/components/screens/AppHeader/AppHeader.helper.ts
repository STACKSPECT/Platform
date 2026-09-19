import { routes } from "@/lib/routes";

export type Tab = "dashboard" | "live" | "runs";

/** Qué pestaña está activa según la ruta: Ejecuciones y todo lo que cuelga de /runs, Live en su
 *  ruta y, en cualquier otra (la principal), el resumen. */
export function activeTab(path: string | null): Tab {
  if (path?.startsWith(routes.runs)) return "runs";
  if (path?.startsWith(routes.live)) return "live";
  return "dashboard";
}
