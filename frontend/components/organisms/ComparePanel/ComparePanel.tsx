import { Badge, Card, Icon, Text } from "../../atoms";
import { InfoMessage } from "../../molecules";
import { CompareBlocked } from "../CompareBlocked";
import { CompareResult } from "../CompareResult";
import { buildComparison, type ComparePair } from "./ComparePanel.helper";
import styles from "./ComparePanel.module.css";

/** La comparativa entre dos ejecuciones, con tres estados: sin pareja elegida, pareja que
 *  no se puede comparar (con sus motivos) y comparación válida. */
export function ComparePanel({ pair }: { pair: ComparePair | null }) {
  const view = buildComparison(pair);

  return (
    <Card>
      <div className={styles.header}>
        <Text variant="label" tone="muted">Comparativa</Text>

        {view.kind !== "empty" && (
          <>
            <Text variant="mono" size="lg">{view.header.newer}</Text>
            <Text tone="faint">vs</Text>
            <Text variant="mono" size="lg">{view.header.base}</Text>
          </>
        )}
        {view.kind === "valid" && <Text variant="mono" tone="faint">{view.descriptor}</Text>}

        <span className={styles.spacer} />

        {view.kind === "valid" && (
          <>
            <Badge tone="ok"><Icon name="check" size={13} />Comparación válida</Badge>
            <Text variant="mono" tone="muted">{view.note}</Text>
          </>
        )}
        {view.kind === "blocked" && <Badge tone="bad">No comparable</Badge>}
      </div>

      {view.kind === "empty" && (
        <InfoMessage title="Selecciona 2 ejecuciones para compararlas">
          <Text tone="muted">Marca la casilla de la primera columna en dos filas de la tabla.</Text>
        </InfoMessage>
      )}
      {view.kind === "blocked" && <CompareBlocked blockers={view.blockers} />}
      {view.kind === "valid" && (
        <CompareResult deltas={view.deltas} failuresTitle={view.failuresTitle}
                       bars={view.bars} legend={view.legend} />
      )}
    </Card>
  );
}
