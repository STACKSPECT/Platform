import { cx } from "@/lib/cx";
import styles from "./SceneRect.module.css";

export type SceneRectVariant =
  | "frame" | "deck" | "planned" | "placed" | "last" | "failed" | "support";

type Props = {
  x: number; y: number; width: number; height: number;
  variant: SceneRectVariant;
  /** Solo lo usa `support`: toma el color del estado de estabilidad. */
  tone?: "ok" | "warn" | "bad";
};

/** Un rectángulo del dibujo del palé. Coordenadas ya en píxeles: no sabe de metros. */
export function SceneRect({ variant, tone = "ok", ...box }: Props) {
  return <rect className={cx(styles.rect, styles[variant], styles[tone])} {...box} />;
}
