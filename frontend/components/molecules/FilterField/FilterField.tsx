import { Select, Text, type SelectOption } from "../../atoms";
import styles from "./FilterField.module.css";

/** Un filtro de la barra: etiqueta en versal y su selector. */
export function FilterField({ label, value, options, onChange }: {
  label: string; value: string; options: SelectOption[]; onChange: (v: string) => void;
}) {
  return (
    <span className={styles.field}>
      <Text variant="label" tone="muted">{label}</Text>
      <Select label={`Filtrar por ${label.toLowerCase()}`}
              value={value} options={options} onChange={onChange} />
    </span>
  );
}
