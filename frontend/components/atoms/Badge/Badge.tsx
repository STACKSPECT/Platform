import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Badge.module.css";

/** `oracle` y `synthetic` van con trama diagonal a propósito: son números que no son de
 *  verdad y tienen que molestar a la vista. */
export function Badge({ tone = "neutral", children }: {
  tone?: "neutral" | "oracle" | "synthetic" | "ok" | "bad"; children: ReactNode;
}) {
  return <span className={cx(styles.badge, styles[tone])}>{children}</span>;
}
