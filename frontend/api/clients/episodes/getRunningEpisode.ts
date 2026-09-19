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
 *
 * Se descartan los que llevan demasiado abiertos. Un proceso que muere sin llamar a
 * `end()` deja su episodio en `running` para siempre, y como aquí tiene prioridad
 * absoluta, secuestraba Live: enseñaba un episodio muerto con el aviso de conexión
 * perdida encima y ya no salía de ahí. Ha pasado.
 */

/** Pasado este tiempo, un episodio «en curso» está abandonado, no corriendo. Los medidos
 *  duran entre 25 y 75 s de reloj, así que esto es un orden de magnitud por encima: solo
 *  descarta lo que de verdad se quedó colgado.
 *  ponytail: umbral fijo; si algún día hay episodios largos de verdad, mejor mirar la
 *  hora del último evento que la de arranque. */
export const MAX_RUNNING_AGE_MS = 15 * 60 * 1000;
export async function getRunningEpisode(): Promise<Episode | null> {
  const source = "getRunningEpisode";
  const t0 = performance.now();
  try {
    assertConfigured(source);
    const desde = new Date(Date.now() - MAX_RUNNING_AGE_MS).toISOString();
    const { data, error } = await supabase
      .from("v_episode_summary").select("*").eq("status", "running")
      .gte("started_at", desde)
      .order("started_at", { ascending: false }).limit(1);
    if (error) throw error;
    return ((data ?? []) as Episode[])[0] ?? null;
  } catch (err) {
    throw toApiError(err, source);
  } finally {
    trace(source, t0);
  }
}
