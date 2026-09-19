import type { Run } from "@/lib/supabase";
import { TASK_TEXT, pct, relativeTime, seconds } from "@/lib/ui";

/** Por debajo de esto, un run tiene pocos episodios y la barra se queda corta: se dice
 *  cuántos son para que no parezca un dibujo roto. */
export const FEW_EPISODES = 20;

/** Umbrales de color de la tasa de éxito. No vienen de una regla del dominio: se dedujeron
 *  del tablero (64/71/88 verde, 41/44/52 ámbar, 16/30 rojo). Aquí, para moverlos fácil. */
const OK_FROM = 0.6;
const WARN_FROM = 0.35;

export type SuccessTone = "ok" | "warn" | "bad" | "muted";

export function successTone(rate: number | null): SuccessTone {
  if (rate == null) return "muted";
  return rate >= OK_FROM ? "ok" : rate >= WARN_FROM ? "warn" : "bad";
}

export type RunRowView = {
  id: string;
  commit: string;
  task: string;
  level: number;
  speed: string;
  episodes: number;
  success: { text: string; tone: SuccessTone };
  spark: { ratios: number[]; tone: "ok" | "warn" | "bad"; label: string };
  fewLabel: string | null;
  cycle: string;
  failure: string | null;
  when: string;
  flag: "oracle" | "synthetic" | null;
  state: "selected" | "oracle" | "synthetic" | undefined;
};

/** Una fila ya formateada. La selección manda sobre la marca de oracle/sembrado: es lo
 *  que el usuario está haciendo ahora. */
export function toRunRowView(run: Run, selected: boolean): RunRowView {
  const tone = successTone(run.success_rate);
  const series = run.seed_series ?? [];
  return {
    id: run.id,
    commit: run.git_sha || "—",
    task: TASK_TEXT[run.task] ?? run.task,
    level: run.level,
    speed: `x${run.motion_speed}`,
    episodes: run.episodes,
    success: { text: pct(run.success_rate), tone },
    spark: {
      ratios: series.map((p) => (p.objects ? p.placed / p.objects : 0)),
      tone: tone === "muted" ? "warn" : tone,
      label: `Éxito por episodio, ${series.length} episodios en orden de semilla`,
    },
    fewLabel: run.episodes < FEW_EPISODES ? `${run.episodes} episodios` : null,
    cycle: seconds(run.median_cycle_s),
    failure: run.dominant_failure,
    when: relativeTime(run.started_at),
    flag: run.oracle ? "oracle" : run.synthetic ? "synthetic" : null,
    state: selected ? "selected" : run.oracle ? "oracle" : run.synthetic ? "synthetic" : undefined,
  };
}
