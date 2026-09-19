import type { Episode, RunEvent } from "@/lib/supabase";
import { TASK_TEXT, seconds, splitQuantity } from "@/lib/ui";
import type { DotTone } from "../../atoms";

/** Todo lo que pinta la barra, ya resuelto. IdentityBar no sabe qué es un Episode. */
export type IdentityView = {
  status: { label: string; tone: DotTone; pulse: boolean };
  meta: Array<{ label: string; value: string | number; mono: boolean }>;
  oracle: boolean;
  synthetic: boolean;
  /** «3 / 25», o null si no se conocen los episodios del run. */
  counter: string | null;
  clock: { value: string; unit: string };
};

/** `live`: se mira el episodio que corre ahora (o que acaba de terminar). `run`: se mira un episodio
 *  concreto de una ejecución ya hecha, y el estado dice cómo acabó. */
export type IdentityMode = "live" | "run";

function statusOf(
  episode: Episode, stale: boolean, mode: IdentityMode,
): IdentityView["status"] {
  if (stale) return { label: "Sin datos nuevos", tone: "warn", pulse: false };
  if (mode === "run") {
    if (episode.status === "running") return { label: "En curso", tone: "light", pulse: false };
    return episode.status === "success"
      ? { label: "Completado", tone: "ok", pulse: false }
      : { label: "Fallo", tone: "bad", pulse: false };
  }
  if (episode.status === "running") return { label: "En vivo", tone: "light", pulse: true };
  // En Live solo se ve algo que ya no corre durante el margen posterior a terminar.
  return { label: "Terminado", tone: episode.status === "success" ? "ok" : "bad", pulse: false };
}

/** Posición del episodio dentro de su run, por semilla. Las cuentas salen de la lista
 *  que ya devuelve el endpoint; no se agrega nada. */
export function episodeCounter(episode: Episode, runEpisodes: Episode[]): string | null {
  const index = runEpisodes.findIndex((e) => e.id === episode.id);
  return index < 0 ? null : `${index + 1} / ${runEpisodes.length}`;
}

/** `duration_s` es null mientras el episodio corre: entonces manda el último evento. */
export function elapsedSeconds(episode: Episode, events: RunEvent[]): number {
  if (episode.duration_s != null) return episode.duration_s;
  return events.reduce((t, e) => Math.max(t, e.ts), 0);
}

export function buildIdentity(input: {
  episode: Episode; runEpisodes: Episode[]; events: RunEvent[]; stale: boolean;
  mode?: IdentityMode;
}): IdentityView {
  const { episode, runEpisodes, events, stale, mode = "live" } = input;
  return {
    status: statusOf(episode, stale, mode),
    meta: [
      { label: "Tarea", value: TASK_TEXT[episode.task] ?? episode.task, mono: false },
      { label: "Nivel", value: episode.level, mono: true },
      // En el detalle de una ejecución la semilla ya la dice el selector de episodio.
      ...(mode === "run" ? [] : [{ label: "Semilla", value: episode.seed, mono: true }]),
      { label: "Commit", value: episode.git_sha || "—", mono: true },
      { label: "Velocidad", value: `x${episode.motion_speed}`, mono: true },
    ],
    oracle: episode.oracle,
    synthetic: episode.synthetic,
    counter: episodeCounter(episode, runEpisodes),
    clock: splitQuantity(seconds(elapsedSeconds(episode, events))),
  };
}
