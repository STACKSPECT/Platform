import { useState } from "react";
import { useFailureBreakdown, useRuns } from "@/api/hooks";
import { configured } from "@/lib/supabase";
import {
  DEFAULT_FILTERS, applyFilters, filterOptions, type RunFilters,
} from "../../organisms/FilterBar";
import {
  defaultSelection, pairOf, toggleSelection,
} from "./RunsScreen.helper";

/** Cuántos runs se piden. La lista se filtra en la vista, así que se trae entera. */
const RUN_LIMIT = 200;

/** Une los datos de Ejecuciones y el estado de la pantalla (filtros y selección). */
export function useRunsScreen() {
  const query = useRuns(RUN_LIMIT);
  const runs = query.data ?? [];

  const [filters, setFilters] = useState<RunFilters>(DEFAULT_FILTERS);
  // `null` = el usuario no ha tocado la selección: valen las dos primeras filas. Así el
  // valor por defecto no necesita un efecto que espere a que lleguen los datos.
  const [chosen, setChosen] = useState<string[] | null>(null);
  const selectedIds = chosen ?? defaultSelection(runs);

  const pair = pairOf(runs, selectedIds);
  const failuresA = useFailureBreakdown(pair?.[0].id);
  const failuresB = useFailureBreakdown(pair?.[1].id);

  const state = !configured ? "unconfigured" as const
    : query.isPending ? "loading" as const
    : query.isError ? "error" as const
    : runs.length === 0 ? "empty" as const
    : "ready" as const;

  return {
    state,
    error: query.error?.message,
    retry: () => { void query.refetch(); },
    filters,
    options: filterOptions(runs),
    visibleRuns: applyFilters(runs, filters),
    selectedIds,
    comparePair: pair && {
      runs: pair,
      failures: { [pair[0].id]: failuresA.data, [pair[1].id]: failuresB.data },
    },
    onFilter: (patch: Partial<RunFilters>) => setFilters((f) => ({ ...f, ...patch })),
    onToggle: (id: string) => setChosen(toggleSelection(selectedIds, id)),
    onClear: () => setChosen([]),
  };
}
