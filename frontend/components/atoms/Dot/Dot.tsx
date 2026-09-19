import { cx } from "@/lib/cx";
import styles from "./Dot.module.css";

export type DotTone = "ok" | "warn" | "bad" | "muted";

export function Dot({ tone = "muted", pulse }: { tone?: DotTone; pulse?: boolean }) {
  return <span aria-hidden="true" className={cx(styles.dot, styles[tone], pulse && styles.pulse)} />;
}
