import { useQuery } from "@tanstack/react-query";
import { getLatestEpisode } from "../clients";
import { queryKeys } from "./queryKeys";

/** `refetchInterval` es opcional: Live se alimenta de Realtime y no lo necesita. */
export function useLatestEpisode(opts: { refetchInterval?: number | false } = {}) {
  return useQuery({
    queryKey: queryKeys.episodes.latest,
    queryFn: getLatestEpisode,
    refetchInterval: opts.refetchInterval ?? false,
  });
}
