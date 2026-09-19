import { clockTime } from "@/lib/ui";

/** Sin nada recibido durante este tiempo, con un episodio en curso, se da la conexión
 *  por perdida. Generoso a propósito: un aviso en falso durante la demo es peor que
 *  enterarse dos segundos más tarde. */
export const HEARTBEAT_MS = 8000;

/** Cada cuánto se busca un episodio nuevo. Realtime solo vigila el episodio que ya se
 *  está viendo, así que uno que empieza se descubre preguntando. */
export const LATEST_POLL_MS = 5000;

export function isStale(input: {
  running: boolean; fetchFailed: boolean; lastSignalAt: number; now: number;
}): boolean {
  const { running, fetchFailed, lastSignalAt, now } = input;
  return fetchFailed || (running && now - lastSignalAt > HEARTBEAT_MS);
}

export function staleDetail(lastSignalAt: number): string {
  return `lo que se ve es el último dato recibido · ${clockTime(new Date(lastSignalAt).toISOString())}`;
}
