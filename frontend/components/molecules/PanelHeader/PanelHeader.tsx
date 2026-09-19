import type { ReactNode } from "react";
import { Text } from "../../atoms";
import styles from "./PanelHeader.module.css";

/** Cabecera de panel: título a la izquierda y, a la derecha, lo que se le pase (una
 *  nota, una leyenda). */
export function PanelHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={styles.header}>
      <Text variant="label" tone="muted">{title}</Text>
      {children && <div className={styles.aside}>{children}</div>}
    </div>
  );
}
