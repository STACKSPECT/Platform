import styles from "./Swatch.module.css";

/** Cuadrado de color. El color viene de fuera (`failureColor()` para las causas de
 *  fallo): es un dato de identidad, no una decisión de este componente. */
export function Swatch({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span aria-hidden="true" className={styles.swatch}
          style={{ background: color, width: size, height: size }} />
  );
}
