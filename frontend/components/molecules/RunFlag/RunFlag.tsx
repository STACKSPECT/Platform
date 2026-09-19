import { Icon } from "../../atoms";
import { cx } from "@/lib/cx";
import styles from "./RunFlag.module.css";

const TEXT = {
  oracle: "Oracle: percepción sustituida por poses reales",
  synthetic: "Sembrado: datos generados, no medidos",
} as const;

/** La banderita de los runs cuyos números no son de verdad. El color es el mismo que en
 *  el resto de la interfaz (rosa oracle, violeta sembrado). */
export function RunFlag({ kind }: { kind: "oracle" | "synthetic" }) {
  return (
    <span className={cx(styles.flag, styles[kind])} title={TEXT[kind]} role="img"
          aria-label={TEXT[kind]}>
      <Icon name="flag" size={15} />
    </span>
  );
}
