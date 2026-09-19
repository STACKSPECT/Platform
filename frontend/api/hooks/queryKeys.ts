/* Fábrica de claves. Una sola fuente para que invalidar `queryKeys.runs.all` alcance
   a todo lo que cuelga de runs, y para que dos hooks no inventen la misma clave distinta. */

export const queryKeys = {
  totals: {
    runs: ["totals", "runs"] as const,
    episodes: ["totals", "episodes"] as const,
  },
  runs: {
    all: ["runs"] as const,
    list: (limit: number) => ["runs", "list", limit] as const,
    detail: (id: string) => ["runs", "detail", id] as const,
    failures: (id: string) => ["runs", "detail", id, "failures"] as const,
  },
  episodes: {
    all: ["episodes"] as const,
    byRun: (runId: string) => ["episodes", "run", runId] as const,
    detail: (runId: string, seed: number) => ["episodes", "run", runId, seed] as const,
    latest: ["episodes", "latest"] as const,
    placements: (id: string) => ["episodes", id, "placements"] as const,
    states: (id: string) => ["episodes", id, "pallet-states"] as const,
    events: (id: string) => ["episodes", id, "events"] as const,
  },
};
