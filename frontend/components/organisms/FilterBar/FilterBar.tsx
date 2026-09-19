import { Button, Card, Text } from "../../atoms";
import { FilterField, ToggleField } from "../../molecules";
import {
  selectionText, type FilterOptions, type RunFilters,
} from "./FilterBar.helper";
import styles from "./FilterBar.module.css";

type Props = {
  filters: RunFilters;
  options: FilterOptions;
  selectedCount: number;
  onChange: (patch: Partial<RunFilters>) => void;
  onClear: () => void;
};

export function FilterBar({ filters, options, selectedCount, onChange, onClear }: Props) {
  return (
    <Card className={styles.bar}>
      <FilterField label="Tarea" value={filters.task} options={options.task}
                   onChange={(task) => onChange({ task })} />
      <FilterField label="Nivel" value={filters.level} options={options.level}
                   onChange={(level) => onChange({ level })} />
      <FilterField label="Commit" value={filters.commit} options={options.commit}
                   onChange={(commit) => onChange({ commit })} />
      <FilterField label="Velocidad" value={filters.speed} options={options.speed}
                   onChange={(speed) => onChange({ speed })} />
      <ToggleField label="ocultar oracle" tone="oracle" checked={filters.hideOracle}
                   onChange={(hideOracle) => onChange({ hideOracle })} />

      <span className={styles.spacer} />

      <Text variant="mono" tone="muted" size="md">{selectionText(selectedCount)}</Text>
      <Button variant="outline" disabled={selectedCount === 0} onClick={onClear}>Limpiar</Button>
    </Card>
  );
}
