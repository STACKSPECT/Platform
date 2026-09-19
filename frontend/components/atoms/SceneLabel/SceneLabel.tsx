import { cx } from "@/lib/cx";
import styles from "./SceneLabel.module.css";

type Props = {
  x: number; y: number;
  text: string;
  anchor?: "start" | "middle" | "end";
  /** Grados; -90 para las cotas verticales. */
  rotate?: number;
  tone?: "faint" | "muted" | "ok" | "warn" | "bad";
};

/** Texto dentro de un SVG. Siempre monoespaciado: lo que se rotula son magnitudes. */
export function SceneLabel({ x, y, text, anchor = "start", rotate, tone = "faint" }: Props) {
  return (
    <text x={x} y={y} textAnchor={anchor}
          transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
          className={cx(styles.label, styles[tone])}>
      {text}
    </text>
  );
}
