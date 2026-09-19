import { supabase, type Run } from "@/lib/supabase";
import { assertConfigured, toApiError, trace } from "../errors";

/** `GET /v_run_summary?id=eq.{id}` → la fila, o `null` si no existe. */
export async function getRun(id: string): Promise<Run | null> {
  const source = "getRun";
  const t0 = performance.now();
  try {
    assertConfigured(source);
    const { data, error } = await supabase
      .from("v_run_summary").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as Run | null;
  } catch (err) {
    throw toApiError(err, source);
  } finally {
    trace(source, t0);
  }
}
