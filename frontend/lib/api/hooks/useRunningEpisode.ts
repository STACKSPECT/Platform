import { useQuery } from "@tanstack/react-query";
import { getRunningEpisode } from "../clients";
import { queryKeys } from "./queryKeys";

/** El episodio en curso, o `null`. `refetchInterval` es lo que descubre uno que acaba de
 *  arrancar: Realtime solo vigila el episodio que ya se está viendo. */
export function useRunningEpisode(opts: { refetchInterval?: number | false } = {}) {
  return useQuery({
    queryKey: queryKeys.episodes.running,
    queryFn: getRunningEpisode,
    refetchInterval: opts.refetchInterval ?? false,
  });
}
