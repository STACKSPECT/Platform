import { useEvents } from "./useEvents";
import { usePalletStates } from "./usePalletStates";
import { usePlacements } from "./usePlacements";

/** Lo que necesita la pantalla de episodio: los tres hooks de detalle juntos. Cada
 *  uno mantiene su propia caché y su propio error, así que un fallo en `events` no
 *  tira abajo el alzado. */
export function useEpisodeDetail(episodeId: string | undefined) {
  const placements = usePlacements(episodeId);
  const states = usePalletStates(episodeId);
  const events = useEvents(episodeId);
  return {
    placements, states, events,
    isPending: placements.isPending || states.isPending || events.isPending,
    isError: placements.isError || states.isError || events.isError,
  };
}
