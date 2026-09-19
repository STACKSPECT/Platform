import { Icon } from "../Icon";
import styles from "./Select.module.css";

export type SelectOption = { value: string; label: string };

type Props = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  label: string;
};

/** Selector nativo (teclado y móvil gratis) con el chevron del diseño encima. */
export function Select({ value, options, onChange, label }: Props) {
  return (
    <span className={styles.wrap}>
      <select
        className={styles.select}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span className={styles.chevron}><Icon name="chevronsUpDown" size={14} /></span>
    </span>
  );
}
