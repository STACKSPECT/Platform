import type { Run } from "@/lib/supabase";
import { TASK_TEXT } from "@/lib/ui";
import type { SelectOption } from "../../atoms";

/** Valor del selector para «sin filtrar». */
export const ALL = "all";

export type RunFilters = {
  task: string;
  level: string;
  commit: string;
  speed: string;
  hideOracle: boolean;
};

export type FilterOptions = {
  task: SelectOption[];
  level: SelectOption[];
  commit: SelectOption[];
  speed: SelectOption[];
};

export const DEFAULT_FILTERS: RunFilters = {
  task: ALL, level: ALL, commit: ALL, speed: ALL, hideOracle: false,
};

/** Filtrar es una decisión de vista sobre lo ya cargado: no agrega ni recalcula nada. */
export function applyFilters(runs: Run[], f: RunFilters): Run[] {
  return runs.filter((r) =>
    (f.task === ALL || r.task === f.task) &&
    (f.level === ALL || String(r.level) === f.level) &&
    (f.commit === ALL || r.git_sha === f.commit) &&
    (f.speed === ALL || String(r.motion_speed) === f.speed) &&
    !(f.hideOracle && r.oracle));
}

function distinct<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/** Las opciones salen de los valores que de verdad hay: un filtro nunca ofrece algo que
 *  dejaría la tabla vacía. Los commits, en el orden en que aparecen (los recientes primero). */
export function filterOptions(runs: Run[]): FilterOptions {
  const numeric = (a: number, b: number) => a - b;
  return {
    task: [{ value: ALL, label: "todas" },
      ...distinct(runs.map((r) => r.task))
        .map((t) => ({ value: t, label: TASK_TEXT[t] ?? t }))],
    level: [{ value: ALL, label: "todos" },
      ...distinct(runs.map((r) => r.level)).sort(numeric)
        .map((l) => ({ value: String(l), label: String(l) }))],
    commit: [{ value: ALL, label: "todos" },
      ...distinct(runs.map((r) => r.git_sha))
        .map((c) => ({ value: c, label: c || "sin commit" }))],
    speed: [{ value: ALL, label: "todas" },
      ...distinct(runs.map((r) => r.motion_speed)).sort(numeric)
        .map((v) => ({ value: String(v), label: `x${v}` }))],
  };
}

export function selectionText(count: number): string {
  if (count === 0) return "ninguna seleccionada";
  return count === 1 ? "1 seleccionada para comparar" : `${count} seleccionadas para comparar`;
}
