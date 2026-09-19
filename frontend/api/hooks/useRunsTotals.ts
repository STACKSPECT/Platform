import { useQuery } from "@tanstack/react-query";
import { getEpisodesCount, getRunsCount } from "../clients";
import { queryKeys } from "./queryKeys";

/** «54 ejecuciones · 833 episodios». Con `enabled: false` no pide nada: la barra global
 *  solo lo necesita en Ejecuciones. Cada total tiene su propia consulta y su propio
 *  error: que falle uno no impide enseñar el otro. */
export function useRunsTotals(enabled = true) {
  const runs = useQuery({ queryKey: queryKeys.totals.runs, queryFn: getRunsCount, enabled });
  const episodes = useQuery({
    queryKey: queryKeys.totals.episodes, queryFn: getEpisodesCount, enabled,
  });
  return { runs, episodes };
}
