import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "../../atoms";
import { NavTab } from "../../molecules";
import styles from "./TopBar.module.css";

/** Barra global: el logo, dos destinos (la demo y el análisis) y, a la derecha, lo que se le
 *  pase. Run y Episodio se alcanzan desde la tabla: son detalle, no secciones. */
export function TopBar({ active, children }: { active: "live" | "runs"; children?: ReactNode }) {
  return (
    <header className={styles.bar}>
      <Link href="/" className={styles.brand} aria-label="STACKSPECT, ir a Live">
        <Logo size={34} />
      </Link>
      <nav className={styles.nav}>
        <NavTab href="/" active={active === "live"}>Live</NavTab>
        <NavTab href="/runs" active={active === "runs"}>Ejecuciones</NavTab>
      </nav>
      <span className={styles.spacer} />
      {children}
    </header>
  );
}
