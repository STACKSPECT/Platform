import { Button, Dot, Text } from "../../atoms";
import styles from "./Banner.module.css";

/** Aviso a todo el ancho. Hoy solo lo usa "conexión perdida": lo último recibido se
 *  queda visible y este banner lo dice. */
export function Banner({ message, detail, actionLabel, onAction }: {
  message: string; detail?: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className={styles.banner} role="alert">
      <Dot tone="warn" />
      <Text>{message}</Text>
      {detail && <Text tone="faint">{detail}</Text>}
      <span className={styles.spacer} />
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}
