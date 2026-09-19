import { cx } from "@/lib/cx";
import styles from "./GuideLine.module.css";

type Props = {
  x1: number; y1: number; x2: number; y2: number;
  tone?: "faint" | "ok" | "warn" | "bad";
  dashed?: boolean;
};

/** Línea de cota o de referencia. */
export function GuideLine({ tone = "faint", dashed, ...points }: Props) {
  return <line className={cx(styles.line, styles[tone], dashed && styles.dashed)} {...points} />;
}
