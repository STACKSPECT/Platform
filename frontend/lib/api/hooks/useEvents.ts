import { useQuery } from "@tanstack/react-query";
import { getEvents } from "../clients";
import { queryKeys } from "./queryKeys";

export function useEvents(episodeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.episodes.events(episodeId ?? ""),
    queryFn: () => getEvents(episodeId as string),
    enabled: Boolean(episodeId),
  });
}
