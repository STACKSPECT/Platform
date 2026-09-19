import { Text } from "../../atoms";
import { cx } from "@/lib/cx";
import styles from "./LegendItem.module.css";

/** Muestra de un trazo del dibujo y su nombre. */
export function LegendItem({ label, swatch }: {
  label: string; swatch: "planned" | "last" | "support";
}) {
  return (
    <span className={styles.item}>
      <span aria-hidden="true" className={cx(styles.swatch, styles[swatch])} />
      <Text variant="caption" tone="faint">{label}</Text>
    </span>
  );
}
