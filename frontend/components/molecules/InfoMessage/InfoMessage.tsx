import type { ReactNode } from "react";
import { Text } from "../../atoms";
import styles from "./InfoMessage.module.css";

/** Mensaje informativo dentro de un panel: qué pasa y, debajo, qué hacer. */
export function InfoMessage({ title, tone = "info", children }: {
  title: string; tone?: "info" | "warn"; children?: ReactNode;
}) {
  return (
    <div className={styles.message} role="status">
      <Text variant="body" tone={tone === "warn" ? "warn" : "default"}>{title}</Text>
      {children && <div className={styles.body}>{children}</div>}
    </div>
  );
}
