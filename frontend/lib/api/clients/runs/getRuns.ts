import { supabase, type Run } from "@/lib/supabase";
import { assertConfigured, toApiError, trace } from "../errors";

/** `GET /v_run_summary?order=started_at.desc&limit=N` */
export async function getRuns(limit = 60): Promise<Run[]> {
  const source = "getRuns";
  const t0 = performance.now();
  try {
    assertConfigured(source);
    const { data, error } = await supabase
      .from("v_run_summary")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Run[];
  } catch (err) {
    throw toApiError(err, source);
  } finally {
    trace(source, t0);
  }
}
