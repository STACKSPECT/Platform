import type { ReactNode } from "react";
import { Text } from "../../atoms";
import { NavTab } from "../../molecules";
import styles from "./TopBar.module.css";

/** Barra global. Dos destinos y nada más: la demo (Live) y el análisis (Ejecuciones); Run y
 *  Episodio se alcanzan desde la tabla, son detalle. `children` es lo que va a la derecha. */
export function TopBar({ active, children }: { active: "live" | "runs"; children?: ReactNode }) {
  return (
    <header className={styles.bar}>
      <Text variant="label" tone="default" size="lg" className={styles.title}>
        Observabilidad de paletizado
      </Text>
      <nav className={styles.nav}>
        <NavTab href="/" active={active === "live"}>Live</NavTab>
        <NavTab href="/runs" active={active === "runs"}>Ejecuciones</NavTab>
      </nav>
      <span className={styles.spacer} />
      {children}
    </header>
  );
}
