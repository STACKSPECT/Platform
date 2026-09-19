import { useEffect, useState } from "react";

/** La hora actual, refrescada cada `intervalMs`. Con `null` no corre: para no despertar
 *  la pantalla cada segundo cuando no hay nada que vigilar. */
export function useNow(intervalMs: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (intervalMs == null) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
