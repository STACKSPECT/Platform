import { cx } from "@/lib/cx";
import styles from "./Divider.module.css";

export function Divider({ orientation = "horizontal" }: {
  orientation?: "horizontal" | "vertical";
}) {
  return <span aria-hidden="true" className={cx(styles.divider, styles[orientation])} />;
}
