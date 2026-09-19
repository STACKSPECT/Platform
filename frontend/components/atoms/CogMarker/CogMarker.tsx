import { cx } from "@/lib/cx";
import styles from "./CogMarker.module.css";

type Props = {
  x: number; y: number;
  tone: "ok" | "warn" | "bad";
  /** `cross` para la planta (mira la posición); `dot` para el alzado (mira la altura). */
  variant?: "cross" | "dot";
};

/** El centro de gravedad. El color es el estado de estabilidad, nunca decoración. */
export function CogMarker({ x, y, tone, variant = "cross" }: Props) {
  return (
    <g className={cx(styles.cog, styles[tone])}>
      {variant === "cross" && (
        <>
          <line x1={x - 13} y1={y} x2={x + 13} y2={y} />
          <line x1={x} y1={y - 13} x2={x} y2={y + 13} />
          <circle cx={x} cy={y} r={6} className={styles.ring} />
        </>
      )}
      {variant === "dot" && <circle cx={x} cy={y} r={5} className={styles.solid} />}
    </g>
  );
}
