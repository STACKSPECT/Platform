import { useEffect } from "react";
import {
  useEpisodeDetail, useEpisodeRealtime, useEpisodes, useRunningEpisode,
  useRunningEpisodeRealtime, useSnapshots,
} from "@/api/hooks";
import { configured } from "@/lib/supabase";
import { useHold } from "@/hooks/useHold";
import { useNow } from "@/hooks/useNow";
import { buildEpisodeView } from "../../organisms/EpisodeDashboard";
import { HOLD_MS, LIVE_POLL_MS, staleDetail, staleness } from "./LiveScreen.helper";

/** Une los datos de Live en un solo modelo para la pantalla. Aquí no se dibuja nada.
 *
 *  Live enseña una ejecución en directo y nada más. Cuando el episodio acaba se sigue viendo
 *  unos segundos con su resultado (`finished`) y, si arranca otro dentro de ese margen, se
 *  pasa a él sin vaciarse. Pasado el margen sin nada nuevo el estado es `idle`, que la
 *  pantalla dice con todas las letras: nunca se rellena con lo último terminado, porque eso
 *  se leería como si estuviera pasando ahora. */
export function useLiveScreen() {
  const live = useRunningEpisode({ refetchInterval: LIVE_POLL_MS });
  // Un episodio nuevo se descubre al instante; el sondeo de arriba es la red de seguridad.
  useRunningEpisodeRealtime();

  const { value: shown, holding } = useHold(live.data ?? null, HOLD_MS);
  const runEpisodes = useEpisodes(shown?.run_id);

  // El episodio retenido se guardó cuando aún corría: la fila final (estado, duración,
  // fallo) es la que ya devolvió la lista de su ejecución, refrescada por el UPDATE.
  const episode = holding
    ? runEpisodes.data?.find((e) => e.id === shown?.id) ?? shown
    : shown;

  // Si el aviso del UPDATE no llegó (Realtime caído) y ha sido el sondeo el que ha visto que
  // ya no corre, la fila retenida sigue diciendo «en curso»: se pide la final al empezar el margen.
  const refetchEpisodes = runEpisodes.refetch;
  useEffect(() => {
    if (holding) void refetchEpisodes();
  }, [holding, refetchEpisodes]);

  const detail = useEpisodeDetail(episode?.id);
  const { lastReceivedAt, channelError } = useEpisodeRealtime(episode?.id);
  const snapshots = useSnapshots(episode?.id);

  const now = useNow(episode ? 1000 : null);
  // Sin referencia (el canal aún no se ha suscrito a este episodio) no se puede acusar de silencio.
  const lastSignalAt = lastReceivedAt;

  const retry = () => { void live.refetch(); };

  if (!configured) return { state: "unconfigured" as const, retry };
  if (live.isPending) return { state: "loading" as const, retry };
  // Un fallo de red DESPUÉS de haber sabido si hay directo no cambia lo que se ve: el
  // siguiente sondeo lo corrige. Solo es un error si nunca se llegó a saber.
  if (live.data === undefined) {
    return { state: "error" as const, retry, error: live.error?.message };
  }
  if (!episode) return { state: "idle" as const, retry };

  // Con un episodio en pantalla, un fallo de red no lo vacía: se congela y se avisa. El silencio
  // solo se vigila en lo que corre: uno terminado no manda datos, y eso no es un fallo.
  const kind = staleness({
    running: episode.status === "running",
    fetchFailed: live.isError || detail.isError, channelError, lastSignalAt, now,
  });
  const stale = kind !== null;

  return {
    state: "ready" as const,
    retry,
    stale,
    silent: kind === "silent",
    finished: holding,
    staleDetail: staleDetail(kind, lastSignalAt),
    view: buildEpisodeView({
      episode,
      placements: detail.placements.data ?? [],
      states: detail.states.data ?? [],
      events: detail.events.data ?? [],
      runEpisodes: runEpisodes.data ?? [],
      snapshots: snapshots.data ?? [],
      stale, mode: "live",
    }),
  };
}
