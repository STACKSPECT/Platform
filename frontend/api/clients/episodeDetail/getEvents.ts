import { supabase, type RunEvent } from "@/lib/supabase";
import { assertConfigured, toApiError, trace } from "../errors";

/** `GET /events?episode_id=eq.{id}&order=seq.asc` */
export async function getEvents(episodeId: string): Promise<RunEvent[]> {
  const source = "getEvents";
  const t0 = performance.now();
  try {
    assertConfigured(source);
    const { data, error } = await supabase
      .from("events").select("*").eq("episode_id", episodeId)
      .order("seq", { ascending: true });
    if (error) throw error;
    return (data ?? []) as RunEvent[];
  } catch (err) {
    throw toApiError(err, source);
  } finally {
    trace(source, t0);
  }
}
