import { useQuery } from "@tanstack/react-query";
import { getEpisodes } from "../clients";
import { queryKeys } from "./queryKeys";

export function useEpisodes(runId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.episodes.byRun(runId ?? ""),
    queryFn: () => getEpisodes(runId as string),
    enabled: Boolean(runId),
  });
}
