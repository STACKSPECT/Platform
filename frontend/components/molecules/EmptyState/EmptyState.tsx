import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, Text, type IconName } from "../../atoms";
import styles from "./EmptyState.module.css";

type Props = {
  icon?: IconName;
  title: string;
  children: ReactNode;
  /** Una salida clara: adónde ir mientras no haya nada que ver. */
  actionHref?: string;
  actionLabel?: string;
};

/** Pantalla vacía a propósito: centrada, con un icono, qué pasa y qué hacer. No es un error
 *  ni una carga; es un estado normal que se ve mucho. */
export function EmptyState({ icon = "circleDot", title, children, actionHref, actionLabel }: Props) {
  return (
    <main className={styles.screen}>
      <div className={styles.card}>
        <span className={styles.icon}><Icon name={icon} size={26} /></span>
        <h1 className={styles.title}>{title}</h1>
        <Text as="p" tone="muted" size="md" className={styles.body}>{children}</Text>
        {actionHref && actionLabel && (
          <Link href={actionHref} className={styles.action}>{actionLabel}</Link>
        )}
      </div>
    </main>
  );
}
