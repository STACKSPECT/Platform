import { useQuery } from "@tanstack/react-query";
import { getPalletStates } from "../clients";
import { queryKeys } from "./queryKeys";

export function usePalletStates(episodeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.episodes.states(episodeId ?? ""),
    queryFn: () => getPalletStates(episodeId as string),
    enabled: Boolean(episodeId),
  });
}
