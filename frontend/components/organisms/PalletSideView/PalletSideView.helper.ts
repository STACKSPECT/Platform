import type { PalletState, Placement } from "@/lib/supabase";
import {
  PALLET_DECK_M, PALLET_DEFAULT, drawable, lastPlacement, loadHeight,
  type PalletSize,
} from "@/lib/pallet";
import { mm, stabilityState, type State } from "@/lib/ui";

const PAD = { l: 46, r: 70, t: 24, b: 40 };

type Rect = { x: number; y: number; width: number; height: number };
type Label = { x: number; y: number; text: string };
type Line = { x1: number; y1: number; x2: number; y2: number };

export type SideViewModel = {
  width: number;
  height: number;
  deck: Rect;
  deckLabel: Label;
  packages: Array<Rect & { key: number; variant: "placed" | "last" | "failed" }>;
  cog: { line: Line; dot: { x: number; y: number }; label: Label } | null;
  /** Cota vertical de la altura de la carga; null si aún no hay nada apilado. */
  heightDim: { line: Line; label: Label } | null;
  tone: State;
  caption: Label;
};

/** El eje vertical arranca en la superficie del palé (z = 0); el palé se dibuja debajo. */
export function buildSideView(
  placements: Placement[], state: PalletState | null, height = 290,
  size: PalletSize = PALLET_DEFAULT,
): SideViewModel {
  const [PX] = size;
  const items = drawable(placements);
  const top = loadHeight(items);
  // Un 25 % de aire sobre la carga para que la cota no toque el borde.
  const zMax = Math.max(top * 1.25, 0.5);
  const scale = (height - PAD.t - PAD.b) / (PALLET_DECK_M + zMax);
  const width = PX * scale + PAD.l + PAD.r;

  const X = (x: number) => PAD.l + (x + PX / 2) * scale;
  const Z = (z: number) => PAD.t + (zMax - z) * scale;
  const last = lastPlacement(placements);
  const right = X(PX / 2);

  const packages = items.map((p) => ({
    key: p.seq,
    x: X(p.actual_pose.x - p.dims_m[0] / 2),
    y: Z(p.actual_pose.z + p.dims_m[2] / 2),
    width: p.dims_m[0] * scale,
    height: p.dims_m[2] * scale,
    variant: (!p.placed ? "failed" : p.seq === last?.seq ? "last" : "placed") as
      "placed" | "last" | "failed",
  }));

  return {
    width, height,
    deck: { x: X(-PX / 2), y: Z(0), width: PX * scale, height: PALLET_DECK_M * scale },
    deckLabel: { x: X(-PX / 2) + 10, y: Z(-PALLET_DECK_M / 2) + 4,
                 text: `palé ${mm(PALLET_DECK_M, 0)}` },
    packages,
    cog: state
      ? {
          line: { x1: PAD.l - 20, y1: Z(state.cog_z), x2: right, y2: Z(state.cog_z) },
          dot: { x: X(state.cog_x), y: Z(state.cog_z) },
          label: { x: right - 6, y: Z(state.cog_z) - 8, text: `CoG ${mm(state.cog_z, 0)}` },
        }
      : null,
    heightDim: top > 0
      ? {
          line: { x1: right + 24, y1: Z(0), x2: right + 24, y2: Z(top) },
          label: { x: right + 40, y: (Z(0) + Z(top)) / 2, text: mm(top, 0) },
        }
      : null,
    tone: stabilityState(state?.stability_margin_m),
    caption: { x: X(0), y: height - 12, text: "apilar alto reduce el margen" },
  };
}
