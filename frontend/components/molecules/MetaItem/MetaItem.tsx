import type { ReactNode } from "react";
import { Text } from "../../atoms";
import styles from "./MetaItem.module.css";

/** Par etiqueta / valor de la barra de identidad. `mono` para magnitudes, semillas y
 *  commits; sin él, para texto corriente. */
export function MetaItem({ label, value, mono = true }: {
  label: string; value: ReactNode; mono?: boolean;
}) {
  return (
    <span className={styles.item}>
      <Text variant="label" tone="faint">{label}</Text>
      <Text variant={mono ? "num" : "body"}>{value}</Text>
    </span>
  );
}
