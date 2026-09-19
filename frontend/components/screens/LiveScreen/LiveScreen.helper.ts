import { clockTime } from "@/lib/ui";

/** Sin nada recibido durante este tiempo, con un episodio en curso, se avisa. Generoso a
 *  propósito: un aviso en falso durante la demo es peor que enterarse más tarde.
 *
 *  Estaba en 8 s y saltaba a media ejecución sin que pasara nada. El ritmo de subida es
 *  muy irregular —el mismo episodio de 204 s simulados tarda entre 26 y 71 s de reloj,
 *  o sea entre x2.9 y x7.9 con el mismo motion_speed declarado—, así que hay huecos
 *  largos entre filas que son perfectamente normales. */
export const HEARTBEAT_MS = 20_000;

/** Cada cuánto se pregunta si hay un episodio en curso. Es lo que hace aparecer uno que acaba
 *  de arrancar (Realtime solo vigila el episodio que ya se está viendo) y lo que retira el
 *  que acaba de terminar si el aviso de Realtime no llega. */
export const LIVE_POLL_MS = 5000;

/** Cuánto se sigue enseñando un episodio que acaba de terminar, con su resultado, antes de
 *  dar el directo por acabado. Deja ver el desenlace y cubre el hueco hasta el episodio
 *  siguiente de una misma ejecución, para que Live no parpadee entre uno y otro. */
export const HOLD_MS = 10_000;

export function isStale(input: {
  running: boolean; fetchFailed: boolean; lastSignalAt: number; now: number;
}): boolean {
  const { running, fetchFailed, lastSignalAt, now } = input;
  return fetchFailed || (running && now - lastSignalAt > HEARTBEAT_MS);
}

/** El aviso que toca, que NO siempre es "conexión perdida".
 *
 *  Con el canal suscrito la conexión está perfectamente: lo que pasa es que no llegan
 *  filas. Decir "conexión perdida" entonces manda a mirar el wifi cuando el problema
 *  está en el productor, y es justo el minuto que no sobra en una demo. */
export function staleMessage(input: { subscribed: boolean; fetchFailed: boolean }): string {
  if (input.fetchFailed || !input.subscribed) return "Conexión perdida. Reintentando.";
  return "Sin datos nuevos.";
}

export function staleDetail(lastSignalAt: number): string {
  return `lo que se ve es el último dato recibido · ${clockTime(new Date(lastSignalAt).toISOString())}`;
}
