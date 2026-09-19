import type { PalletState, Placement } from "@/lib/supabase";
import {
  PALLET_DEFAULT, drawable, envelope, lastPlacement, span,
  type Box, type PalletSize,
} from "@/lib/pallet";
import { mm, signedMm, stabilityState, type State } from "@/lib/ui";

const PAD = { l: 46, r: 24, t: 34, b: 40 };

type Rect = { x: number; y: number; width: number; height: number };
type Label = { x: number; y: number; text: string };
/** Giro ya en grados de pantalla, alrededor del centro del paquete. */
type Spin = { deg: number; cx: number; cy: number };

export type TopViewModel = {
  width: number;
  height: number;
  frame: Rect;
  /** El hueco planificado del último paquete: enseña cuánto se desvió. */
  planned: (Rect & { rotate?: Spin }) | null;
  packages: Array<Rect & {
    key: number; variant: "placed" | "last" | "failed"; label: Label | null;
    rotate?: Spin;
  }>;
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
  placements: Placement[], state: PalletState | null, height = 290,
  size: PalletSize = PALLET_DEFAULT,
): TopViewModel {
  const [PX, PY] = size;
  const scale = (height - PAD.t - PAD.b) / PY;
  const width = PX * scale + PAD.l + PAD.r;

  const X = (x: number) => PAD.l + (x + PX / 2) * scale;
  const Y = (y: number) => PAD.t + (PY / 2 - y) * scale;
  const rectOf = (cx: number, cy: number, dx: number, dy: number): Rect =>
    ({ x: X(cx - dx / 2), y: Y(cy + dy / 2), width: dx * scale, height: dy * scale });
  /* El paquete se dibuja sin girar y se gira con un `transform`, que es lo que mantiene
     el rectángulo (y su radio de esquina) intacto. +Y del mundo sube en pantalla, así
     que un giro antihorario en el palé se ve horario: el ángulo va cambiado de signo. */
  const spin = (cx: number, cy: number, yaw: number | undefined): Spin | undefined =>
    yaw ? { deg: (-yaw * 180) / Math.PI, cx: X(cx), cy: Y(cy) } : undefined;
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
      const { x, y, yaw } = p.actual_pose;
      const [dx, dy] = p.dims_m;
      return {
        key: p.seq,
        ...rectOf(x, y, dx, dy),
        rotate: spin(x, y, yaw),
        variant: (!p.placed ? "failed" : isLast ? "last" : "placed") as "placed" | "last" | "failed",
        // La etiqueta va sobre el paquete YA girado: de canto ocupa otro alto.
        label: isLast
          ? { x: X(x), y: Y(y + span(dy, dx, yaw) / 2) - 7, text: p.package_id }
          : null,
      };
    });

  const below = layer && layer > 1
    ? envelope(items.filter((p) => p.layer === layer - 1 && p.placed))
    : null;

  const margin = state?.stability_margin_m ?? null;
  const cog = state ? { x: X(state.cog_x), y: Y(state.cog_y) } : null;

  return {
    width, height,
    frame: boxRect({ x0: -PX / 2, x1: PX / 2, y0: -PY / 2, y1: PY / 2 }),
    planned: last?.planned_pose && last.dims_m
      ? {
          ...rectOf(last.planned_pose.x, last.planned_pose.y, last.dims_m[0], last.dims_m[1]),
          rotate: spin(last.planned_pose.x, last.planned_pose.y, last.planned_pose.yaw),
        }
      : null,
    packages,
    support: below ? boxRect(below) : null,
    cog,
    tone: stabilityState(margin),
    margin: cog && margin != null
      ? { x: cog.x + 18, y: cog.y + 4, text: signedMm(margin) } : null,
    widthLabel: { x: X(0), y: PAD.t - 12, text: mm(PX, 0) },
    depthLabel: { x: PAD.l - 14, y: Y(0), text: mm(PY, 0) },
    caption: below && layer
      ? { x: X(0), y: height - 12,
          text: `polígono de soporte · contacto capa ${layer - 1}-${layer}` }
      : null,
  };
}
