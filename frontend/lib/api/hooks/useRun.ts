import { useQuery } from "@tanstack/react-query";
import { getRun } from "../clients";
import { queryKeys } from "./queryKeys";

export function useRun(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.runs.detail(id ?? ""),
    queryFn: () => getRun(id as string),
    enabled: Boolean(id),
  });
}
