import { Button, Dot, Text } from "../../atoms";
import { cx } from "@/lib/cx";
import styles from "./Banner.module.css";

type Props = {
  message: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** `warn` para un problema (conexión perdida); `info` para algo que solo hay que saber. */
  tone?: "warn" | "info";
};

/** Aviso a todo el ancho, debajo de la identidad. */
export function Banner({ message, detail, actionLabel, onAction, tone = "warn" }: Props) {
  return (
    <div className={cx(styles.banner, styles[tone])} role={tone === "warn" ? "alert" : "status"}>
      <Dot tone={tone === "warn" ? "warn" : "muted"} />
      <Text>{message}</Text>
      {detail && <Text tone="faint">{detail}</Text>}
      <span className={styles.spacer} />
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}
