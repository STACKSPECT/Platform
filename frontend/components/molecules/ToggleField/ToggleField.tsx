import { Checkbox, Text } from "../../atoms";
import { cx } from "@/lib/cx";
import styles from "./ToggleField.module.css";

/** Interruptor con nombre: casilla + texto dentro de un recuadro. `tone="oracle"` lo tiñe
 *  del color de los datos que no son de verdad, porque de eso trata. */
export function ToggleField({ label, checked, onChange, tone = "neutral" }: {
  label: string; checked: boolean; onChange: (c: boolean) => void; tone?: "neutral" | "oracle";
}) {
  return (
    <span className={cx(styles.toggle, styles[tone])}>
      <Checkbox label={label} checked={checked} onChange={onChange}>
        <Text tone={tone === "oracle" ? "default" : "muted"} size="md">{label}</Text>
      </Checkbox>
    </span>
  );
}
