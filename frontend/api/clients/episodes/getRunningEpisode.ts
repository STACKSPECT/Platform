import { supabase, type Episode } from "@/lib/supabase";
import { assertConfigured, toApiError, trace } from "../errors";

/**
 * El episodio que está corriendo AHORA, o `null` si no hay ninguno: es lo único que enseña
 * Live. No cae al último terminado: una pantalla en directo que enseña algo viejo como si
 * fuera actual es peor que una que dice que no hay nada.
 *
 * `GET /v_episode_summary?status=eq.running&order=started_at.desc&limit=1`
 *
 * Si hubiera varios en curso (dos benchmarks a la vez), el más reciente.
 */
export async function getRunningEpisode(): Promise<Episode | null> {
  const source = "getRunningEpisode";
  const t0 = performance.now();
  try {
    assertConfigured(source);
    const { data, error } = await supabase
      .from("v_episode_summary").select("*").eq("status", "running")
      .order("started_at", { ascending: false }).limit(1);
    if (error) throw error;
    return ((data ?? []) as Episode[])[0] ?? null;
  } catch (err) {
    throw toApiError(err, source);
  } finally {
    trace(source, t0);
  }
}
