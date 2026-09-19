import { supabase, type Episode } from "@/lib/supabase";
import { assertConfigured, toApiError, trace } from "../errors";

/**
 * Lo que enseña Live: un episodio en curso si lo hay y, si no, el último terminado.
 * Devuelve `null` solo cuando no hay ni un episodio en toda la base.
 *
 *   1. `GET /v_episode_summary?status=eq.running&limit=1`
 *   2. `GET /episodes?select=id&order=started_at.desc&limit=1`, y luego
 *      `GET /v_episode_summary?id=eq.{id}`.
 *
 * El paso 2 pasa por la tabla porque `v_episode_summary` NO expone `started_at`
 * (002_design.sql): ordenar la vista por esa columna da `42703`.
 */
export async function getLatestEpisode(): Promise<Episode | null> {
  const source = "getLatestEpisode";
  const t0 = performance.now();
  try {
    assertConfigured(source);
    const running = await supabase
      .from("v_episode_summary").select("*").eq("status", "running").limit(1);
    if (running.error) throw running.error;
    if (running.data?.length) return running.data[0] as Episode;

    const latest = await supabase
      .from("episodes").select("id").order("started_at", { ascending: false }).limit(1);
    if (latest.error) throw latest.error;
    const id = latest.data?.[0]?.id as string | undefined;
    if (!id) return null;

    const { data, error } = await supabase
      .from("v_episode_summary").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as Episode | null;
  } catch (err) {
    throw toApiError(err, source);
  } finally {
    trace(source, t0);
  }
}
