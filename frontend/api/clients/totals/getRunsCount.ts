import { supabase } from "@/lib/supabase";
import { assertConfigured, toApiError, trace } from "../errors";

/** `HEAD /v_run_summary` con `Prefer: count=exact`: el total sale de `Content-Range`, sin
 *  traer filas. Es lo que se enseña en la barra superior de Ejecuciones. */
export async function getRunsCount(): Promise<number> {
  const source = "getRunsCount";
  const t0 = performance.now();
  try {
    assertConfigured(source);
    const { count, error } = await supabase
      .from("v_run_summary").select("*", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  } catch (err) {
    throw toApiError(err, source);
  } finally {
    trace(source, t0);
  }
}
