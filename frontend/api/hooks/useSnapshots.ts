import { useQuery } from "@tanstack/react-query";
import { getSnapshots } from "../clients";
import { queryKeys } from "./queryKeys";

export function useSnapshots(episodeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.episodes.snapshots(episodeId ?? ""),
    queryFn: () => getSnapshots(episodeId as string),
    enabled: Boolean(episodeId),
  });
}
