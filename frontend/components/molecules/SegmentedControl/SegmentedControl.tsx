import { Text } from "../../atoms";
import { cx } from "@/lib/cx";
import styles from "./SegmentedControl.module.css";

type Option = { value: string; label: string; count?: number };

type Props = {
  /** Comparten `name` para ser un solo grupo: las flechas del teclado cambian de opción. */
  name: string;
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
};

/** Elegir una opción entre pocas, siempre a la vista. Radios nativos: teclado y lector de
 *  pantalla gratis. `count` dice cuántas ejecuciones hay detrás de cada una. */
export function SegmentedControl({ name, label, options, value, onChange }: Props) {
  return (
    <div className={styles.group} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value} className={cx(styles.option, o.count === 0 && styles.empty)}>
          <input type="radio" name={name} value={o.value} className={styles.input}
                 checked={o.value === value} onChange={() => onChange(o.value)} />
          <span className={styles.face}>
            {o.label}
            {o.count != null && (
              <Text variant="mono" size="sm" className={styles.count}>{o.count}</Text>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}
