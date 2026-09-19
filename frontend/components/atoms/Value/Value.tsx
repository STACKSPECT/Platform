import { cx } from "@/lib/cx";
import styles from "./Value.module.css";
import type { TextTone } from "../Text";

type Props = {
  value: string;
  unit?: string;
  size?: "md" | "lg" | "xl";
  tone?: TextTone;
};

/** Un número con su unidad al lado, más pequeña. La unidad viene siempre de fuera:
 *  este componente nunca decide una. */
export function Value({ value, unit, size = "md", tone = "default" }: Props) {
  return (
    <span className={cx(styles.value, styles[size])}>
      <span className={cx(styles.num, styles[tone])}>{value}</span>
      {unit && <span className={styles.unit}>{unit}</span>}
    </span>
  );
}
