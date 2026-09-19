import { useQuery } from "@tanstack/react-query";
import { getEpisode } from "../clients";
import { queryKeys } from "./queryKeys";

export function useEpisode(runId: string | undefined, seed: number | undefined) {
  return useQuery({
    queryKey: queryKeys.episodes.detail(runId ?? "", seed ?? -1),
    queryFn: () => getEpisode(runId as string, seed as number),
    enabled: Boolean(runId) && seed !== undefined && Number.isFinite(seed),
  });
}
