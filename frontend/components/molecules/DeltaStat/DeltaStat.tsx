import { Text, Value } from "../../atoms";
import styles from "./DeltaStat.module.css";

type Props = {
  label: string;
  /** Ya formateado con su signo: «+23». */
  value: string;
  unit: string;
  /** «41 % → 64 %». */
  detail: string;
  /** Verde si mejora, rojo si empeora, neutro si no cambia. */
  tone: "ok" | "bad" | "muted";
};

export function DeltaStat({ label, value, unit, detail, tone }: Props) {
  return (
    <div className={styles.stat}>
      <Text variant="label" tone="muted">{label}</Text>
      <Value value={value} unit={unit} size="xl" tone={tone} />
      <Text variant="num" tone="faint">{detail}</Text>
    </div>
  );
}
