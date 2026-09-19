import type { ReactNode } from "react";
import { Card } from "../../atoms";
import { PanelHeader } from "../../molecules";
import { cx } from "@/lib/cx";
import styles from "./Panel.module.css";

type Props = {
  title: string;
  /** Lo que va a la derecha de la cabecera: una nota, una leyenda. */
  aside?: ReactNode;
  /** Relleno alrededor del contenido; para dibujos, no para listas a sangre. */
  padded?: boolean;
  className?: string;
  children: ReactNode;
};

/** Tarjeta con cabecera y cuerpo. El cuerpo es un hueco: no sabe qué se dibuja en él. */
export function Panel({ title, aside, padded, className, children }: Props) {
  return (
    <Card className={cx(styles.panel, className)}>
      <PanelHeader title={title}>{aside}</PanelHeader>
      <div className={cx(styles.body, padded && styles.padded)}>{children}</div>
    </Card>
  );
}
