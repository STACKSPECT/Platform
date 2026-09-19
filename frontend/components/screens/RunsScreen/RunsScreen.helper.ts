import type { Run } from "@/lib/supabase";

/** Se comparan de dos en dos. */
export const MAX_SELECTED = 2;

/** Marca o desmarca. Con dos ya marcadas no se añade otra: hay que desmarcar antes. La
 *  interfaz bloquea esas casillas; esto es la red de seguridad si llega un clic igualmente. */
export function toggleSelection(selected: string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter((s) => s !== id);
  return selected.length >= MAX_SELECTED ? selected : [...selected, id];
}

/** La pareja a comparar, o `null` si no hay dos runs elegidos que existan. */
export function pairOf(runs: Run[], selected: string[]): [Run, Run] | null {
  const found = selected.map((id) => runs.find((r) => r.id === id));
  return found.length === MAX_SELECTED && found.every(Boolean) ? (found as [Run, Run]) : null;
}
