export type TipPosition = { left: number; top: number; side: "above" | "below" };

const GAP = 8;
const MARGIN = 8;

/** Dónde poner la explicación: centrada sobre el icono y, si arriba no cabe, debajo. Nunca se sale
 *  de la ventana: se empuja hacia dentro con un margen. Todo en píxeles de la ventana. */
export function placeTip(
  anchor: { left: number; right: number; top: number; bottom: number },
  tip: { width: number; height: number },
  view: { width: number; height: number },
): TipPosition {
  const centered = (anchor.left + anchor.right) / 2 - tip.width / 2;
  const left = Math.max(MARGIN, Math.min(centered, view.width - tip.width - MARGIN));

  const above = anchor.top - GAP - tip.height;
  if (above >= MARGIN) return { left, top: above, side: "above" };
  return { left, top: anchor.bottom + GAP, side: "below" };
}
