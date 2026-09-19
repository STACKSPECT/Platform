import { supabase } from "@/lib/supabase";
import type { FailureBreakdownRow } from "../../types";
import { assertConfigured, toApiError, trace } from "../errors";

/** `GET /v_failure_breakdown?run_id=eq.{runId}&order=n.desc`: alimenta FailureBreakdown. */
export async function getFailureBreakdown(runId: string): Promise<FailureBreakdownRow[]> {
  const source = "getFailureBreakdown";
  const t0 = performance.now();
  try {
    assertConfigured(source);
    const { data, error } = await supabase
      .from("v_failure_breakdown").select("*").eq("run_id", runId)
      .order("n", { ascending: false });
    if (error) throw error;
    return (data ?? []) as FailureBreakdownRow[];
  } catch (err) {
    throw toApiError(err, source);
  } finally {
    trace(source, t0);
  }
}
