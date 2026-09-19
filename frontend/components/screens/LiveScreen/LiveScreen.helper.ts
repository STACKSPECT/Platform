import type { Episode, PalletState } from "@/lib/supabase";
import { clockTime, failureText, mm, seconds, signedMm } from "@/lib/ui";

/** Sin nada recibido durante este tiempo, con un episodio en curso, se da la conexión
 *  por perdida. Generoso a propósito: un aviso en falso durante la demo es peor que
 *  enterarse dos segundos más tarde. */
export const HEARTBEAT_MS = 8000;

/** Cada cuánto se busca un episodio nuevo. Realtime solo vigila el episodio que ya se
 *  está viendo, así que uno que empieza se descubre preguntando. */
export const LATEST_POLL_MS = 5000;

export function isStale(input: {
  running: boolean; fetchFailed: boolean; lastSignalAt: number; now: number;
}): boolean {
  const { running, fetchFailed, lastSignalAt, now } = input;
  return fetchFailed || (running && now - lastSignalAt > HEARTBEAT_MS);
}

export function staleDetail(lastSignalAt: number): string {
  return `lo que se ve es el último dato recibido · ${clockTime(new Date(lastSignalAt).toISOString())}`;
}

/** El último estado del palé por `after_seq`, no por orden de llegada. */
export function lastPalletState(states: PalletState[]): PalletState | null {
  return states.reduce<PalletState | null>(
    (last, s) => (!last || s.after_seq > last.after_seq ? s : last), null);
}

/** Nota de la cabecera del alzado, con lo que el endpoint da: «4 capas · 400 mm de carga». */
export function sideViewNote(episode: Episode, last: PalletState | null): string {
  return [
    episode.n_layers ? `${episode.n_layers} capas` : null,
    episode.load_height_m ? `${mm(episode.load_height_m, 0)} de carga` : null,
    last?.settle_drift_m ? `deriva ${mm(last.settle_drift_m, 0)}` : null,
  ].filter(Boolean).join(" · ");
}

export function feedNote(episode: Episode): string | undefined {
  return episode.status === "running"
    ? undefined
    : `episodio terminado · semilla ${episode.seed}`;
}

/** Cómo acabó, para la tarjeta de resultado. En curso no hay resultado que enseñar. */
export function resultOf(episode: Episode) {
  const href = `/runs/${episode.run_id}/${episode.seed}`;
  if (episode.status === "failure") {
    return {
      state: "bad" as const,
      title: failureText(episode.failure),
      description: `${episode.n_placed} de ${episode.n_objects} paquetes colocados · margen final ${signedMm(episode.final_stability_m)}`,
      href,
      linkLabel: "Ver episodio →",
    };
  }
  if (episode.status === "success") {
    return {
      state: "ok" as const,
      title: "Episodio completado",
      description: `${seconds(episode.duration_s)} · ${episode.n_placed} de ${episode.n_objects} paquetes · sin derrumbe`,
      href,
      linkLabel: "Ver detalle →",
    };
  }
  return null;
}
