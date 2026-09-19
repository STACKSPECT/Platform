import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Table.module.css";

type Align = "left" | "right" | "center";

/** Tabla con scroll horizontal propio: en pantallas estrechas se desplaza la tarjeta,
 *  no la página. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}

export function Th({ align = "left", label, children }: {
  align?: Align; label?: string; children?: ReactNode;
}) {
  return <th className={cx(styles.th, styles[align])} aria-label={label}>{children}</th>;
}

export function Td({ align = "left", children }: { align?: Align; children?: ReactNode }) {
  return <td className={cx(styles.td, styles[align])}>{children}</td>;
}

type RowState = "selected" | "oracle" | "synthetic";

/** Una fila. `state` (uno solo: quien la use decide la prioridad) pinta la barra izquierda y el fondo; `onClick` deja la fila lista
 *  para navegar sin cambiar el componente. */
export function Tr({ state, onClick, children }: {
  state?: RowState; onClick?: () => void; children: ReactNode;
}) {
  return (
    <tr className={cx(styles.tr, state && styles[state], onClick && styles.clickable)}
        onClick={onClick}>
      {children}
    </tr>
  );
}
