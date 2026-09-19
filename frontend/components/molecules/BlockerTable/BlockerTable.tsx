import { Text } from "../../atoms";
import styles from "./BlockerTable.module.css";

type Blocker = { field: string; a: string; b: string; why: string };

/** Por qué dos ejecuciones no miden lo mismo: qué campo, qué valen y por qué importa. */
export function BlockerTable({ blockers }: { blockers: Blocker[] }) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <tbody>
          {blockers.map((b) => (
            <tr key={b.field}>
              <td><Text variant="label" tone="muted">{b.field}</Text></td>
              <td><Text variant="num">{b.a}</Text></td>
              <td><Text variant="num">{b.b}</Text></td>
              <td><Text tone="muted">{b.why}</Text></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
