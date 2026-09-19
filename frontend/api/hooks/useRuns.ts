import { useQuery } from "@tanstack/react-query";
import { getRuns } from "../clients";
import { queryKeys } from "./queryKeys";

export function useRuns(limit = 60) {
  return useQuery({
    queryKey: queryKeys.runs.list(limit),
    queryFn: () => getRuns(limit),
  });
}
