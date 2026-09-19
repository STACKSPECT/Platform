import { useState } from "react";
import { useRuns } from "@/api/hooks";
import { configured } from "@/lib/supabase";
import type { DataKind } from "../../organisms/LevelCard";
import {
  KIND_ORDER, RUN_LIMIT, buildDashboard, defaultKind, kindCounts,
} from "./DashboardScreen.helper";

/** Une los datos del resumen y la clase de datos elegida en un solo modelo. Aquí no se dibuja
 *  nada. Comparte consulta con Ejecuciones (mismo límite, misma clave): no pide dos veces. */
export function useDashboardScreen() {
  const query = useRuns(RUN_LIMIT);
  const runs = query.data ?? [];

  // `null` = no ha elegido: se enseña lo medido y, si no hay, lo primero que haya.
  const [chosen, setChosen] = useState<DataKind | null>(null);
  const counts = kindCounts(runs);
  const kind = chosen ?? defaultKind(counts);

  const state = !configured ? "unconfigured" as const
    : query.isPending ? "loading" as const
    : query.isError ? "error" as const
    : runs.length === 0 ? "empty" as const
    : "ready" as const;

  return {
    state,
    error: query.error?.message,
    retry: () => { void query.refetch(); },
    kind,
    options: KIND_ORDER.map((k) => ({ k, count: counts[k] })),
    sections: buildDashboard(runs, kind),
    totalRuns: runs.length,
    // El selector devuelve un texto: solo vale si es una de las clases que existen.
    onKind: (value: string) => {
      const next = KIND_ORDER.find((k) => k === value);
      if (next) setChosen(next);
    },
  };
}
