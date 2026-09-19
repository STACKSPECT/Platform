import Link from "next/link";
import { Icon, Text } from "../../atoms";
import type { RunHeaderView } from "./RunHeader.helper";
import styles from "./RunHeader.module.css";

type Props = RunHeaderView & {
  backHref: string;
  backLabel: string;
};

/** Cabecera del detalle de una ejecución: cómo volver a la lista y de cuál se trata. */
export function RunHeader({ backHref, backLabel, title, note, meta }: Props) {
  return (
    <div className={styles.header}>
      <Link href={backHref} className={styles.back}>
        <Icon name="arrowLeft" size={16} />{backLabel}
      </Link>
      <span className={styles.title}>
        <Text variant="mono" size="lg" className={styles.name}>{title}</Text>
        {note && <Text tone="muted">{note}</Text>}
      </span>
      <span className={styles.spacer} />
      <Text variant="mono" tone="faint">{meta}</Text>
    </div>
  );
}
