import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import styles from "./Button.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "link" | "outline";
};

export function Button({ variant = "link", className, type = "button", ...rest }: Props) {
  return <button type={type} className={cx(styles.button, styles[variant], className)} {...rest} />;
}
