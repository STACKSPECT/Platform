import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFailureBreakdown, useRuns } from "@/api/hooks";
import { configured } from "@/lib/supabase";
import { routes } from "@/lib/routes";
import {
  DEFAULT_FILTERS, applyFilters, filterOptions, type RunFilters,
} from "../../organisms/FilterBar";
import { MAX_SELECTED, pairOf, toggleSelection } from "./RunsScreen.helper";

/** Cuántos runs se piden. La lista se filtra en la vista, así que se trae entera. */
const RUN_LIMIT = 200;

/** Une los datos de Ejecuciones y el estado de la pantalla (filtros y selección). */
export function useRunsScreen() {
  const router = useRouter();
  const query = useRuns(RUN_LIMIT);
  const runs = query.data ?? [];

  const [filters, setFilters] = useState<RunFilters>(DEFAULT_FILTERS);
  // Se compara solo lo que el usuario pide: al entrar no hay nada marcado.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
    selectionFull: selectedIds.length >= MAX_SELECTED,
    comparePair: pair && {
      runs: pair,
      failures: { [pair[0].id]: failuresA.data, [pair[1].id]: failuresB.data },
    },
    onFilter: (patch: Partial<RunFilters>) => setFilters((f) => ({ ...f, ...patch })),
    onToggle: (id: string) => setSelectedIds((prev) => toggleSelection(prev, id)),
    onClear: () => setSelectedIds([]),
    hrefFor: routes.run,
    onOpen: (id: string) => router.push(routes.run(id)),
  };
}
