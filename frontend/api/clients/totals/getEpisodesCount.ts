import { supabase } from "@/lib/supabase";
import { assertConfigured, toApiError, trace } from "../errors";

/** `HEAD /episodes` con `Prefer: count=exact`. Se cuenta en la base y no se suma la
 *  columna `episodes` de cada run en el cliente: dos sitios que suman lo mismo acaban
 *  discrepando (AGENTS.md §4). */
export async function getEpisodesCount(): Promise<number> {
  const source = "getEpisodesCount";
  const t0 = performance.now();
  try {
    assertConfigured(source);
    const { count, error } = await supabase
      .from("episodes").select("*", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  } catch (err) {
    throw toApiError(err, source);
  } finally {
    trace(source, t0);
  }
}
