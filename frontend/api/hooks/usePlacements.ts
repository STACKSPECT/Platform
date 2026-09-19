import { useQuery } from "@tanstack/react-query";
import { getPlacements } from "../clients";
import { queryKeys } from "./queryKeys";

export function usePlacements(episodeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.episodes.placements(episodeId ?? ""),
    queryFn: () => getPlacements(episodeId as string),
    enabled: Boolean(episodeId),
  });
}
