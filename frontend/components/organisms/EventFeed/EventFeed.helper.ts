import type { RunEvent } from "@/lib/supabase";

/** Los más recientes primero, hasta `limit`. Ordena por `seq` y no por llegada: Realtime
 *  no garantiza el orden de las inserciones. */
export function latestEvents(events: RunEvent[], limit: number): RunEvent[] {
  return [...events].sort((a, b) => b.seq - a.seq).slice(0, limit);
}
