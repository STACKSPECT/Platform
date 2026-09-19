/*
 * Geometría del palé, compartida por la vista cenital y el alzado.
 *
 * Palé europeo, en metros. El diseño insiste en dibujarlo a escala real y con sus
 * medidas: un esquemático genérico no transmite que esto modela un proceso físico.
 * Las poses del dato tienen el origen en el centro del palé; `z` se mide desde la
 * superficie del palé, y `layer` empieza en 1.
 */

import type { Placement } from "@/lib/supabase";

/* Palé europeo, y solo el valor POR DEFECTO. El de verdad puede ser una maqueta a
   escala —la pinza del Panda abre 80 mm y un europeo es inagarrable—, y su medida viaja
   con la ejecución en `config.pallet_size_m`. Dibujar a 1200x800 un palé de 210x140
   deja TODAS las cotas mal por el mismo factor. Se lee con `palletSize()` de ui.ts. */
export const PALLET_X = 1.2;
export const PALLET_Y = 0.8;

/** Medidas del palé en metros: [ancho X, fondo Y]. */
export type PalletSize = readonly [number, number];
export const PALLET_DEFAULT: PalletSize = [PALLET_X, PALLET_Y];
/** Altura del palé (tablas y tacos), bajo la superficie donde se apila. */
export const PALLET_DECK_M = 0.144;

/* Las dos medidas de abajo eran absolutas y suponían un europeo. Con una maqueta de
   210 mm eso dibujaba un palé 1.8 veces más alto que TODA la carga, y dejaba el montón
   en el 18 % del alzado: parecía que no llegaban ni dimensiones ni posiciones. Se
   escalan con el ancho del palé, y para 1.2 m dan exactamente los valores de antes. */

/** Altura del palé (tablas y tacos). El europeo son 144 mm sobre 1200 de ancho. */
export function deckHeight([px]: PalletSize): number {
  return PALLET_DECK_M * (px / PALLET_X);
}

/** Altura mínima del eje vertical, para que un palé casi vacío no se dibuje gigante.
 *  Un cuarto del ancho: 300 mm en el europeo, 53 en la maqueta. */
export function minStackHeight([px]: PalletSize): number {
  return px * 0.25;
}

/** Una colocación con pose y dimensiones, o sea, dibujable. */
export type Drawable = Placement & {
  actual_pose: NonNullable<Placement["actual_pose"]>;
  dims_m: number[];
};

export function drawable(placements: Placement[]): Drawable[] {
  return placements.filter((p): p is Drawable => Boolean(p.actual_pose && p.dims_m));
}

/** La última colocación, por orden de colocación. */
export function lastPlacement(placements: Placement[]): Placement | null {
  return placements.reduce<Placement | null>(
    (last, p) => (!last || p.seq > last.seq ? p : last), null);
}

export type Box = { x0: number; x1: number; y0: number; y1: number };

/** Las cuatro esquinas en planta, en metros, ya giradas por el `yaw` de la pose.
 *
 *  El planificador gira paquetes a propósito —90° para que entren en la fila—, así que
 *  `dims_m` NO se puede leer como si siempre estuviera alineado con los ejes: una caja
 *  de 480x340 puesta de canto ocupa 340 de ancho, no 480. */
export function corners(p: Drawable): Array<[number, number]> {
  const { x, y, yaw } = p.actual_pose;
  const [dx, dy] = p.dims_m;
  const cos = Math.cos(yaw ?? 0);
  const sin = Math.sin(yaw ?? 0);
  const esquinas: ReadonlyArray<readonly [number, number]> = [
    [-dx / 2, -dy / 2], [dx / 2, -dy / 2], [dx / 2, dy / 2], [-dx / 2, dy / 2],
  ];
  return esquinas.map(([u, v]) => [x + u * cos - v * sin, y + u * sin + v * cos]);
}

/** Lo que la caja ocupa a lo largo de un eje una vez girada. Es lo que ve el alzado: un
 *  paquete de canto se dibuja estrecho aunque su lado largo siga siendo el mismo. */
export function span(dx: number, dy: number, yaw: number | undefined): number {
  return dx * Math.abs(Math.cos(yaw ?? 0)) + dy * Math.abs(Math.sin(yaw ?? 0));
}

/** Caja envolvente, en planta, de un grupo de colocaciones. `null` si no hay ninguna.
 *
 *  Es la envolvente de las esquinas GIRADAS. Con giros que no son múltiplos de 90° el
 *  apoyo real es el casco convexo de esas esquinas y este rectángulo lo sobreestima; se
 *  usa para encuadrar el dibujo, nunca para decidir si el montón aguanta —ese número lo
 *  calcula el backend (`theker_telemetry.pallet.stability_margin`) y llega ya hecho. */
export function envelope(placements: Drawable[]): Box | null {
  if (!placements.length) return null;
  const pts = placements.flatMap(corners);
  return {
    x0: Math.min(...pts.map(([x]) => x)),
    x1: Math.max(...pts.map(([x]) => x)),
    y0: Math.min(...pts.map(([, y]) => y)),
    y1: Math.max(...pts.map(([, y]) => y)),
  };
}

/** Altura de la carga sobre el palé: la cara superior más alta. */
export function loadHeight(placements: Drawable[]): number {
  return placements.reduce(
    (h, p) => Math.max(h, p.actual_pose.z + p.dims_m[2] / 2), 0);
}
