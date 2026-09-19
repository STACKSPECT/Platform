/** Qué pestaña está activa según la ruta: Ejecuciones y todo lo que cuelga de /runs. */
export function activeTab(path: string | null): "live" | "runs" {
  return path?.startsWith("/runs") ? "runs" : "live";
}
