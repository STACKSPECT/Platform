import { useState } from "react";
import {
  useEpisodeDetail, useEpisodeRealtime, useEpisodes, useRunningEpisode,
} from "@/api/hooks";
import { configured } from "@/lib/supabase";
import { useNow } from "@/hooks/useNow";
import { buildEpisodeView } from "../../organisms/EpisodeDashboard";
import { LIVE_POLL_MS, isStale, staleDetail } from "./LiveScreen.helper";

/** Une los datos de Live en un solo modelo para la pantalla. Aquí no se dibuja nada.
 *
 *  Live enseña una ejecución en directo y nada más. Sin ningún episodio en curso el estado
 *  es `idle`, que la pantalla dice con todas las letras: nunca se rellena con lo último
 *  terminado, porque eso se leería como si estuviera pasando ahora. */
export function useLiveScreen() {
  const live = useRunningEpisode({ refetchInterval: LIVE_POLL_MS });
  const episode = live.data ?? null;
  const detail = useEpisodeDetail(episode?.id);
  const runEpisodes = useEpisodes(episode?.run_id);
  const { lastReceivedAt } = useEpisodeRealtime(episode?.id);

  const now = useNow(episode ? 1000 : null);
  // Hasta que llegue algo por Realtime, la referencia es la de cuando se montó la pantalla.
  const [mountedAt] = useState(() => Date.now());
  const lastSignalAt = lastReceivedAt ?? mountedAt;

  const retry = () => { void live.refetch(); };

  if (!configured) return { state: "unconfigured" as const, retry };
  if (live.isPending) return { state: "loading" as const, retry };
  // Un fallo de red DESPUÉS de haber sabido si hay directo no cambia lo que se ve: el
  // siguiente sondeo lo corrige. Solo es un error si nunca se llegó a saber.
  if (live.data === undefined) {
    return { state: "error" as const, retry, error: live.error?.message };
  }
  if (!episode) return { state: "idle" as const, retry };

  // Con un episodio en pantalla, un fallo de red no lo vacía: se congela y se avisa.
  const stale = isStale({
    running: true, fetchFailed: live.isError || detail.isError, lastSignalAt, now,
  });

  return {
    state: "ready" as const,
    retry,
    stale,
    staleDetail: staleDetail(lastSignalAt),
    view: buildEpisodeView({
      episode,
      placements: detail.placements.data ?? [],
      states: detail.states.data ?? [],
      events: detail.events.data ?? [],
      runEpisodes: runEpisodes.data ?? [],
      stale, mode: "live",
    }),
  };
}
