import type { ReactNode } from "react";
import { Text } from "../../atoms";
import styles from "./Notice.module.css";

/** Pantalla de un solo mensaje: cargando, sin configurar, sin datos. */
export function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className={styles.notice}>
      <h1 className={styles.title}>{title}</h1>
      <Text as="p" tone="muted" className={styles.body}>{children}</Text>
    </main>
  );
}
