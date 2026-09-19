import { Text } from "../../atoms";
import styles from "./FailureStackBar.module.css";

type Segment = { key: string; n: number; color: string; title: string };

/** Una barra apilada: cada causa ocupa lo que pesa dentro de los fallos de ese run.
 *  Los anchos son `flex-grow: n`, así que no hace falta sumar nada en el cliente. */
export function FailureStackBar({ label, segments }: { label: string; segments: Segment[] }) {
  return (
    <div className={styles.row}>
      <Text variant="mono" tone="muted" className={styles.label}>{label}</Text>
      <div className={styles.bar}>
        {!segments.length && <Text tone="faint" className={styles.none}>sin fallos</Text>}
        {segments.map((s) => (
          <span key={s.key} className={styles.segment} title={`${s.title}: ${s.n}`}
                style={{ flexGrow: s.n, background: s.color }} />
        ))}
      </div>
    </div>
  );
}
