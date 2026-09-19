import { Card, Text, Value } from "../../atoms";
import { cx } from "@/lib/cx";
import styles from "./KpiCard.module.css";

type Props = {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  state?: "ok" | "warn" | "bad";
};

/** Un indicador para leerse a tres metros: etiqueta, número enorme y unidad al lado.
 *  Con `state`, el borde y el número toman el color del estado. */
export function KpiCard({ label, value, unit, note, state }: Props) {
  return (
    <Card state={state} className={cx(styles.kpi, state && styles.accent)}>
      <Text variant="label" tone={state ?? "muted"}>{label}</Text>
      <Value value={value} unit={unit} size="xl" tone={state} />
      {note && <Text variant="caption" tone="faint">{note}</Text>}
    </Card>
  );
}
