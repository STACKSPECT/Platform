import { useQuery } from "@tanstack/react-query";
import { getFailureBreakdown } from "../clients";
import { queryKeys } from "./queryKeys";

export function useFailureBreakdown(runId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.runs.failures(runId ?? ""),
    queryFn: () => getFailureBreakdown(runId as string),
    enabled: Boolean(runId),
  });
}
