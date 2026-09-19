import type { Episode, PalletState, Placement, RunEvent } from "@/lib/supabase";
import type { PalletSize } from "@/lib/pallet";
import { failureText, mm, palletSize, seconds, signedMm } from "@/lib/ui";
import { routes } from "@/lib/routes";
import { buildIdentity, type IdentityMode, type IdentityView } from "../IdentityBar";
import { buildKpis, type KpiItem } from "../KpiGrid";

export type ResultView = {
  state: "ok" | "bad";
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
};

/** Todo lo que pinta el cuadro de un episodio, ya resuelto. Lo comparten Live (el último
 *  episodio) y el detalle de una ejecución (un episodio concreto): el componente no sabe de
 *  cuál de las dos viene. */
export type EpisodeView = {
  identity: IdentityView;
  kpis: KpiItem[];
  result: ResultView | null;
  placements: Placement[];
  last: PalletState | null;
  events: RunEvent[];
  palletSize: PalletSize;
  sideNote: string;
  feedNote: string | undefined;
};

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

/** Cómo acabó, para la tarjeta de resultado. En curso no hay resultado que enseñar. Con
 *  `link`, la tarjeta lleva al detalle del episodio; en el propio detalle no tiene sentido. */
export function resultOf(episode: Episode, link = true): ResultView | null {
  const to = link
    ? { href: routes.episode(episode.run_id, episode.seed) }
    : {};
  if (episode.status === "failure") {
    return {
      state: "bad",
      title: failureText(episode.failure),
      description: `${episode.n_placed} de ${episode.n_objects} paquetes colocados · margen final ${signedMm(episode.final_stability_m)}`,
      ...to,
      ...(link && { linkLabel: "Ver episodio →" }),
    };
  }
  if (episode.status === "success") {
    return {
      state: "ok",
      title: "Episodio completado",
      description: `${seconds(episode.duration_s)} · ${episode.n_placed} de ${episode.n_objects} paquetes · sin derrumbe`,
      ...to,
      ...(link && { linkLabel: "Ver detalle →" }),
    };
  }
  return null;
}

/** De un episodio y sus datos de detalle al modelo que pinta el cuadro. */
export function buildEpisodeView(input: {
  episode: Episode;
  placements: Placement[];
  states: PalletState[];
  events: RunEvent[];
  /** Los episodios de su ejecución, para el «3 / 25». */
  runEpisodes: Episode[];
  stale: boolean;
  mode: IdentityMode;
}): EpisodeView {
  const { episode, placements, states, events, runEpisodes, stale, mode } = input;
  const last = lastPalletState(states);
  return {
    identity: buildIdentity({ episode, runEpisodes, events, stale, mode }),
    kpis: buildKpis(episode, last, placements),
    result: resultOf(episode, mode === "live"),
    placements, last, events,
    // El palé puede ser una maqueta a escala: sin esto se dibuja a 1200x800
    // y todas las cotas salen mal por el mismo factor.
    palletSize: palletSize(episode),
    sideNote: sideViewNote(episode, last),
    feedNote: feedNote(episode),
  };
}
