import { Card, Dot, Text, Value } from "../../atoms";
import styles from "./KpiCard.module.css";

type Props = {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  state?: "ok" | "warn" | "bad";
};

/** Un indicador para leerse a tres metros: etiqueta, número enorme y unidad al lado. Con
 *  `state`, el número y un punto junto a la etiqueta toman el color del estado. */
export function KpiCard({ label, value, unit, note, state }: Props) {
  return (
    <Card className={styles.kpi}>
      <div className={styles.head}>
        <Text variant="label" tone="muted">{label}</Text>
        {state && <Dot tone={state} />}
      </div>
      <Value value={value} unit={unit} size="xl" tone={state} />
      {note && <Text variant="caption" tone="faint">{note}</Text>}
    </Card>
  );
}
