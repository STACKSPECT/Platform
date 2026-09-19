import type { Run } from "@/lib/supabase";

/** Se comparan de dos en dos. */
export const MAX_SELECTED = 2;

/** Lo que hay marcado mientras el usuario no ha tocado nada: las dos primeras filas. */
export function defaultSelection(runs: Run[]): string[] {
  return runs.slice(0, MAX_SELECTED).map((r) => r.id);
}

/** Marca o desmarca. Con más de dos, la nueva sustituye a la más antigua. */
export function toggleSelection(selected: string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter((s) => s !== id);
  return [...selected, id].slice(-MAX_SELECTED);
}

/** La pareja a comparar, o `null` si no hay dos runs elegidos que existan. */
export function pairOf(runs: Run[], selected: string[]): [Run, Run] | null {
  const found = selected.map((id) => runs.find((r) => r.id === id));
  return found.length === MAX_SELECTED && found.every(Boolean) ? (found as [Run, Run]) : null;
}
