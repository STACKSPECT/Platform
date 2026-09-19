import { supabase, type Episode } from "@/lib/supabase";
import { assertConfigured, toApiError, trace } from "../errors";

/** `GET /v_episode_summary?run_id=eq.{runId}&order=seed.asc` */
export async function getEpisodes(runId: string): Promise<Episode[]> {
  const source = "getEpisodes";
  const t0 = performance.now();
  try {
    assertConfigured(source);
    const { data, error } = await supabase
      .from("v_episode_summary").select("*").eq("run_id", runId)
      .order("seed", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Episode[];
  } catch (err) {
    throw toApiError(err, source);
  } finally {
    trace(source, t0);
  }
}
