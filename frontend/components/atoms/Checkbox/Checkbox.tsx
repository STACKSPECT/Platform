import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Checkbox.module.css";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Nombre accesible: sin texto visible al lado, el lector de pantalla lo necesita. */
  label: string;
  disabled?: boolean;
  /** Explica por qué está bloqueada, al pasar el ratón. */
  title?: string;
  /** Texto visible al lado: entonces toda la etiqueta es el área pulsable. */
  children?: ReactNode;
};

/** Casilla nativa con el aspecto del diseño. La etiqueta que la envuelve da el área
 *  táctil de ~40 px sin agrandar el dibujo. */
export function Checkbox({ checked, onChange, label, disabled, title, children }: Props) {
  return (
    <label className={cx(styles.hit, Boolean(children) && styles.withText)} title={title}>
      <input
        type="checkbox"
        className={styles.box}
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}
