import { useQuery } from "@tanstack/react-query";
import { getEpisodesCount, getRunsCount } from "../clients";
import { queryKeys } from "./queryKeys";

/** «54 ejecuciones · 833 episodios». Cada total tiene su propia consulta y su propio
 *  error: que falle uno no impide enseñar el otro. */
export function useRunsTotals() {
  const runs = useQuery({ queryKey: queryKeys.totals.runs, queryFn: getRunsCount });
  const episodes = useQuery({ queryKey: queryKeys.totals.episodes, queryFn: getEpisodesCount });
  return { runs, episodes };
}
