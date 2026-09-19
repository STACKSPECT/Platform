import type { PalletState, Placement } from "@/lib/supabase";
import {
  PALLET_X, PALLET_Y, drawable, envelope, lastPlacement, type Box,
} from "@/lib/pallet";
import { mm, signedMm, stabilityState, type State } from "@/lib/ui";

const PAD = { l: 46, r: 24, t: 34, b: 40 };

type Rect = { x: number; y: number; width: number; height: number };
type Label = { x: number; y: number; text: string };

export type TopViewModel = {
  width: number;
  height: number;
  frame: Rect;
  /** El hueco planificado del último paquete: enseña cuánto se desvió. */
  planned: Rect | null;
  packages: Array<Rect & { key: number; variant: "placed" | "last" | "failed"; label: string | null }>;
  support: Rect | null;
  cog: { x: number; y: number } | null;
  tone: State;
  margin: Label | null;
  widthLabel: Label;
  depthLabel: Label;
  caption: Label | null;
};

/**
 * De metros respecto al centro del palé a píxeles del SVG. +Y del mundo sube en pantalla.
 *
 * El polígono de soporte real no es un dato: se aproxima con la caja envolvente de la
 * capa inferior a la del último paquete, que es lo que de verdad lo sostiene.
 */
export function buildTopView(
  placements: Placement[], state: PalletState | null, height = 330,
): TopViewModel {
  const scale = (height - PAD.t - PAD.b) / PALLET_Y;
  const width = PALLET_X * scale + PAD.l + PAD.r;

  const X = (x: number) => PAD.l + (x + PALLET_X / 2) * scale;
  const Y = (y: number) => PAD.t + (PALLET_Y / 2 - y) * scale;
  const rectOf = (cx: number, cy: number, dx: number, dy: number): Rect =>
    ({ x: X(cx - dx / 2), y: Y(cy + dy / 2), width: dx * scale, height: dy * scale });
  const boxRect = (b: Box): Rect =>
    ({ x: X(b.x0), y: Y(b.y1), width: (b.x1 - b.x0) * scale, height: (b.y1 - b.y0) * scale });

  const items = drawable(placements);
  const last = lastPlacement(placements);
  const layer = last?.layer ?? null;

  // Las capas altas se pintan encima de las bajas.
  const packages = [...items]
    .sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0) || a.seq - b.seq)
    .map((p) => {
      const isLast = p.seq === last?.seq;
      return {
        key: p.seq,
        ...rectOf(p.actual_pose.x, p.actual_pose.y, p.dims_m[0], p.dims_m[1]),
        variant: (!p.placed ? "failed" : isLast ? "last" : "placed") as "placed" | "last" | "failed",
        label: isLast ? p.package_id : null,
      };
    });

  const below = layer && layer > 1
    ? envelope(items.filter((p) => p.layer === layer - 1 && p.placed))
    : null;

  const margin = state?.stability_margin_m ?? null;
  const cog = state ? { x: X(state.cog_x), y: Y(state.cog_y) } : null;

  return {
    width, height,
    frame: boxRect({ x0: -PALLET_X / 2, x1: PALLET_X / 2, y0: -PALLET_Y / 2, y1: PALLET_Y / 2 }),
    planned: last?.planned_pose && last.dims_m
      ? rectOf(last.planned_pose.x, last.planned_pose.y, last.dims_m[0], last.dims_m[1])
      : null,
    packages,
    support: below ? boxRect(below) : null,
    cog,
    tone: stabilityState(margin),
    margin: cog && margin != null
      ? { x: cog.x + 18, y: cog.y + 4, text: signedMm(margin) } : null,
    widthLabel: { x: X(0), y: PAD.t - 12, text: mm(PALLET_X, 0) },
    depthLabel: { x: PAD.l - 14, y: Y(0), text: mm(PALLET_Y, 0) },
    caption: below && layer
      ? { x: X(0), y: height - 12,
          text: `polígono de soporte · contacto capa ${layer - 1}-${layer}` }
      : null,
  };
}
