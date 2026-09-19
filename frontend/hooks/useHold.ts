import { useEffect, useState } from "react";

/**
 * Conserva el último valor no nulo durante `holdMs` después de que `current` pase a `null`.
 *
 * Es lo que evita que una pantalla en directo se vacíe en cuanto acaba lo que enseñaba:
 * durante ese margen se sigue viendo el desenlace y, si llega otro valor dentro del margen,
 * se pasa a él directamente, sin pasar por el vacío.
 *
 *  - `value`: lo que hay que enseñar (el actual, o el retenido mientras dure el margen).
 *  - `holding`: `true` solo mientras se está enseñando un valor que ya no es el actual.
 */
export function useHold<T>(current: T | null, holdMs: number) {
  const [held, setHeld] = useState<T | null>(current);
  const [expired, setExpired] = useState(false);

  // Un valor nuevo se recuerda y reabre el margen. Se ajusta durante el render (con guarda,
  // así que converge en una vuelta) y no en un efecto, que lo haría llegar un pintado tarde.
  if (current !== null && current !== held) {
    setHeld(current);
    setExpired(false);
  }

  useEffect(() => {
    if (current !== null || held === null) return;
    const id = setTimeout(() => setExpired(true), holdMs);
    return () => clearTimeout(id);
  }, [current, held, holdMs]);

  const holding = current === null && held !== null && !expired;
  return { value: current ?? (holding ? held : null), holding };
}
