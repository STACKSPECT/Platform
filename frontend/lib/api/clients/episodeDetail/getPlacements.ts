import { supabase, type Placement } from "@/lib/supabase";
import { assertConfigured, toApiError, trace } from "../errors";

/** `GET /placements?episode_id=eq.{id}&order=seq.asc` */
export async function getPlacements(episodeId: string): Promise<Placement[]> {
  const source = "getPlacements";
  const t0 = performance.now();
  try {
    assertConfigured(source);
    const { data, error } = await supabase
      .from("placements").select("*").eq("episode_id", episodeId)
      .order("seq", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Placement[];
  } catch (err) {
    throw toApiError(err, source);
  } finally {
    trace(source, t0);
  }
}
