import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Card.module.css";

type Props = {
  /** Borde de color: solo los tres estados de la interfaz. */
  state?: "ok" | "warn" | "bad";
  className?: string;
  children: ReactNode;
};

/** Superficie con borde. No sabe qué lleva dentro. */
export function Card({ state, className, children }: Props) {
  return <div className={cx(styles.card, state && styles[state], className)}>{children}</div>;
}
