import { clockTime } from "@/lib/ui";

/** Con un episodio en curso y el canal sano, sin recibir nada durante este tiempo se avisa de
 *  que el episodio no envía datos. No es una conexión perdida: la conexión va bien, es quien
 *  produce el que calla (un paso lento, o un proceso que se cayó sin cerrar el episodio). Por
 *  eso es holgado: el ritmo de subida es muy irregular (el mismo episodio de 204 s simulados
 *  tarda entre 26 y 71 s de reloj con el mismo motion_speed), así que hay huecos largos entre
 *  filas que son normales. Un 8 s saltaba a media ejecución sin que pasara nada. */
export const SILENCE_MS = 30_000;

/** Cada cuánto se pregunta si hay un episodio en curso. Es lo que hace aparecer uno que acaba
 *  de arrancar (Realtime solo vigila el episodio que ya se está viendo) y lo que retira el
 *  que acaba de terminar si el aviso de Realtime no llega. */
export const LIVE_POLL_MS = 5000;

/** Cuánto se sigue enseñando un episodio que acaba de terminar, con su resultado, antes de
 *  dar el directo por acabado. Deja ver el desenlace y cubre el hueco hasta el episodio
 *  siguiente de una misma ejecución, para que Live no parpadee entre uno y otro. */
export const HOLD_MS = 10_000;

/** Por qué lo que se ve puede no estar al día:
 *  - `lost`: falla la conexión (la consulta o el canal de Realtime). Se congela lo último recibido.
 *  - `silent`: la conexión va bien pero el episodio en curso no manda nada.
 *  - `null`: al día. */
export type Staleness = "lost" | "silent" | null;

export function staleness(input: {
  running: boolean; fetchFailed: boolean; channelError: boolean;
  lastSignalAt: number | null; now: number;
}): Staleness {
  const { running, fetchFailed, channelError, lastSignalAt, now } = input;
  if (fetchFailed || channelError) return "lost";
  if (running && lastSignalAt !== null && now - lastSignalAt > SILENCE_MS) return "silent";
  return null;
}

export function staleDetail(kind: Staleness, lastSignalAt: number | null): string | undefined {
  if (lastSignalAt === null) return undefined;
  const at = clockTime(new Date(lastSignalAt).toISOString());
  return kind === "lost"
    ? `lo que se ve es el último dato recibido · ${at}`
    : `último dato recibido · ${at}`;
}
