import { supabase, type PalletState } from "@/lib/supabase";
import { assertConfigured, toApiError, trace } from "../errors";

/** `GET /pallet_states?episode_id=eq.{id}&order=after_seq.asc`: la traza de CoG. */
export async function getPalletStates(episodeId: string): Promise<PalletState[]> {
  const source = "getPalletStates";
  const t0 = performance.now();
  try {
    assertConfigured(source);
    const { data, error } = await supabase
      .from("pallet_states").select("*").eq("episode_id", episodeId)
      .order("after_seq", { ascending: true });
    if (error) throw error;
    return (data ?? []) as PalletState[];
  } catch (err) {
    throw toApiError(err, source);
  } finally {
    trace(source, t0);
  }
}
