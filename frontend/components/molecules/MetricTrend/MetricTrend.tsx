import { Text, Trend, Value, type TrendPoint } from "../../atoms";
import { ChangePill } from "../ChangePill";
import styles from "./MetricTrend.module.css";

export type MetricChange = {
  direction: "up" | "down" | "flat";
  tone: "ok" | "bad" | "muted";
  /** «+23 puntos». */
  text: string;
};

type Props = {
  label: string;
  value: string;
  unit: string;
  /** `null` con un solo dato: no hay contra qué comparar. */
  change: MetricChange | null;
  /** Qué se está comparando: «desde el primero (41 %)». */
  note: string;
  points: TrendPoint[];
  tone: "ok" | "bad" | "muted";
  dashed?: boolean;
  chartLabel: string;
};

/** Una métrica de una serie, como un mosaico: dónde está ahora, cuánto ha cambiado desde el
 *  principio y cómo ha ido en el camino. Las tres cosas juntas responden a «¿vamos mejor?» de un
 *  vistazo. */
export function MetricTrend({
  label, value, unit, change, note, points, tone, dashed, chartLabel,
}: Props) {
  return (
    <div className={styles.tile}>
      <Text variant="label" tone="muted">{label}</Text>
      <Value value={value} unit={unit} size="lg" />

      <div className={styles.change}>
        {change
          ? <ChangePill direction={change.direction} tone={change.tone}>{change.text}</ChangePill>
          : <Text tone="faint">sin comparación</Text>}
        <Text variant="caption" tone="faint">{note}</Text>
      </div>

      <div className={styles.chart}>
        <Trend points={points} tone={tone} dashed={dashed} label={chartLabel} />
      </div>
    </div>
  );
}
