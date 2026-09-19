import { supabase, type Episode } from "@/lib/supabase";
import { assertConfigured, toApiError, trace } from "../errors";

/** `GET /v_episode_summary?run_id=eq.{runId}&seed=eq.{seed}` → fila o `null`. */
export async function getEpisode(runId: string, seed: number): Promise<Episode | null> {
  const source = "getEpisode";
  const t0 = performance.now();
  try {
    assertConfigured(source);
    const { data, error } = await supabase
      .from("v_episode_summary").select("*")
      .eq("run_id", runId).eq("seed", seed).maybeSingle();
    if (error) throw error;
    return data as Episode | null;
  } catch (err) {
    throw toApiError(err, source);
  } finally {
    trace(source, t0);
  }
}
