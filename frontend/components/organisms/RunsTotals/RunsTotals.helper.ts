const NBSP = " ";

/** «1 198»: separador de miles con espacio duro, como en el diseño. */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US").replace(/,/g, NBSP);
}

export function pluralize(n: number, one: string, many: string): string {
  return `${formatCount(n)}${NBSP}${n === 1 ? one : many}`;
}

/** «54 ejecuciones · 833 episodios»; lo que aún no ha llegado se omite. */
export function totalsText(runs: number | undefined, episodes: number | undefined): string {
  return [
    runs == null ? null : pluralize(runs, "ejecución", "ejecuciones"),
    episodes == null ? null : pluralize(episodes, "episodio", "episodios"),
  ].filter(Boolean).join(" · ");
}
