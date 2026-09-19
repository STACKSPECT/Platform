import type { Blocker } from "@/lib/supabase";
import { Text } from "../../atoms";
import { BlockerTable, InfoMessage } from "../../molecules";
import { BLOCK_RULES } from "../ComparePanel/ComparePanel.helper";
import styles from "./CompareBlocked.module.css";

/** No es un error: es la garantía. Bloquear una comparación impide enseñar un delta
 *  entre dos ejecuciones que no miden lo mismo. */
export function CompareBlocked({ blockers }: { blockers: Blocker[] }) {
  return (
    <InfoMessage title="Estas dos ejecuciones no miden lo mismo" tone="warn">
      <BlockerTable blockers={blockers} />
      <div className={styles.rules}>
        <Text variant="label" tone="muted">La comparación se bloquea cuando</Text>
        {BLOCK_RULES.map((r) => <Text key={r} tone="muted">— {r}</Text>)}
        <Text tone="faint" className={styles.note}>
          Con las semillas en común se puede ver el subconjunto, nunca el delta agregado.
        </Text>
      </div>
    </InfoMessage>
  );
}
