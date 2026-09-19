import type { Run } from "@/lib/supabase";
import { pct, relativeTime } from "@/lib/ui";

export type RunHeaderView = {
  /** El commit, que es como se nombra una ejecución en toda la interfaz. */
  title: string;
  /** La nota a mano del que la lanzó, si la hay: lo que convierte una lista de commits en
   *  una historia. */
  note: string | null;
  /** «25 episodios · 64 % de éxito · hace 2 h». */
  meta: string;
};

export function buildRunHeader(run: Run): RunHeaderView {
  return {
    title: run.git_sha || run.label || "Ejecución",
    note: run.description || (run.git_sha ? run.label : null) || null,
    meta: [
      `${run.episodes} ${run.episodes === 1 ? "episodio" : "episodios"}`,
      `${pct(run.success_rate)} de éxito`,
      relativeTime(run.started_at),
    ].join(" · "),
  };
}
