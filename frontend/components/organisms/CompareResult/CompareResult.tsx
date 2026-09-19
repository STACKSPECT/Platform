import { Text } from "../../atoms";
import { ColorLegendItem, DeltaStat, FailureStackBar } from "../../molecules";
import type { BarView, DeltaView, LegendView } from "../ComparePanel/ComparePanel.helper";
import styles from "./CompareResult.module.css";

type Props = {
  deltas: DeltaView[];
  failuresTitle: string;
  bars: BarView[];
  legend: LegendView[];
};

/** El resultado de una comparación válida: los deltas y el reparto de causas de fallo. */
export function CompareResult({ deltas, failuresTitle, bars, legend }: Props) {
  return (
    <div className={styles.result}>
      {deltas.map((d) => (
        <section key={d.label} className={styles.column}><DeltaStat {...d} /></section>
      ))}
      <section className={styles.failures}>
        <Text variant="label" tone="muted">{failuresTitle}</Text>
        <div className={styles.bars}>
          {bars.map((b) => <FailureStackBar key={b.label} {...b} />)}
        </div>
        <div className={styles.legend}>
          {legend.map((l) => <ColorLegendItem key={l.key} label={l.label} color={l.color} />)}
        </div>
      </section>
    </div>
  );
}
