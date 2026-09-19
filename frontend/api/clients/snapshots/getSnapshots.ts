import { supabase, type Snapshot } from "@/lib/supabase";
import { assertConfigured, toApiError, trace } from "../errors";

/** `GET /snapshots?episode_id=eq.{id}&order=after_seq.asc`: las capturas del simulador.
 *
 *  Son la prueba de que el dibujo no miente: al acabar el episodio se pone la foto real
 *  al lado del esquema y se ve si coinciden. */
export async function getSnapshots(episodeId: string): Promise<Snapshot[]> {
  const source = "getSnapshots";
  const t0 = performance.now();
  try {
    assertConfigured(source);
    const { data, error } = await supabase
      .from("snapshots").select("*").eq("episode_id", episodeId)
      .order("after_seq", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Snapshot[];
  } catch (err) {
    throw toApiError(err, source);
  } finally {
    trace(source, t0);
  }
}
