/*
 * Geometría del palé, compartida por la vista cenital y el alzado.
 *
 * Palé europeo, en metros. El diseño insiste en dibujarlo a escala real y con sus
 * medidas: un esquemático genérico no transmite que esto modela un proceso físico.
 * Las poses del dato tienen el origen en el centro del palé; `z` se mide desde la
 * superficie del palé, y `layer` empieza en 1.
 */

import type { Placement } from "@/lib/supabase";

export const PALLET_X = 1.2;
export const PALLET_Y = 0.8;
/** Altura del palé (tablas y tacos), bajo la superficie donde se apila. */
export const PALLET_DECK_M = 0.144;

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

/** Caja envolvente, en planta, de un grupo de colocaciones. `null` si no hay ninguna. */
export function envelope(placements: Drawable[]): Box | null {
  if (!placements.length) return null;
  return {
    x0: Math.min(...placements.map((p) => p.actual_pose.x - p.dims_m[0] / 2)),
    x1: Math.max(...placements.map((p) => p.actual_pose.x + p.dims_m[0] / 2)),
    y0: Math.min(...placements.map((p) => p.actual_pose.y - p.dims_m[1] / 2)),
    y1: Math.max(...placements.map((p) => p.actual_pose.y + p.dims_m[1] / 2)),
  };
}

/** Altura de la carga sobre el palé: la cara superior más alta. */
export function loadHeight(placements: Drawable[]): number {
  return placements.reduce(
    (h, p) => Math.max(h, p.actual_pose.z + p.dims_m[2] / 2), 0);
}
