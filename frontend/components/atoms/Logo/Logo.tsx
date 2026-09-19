import { cx } from "@/lib/cx";
import styles from "./Logo.module.css";

type Props = {
  /** `lockup`: marca + nombre. `mark`: solo el círculo con el brazo. */
  variant?: "lockup" | "mark";
  /** Alto de la marca, en px. El nombre se escala con ella. */
  size?: number;
};

/** El logo de STACKSPECT. Son imágenes usadas como máscara sobre `--logo`, no como fondo:
 *  así se pintan en el color del tema (blanco sobre negro, negro sobre blanco) sin duplicar
 *  el archivo ni dejar un recuadro de otro color. */
export function Logo({ variant = "lockup", size = 32 }: Props) {
  return (
    <span className={styles.logo} role="img" aria-label="STACKSPECT"
          style={{ ["--logo-size" as string]: `${size}px` }}>
      <span className={styles.mark} />
      <span className={cx(styles.word, variant === "mark" && styles.hidden)} />
    </span>
  );
}
