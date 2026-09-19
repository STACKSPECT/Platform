import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { configured, supabase } from "@/lib/supabase";
import { queryKeys } from "./queryKeys";

/**
 * Se entera AL INSTANTE de que arranca un episodio nuevo (INSERT en `episodes`) y hace que
 * se vuelva a preguntar cuál está en curso.
 *
 * Sin esto, con nada en pantalla Live solo descubriría un episodio nuevo cuando le tocara el
 * sondeo (hasta 5 s): en un benchmark, con episodios seguidos, eso se vería como un hueco
 * entre uno y otro. El sondeo se queda como red de seguridad por si Realtime se cae.
 *
 * Es un canal aparte del de `useEpisodeRealtime`, que vigila UN episodio ya elegido: este
 * vigila el hueco en el que todavía no hay ninguno.
 */
export function useRunningEpisodeRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!configured) return;
    const channel = supabase
      .channel("live-episodes")
      .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "episodes" },
          () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.episodes.running });
          })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);
}
