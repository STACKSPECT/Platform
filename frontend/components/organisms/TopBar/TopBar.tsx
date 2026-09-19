import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "../../atoms";
import { routes } from "@/lib/routes";
import { NavTab } from "../../molecules";
import styles from "./TopBar.module.css";

/** Barra global: el logo, tres destinos (el resumen, la demo y el análisis) y, a la derecha, lo que
 *  se le pase. Run y Episodio se alcanzan desde la tabla: son detalle, no secciones. */
export function TopBar({ active, children }: {
  active: "dashboard" | "live" | "runs"; children?: ReactNode;
}) {
  return (
    <header className={styles.bar}>
      <Link href={routes.dashboard} className={styles.brand} aria-label="STACKSPECT, ir al resumen">
        <Logo size={34} />
      </Link>
      <nav className={styles.nav}>
        <NavTab href={routes.dashboard} active={active === "dashboard"}>Resumen</NavTab>
        <NavTab href={routes.live} active={active === "live"}>Live</NavTab>
        <NavTab href={routes.runs} active={active === "runs"}>Ejecuciones</NavTab>
      </nav>
      <span className={styles.spacer} />
      {children}
    </header>
  );
}
