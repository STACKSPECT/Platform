import { cx } from "@/lib/cx";
import styles from "./SceneRect.module.css";

export type SceneRectVariant =
  | "frame" | "deck" | "planned" | "placed" | "last" | "failed" | "support";

type Props = {
  x: number; y: number; width: number; height: number;
  variant: SceneRectVariant;
  /** Solo lo usa `support`: toma el color del estado de estabilidad. */
  tone?: "ok" | "warn" | "bad";
  /** Giro del paquete, ya en grados de pantalla y alrededor de su centro. Lo calcula
   *  quien sabe de metros; aquí solo se aplica. */
  rotate?: { deg: number; cx: number; cy: number };
};

/** Un rectángulo del dibujo del palé. Coordenadas ya en píxeles: no sabe de metros. */
export function SceneRect({ variant, tone = "ok", rotate, ...box }: Props) {
  const rx = variant === "frame" || variant === "deck" ? 8 : 3;
  return (
    <rect className={cx(styles.rect, styles[variant], styles[tone])} rx={rx} {...box}
          transform={rotate ? `rotate(${rotate.deg} ${rotate.cx} ${rotate.cy})` : undefined} />
  );
}
