import type { Run } from "@/lib/supabase";
import { Card, Table, Th } from "../../atoms";
import { InfoMessage } from "../../molecules";
import { RunRow } from "../RunRow";
import styles from "./RunsTable.module.css";
import { buildRows } from "./RunsTable.helper";

type Props = {
  runs: Run[];
  selectedIds: string[];
  /** Ya hay las que se pueden comparar: las casillas sin marcar se bloquean. */
  selectionFull: boolean;
  onToggle: (id: string) => void;
};

/** La lista de ejecuciones. La selección para comparar va en la primera columna: el resto
 *  de la fila queda libre para navegar al detalle. */
export function RunsTable({ runs, selectedIds, selectionFull, onToggle }: Props) {
  if (!runs.length) {
    return (
      <Card className={styles.card}>
        <InfoMessage title="Ninguna ejecución coincide con los filtros">
          Prueba a quitar alguno de ellos.
        </InfoMessage>
      </Card>
    );
  }

  return (
    <Card className={styles.card}>
      <Table>
        <thead>
          <tr>
            <Th align="center" label="Comparar" />
            <Th>Commit</Th>
            <Th>Tarea</Th>
            <Th>Nivel</Th>
            <Th>Vel</Th>
            <Th align="right">Episodios</Th>
            <Th align="right">Éxito</Th>
            <Th>Éxito por episodio</Th>
            <Th align="right">Ciclo</Th>
            <Th>Causa dominante</Th>
            <Th align="right">Cuándo</Th>
          </tr>
        </thead>
        <tbody>
          {buildRows(runs, selectedIds).map(({ view, selected }) => (
            <RunRow key={view.id} view={view} selected={selected}
                  selectionBlocked={selectionFull && !selected} onToggle={onToggle} />
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
