import type { ElementType, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Text.module.css";

export type TextVariant = "label" | "body" | "num" | "mono" | "caption";
export type TextSize = "sm" | "md" | "lg";
export type TextTone = "default" | "muted" | "faint" | "ok" | "warn" | "bad" | "select";

type Props = {
  as?: ElementType;
  variant?: TextVariant;
  tone?: TextTone;
  /** `sm` es el de interfaz (13 px); `md` y `lg` para tablas y cifras de apoyo. */
  size?: TextSize;
  /** Corta con puntos suspensivos en una sola línea. */
  truncate?: boolean;
  className?: string;
  children: ReactNode;
};

/** Toda la tipografía de la interfaz pasa por aquí: tres voces, cinco variantes. */
export function Text({
  as: Tag = "span", variant = "body", tone = "default", size = "sm", truncate, className, children,
}: Props) {
  return (
    <Tag className={cx(styles.text, styles[variant], styles[tone], styles[size],
                       truncate && styles.truncate, className)}>
      {children}
    </Tag>
  );
}
