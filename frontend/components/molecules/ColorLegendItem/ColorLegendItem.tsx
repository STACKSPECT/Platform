import { Swatch, Text } from "../../atoms";
import styles from "./ColorLegendItem.module.css";

/** Leyenda de un color de causa de fallo. */
export function ColorLegendItem({ label, color }: { label: string; color: string }) {
  return (
    <span className={styles.item}>
      <Swatch color={color} />
      <Text tone="muted">{label}</Text>
    </span>
  );
}
