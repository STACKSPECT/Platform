import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { configured, supabase, type PalletState, type RunEvent } from "@/lib/supabase";
import { queryKeys } from "./queryKeys";

/** Añade una fila a una lista de la caché si no estaba ya (Realtime puede repetir). */
function append<T extends { id: string }>(prev: T[] | undefined, row: T): T[] {
  const list = prev ?? [];
  return list.some((r) => r.id === row.id) ? list : [...list, row];
}

/**
 * Mantiene al día la caché de un episodio con lo que llega por Realtime. Es la única
 * fuente de esta vista además de la carga inicial:
 *
 *  - INSERT en `events` y `pallet_states`: se añaden a su lista en la caché.
 *  - `placements` no está publicado en Realtime, así que cada `pallet_state` nuevo (uno
 *    por paquete depositado) lo invalida y se vuelve a pedir.
 *  - UPDATE en `episodes`: cambió el estado o la duración; se invalida todo lo que cuelga
 *    de `episodes` (el episodio "último", el listado del run y su detalle).
 *
 * Devuelve cuándo llegó lo último y si el canal está suscrito; con eso la pantalla
 * decide si avisar de "conexión perdida".
 */
export function useEpisodeRealtime(episodeId: string | undefined) {
  const queryClient = useQueryClient();
  const [lastReceivedAt, setLastReceivedAt] = useState<number | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!configured || !episodeId) return;
    const touch = () => setLastReceivedAt(Date.now());

    const channel = supabase
      .channel(`live-${episodeId}`)
      .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "events",
            filter: `episode_id=eq.${episodeId}` },
          (p) => {
            queryClient.setQueryData<RunEvent[]>(
              queryKeys.episodes.events(episodeId), (prev) => append(prev, p.new as RunEvent));
            touch();
          })
      .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "pallet_states",
            filter: `episode_id=eq.${episodeId}` },
          (p) => {
            queryClient.setQueryData<PalletState[]>(
              queryKeys.episodes.states(episodeId), (prev) => append(prev, p.new as PalletState));
            void queryClient.invalidateQueries({
              queryKey: queryKeys.episodes.placements(episodeId) });
            touch();
          })
      .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "episodes",
            filter: `id=eq.${episodeId}` },
          () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.episodes.all });
            touch();
          })
      .subscribe((status) => setSubscribed(status === "SUBSCRIBED"));

    return () => {
      setSubscribed(false);
      void supabase.removeChannel(channel);
    };
  }, [episodeId, queryClient]);

  return { lastReceivedAt, subscribed };
}
