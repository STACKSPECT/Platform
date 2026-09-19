import type { ReactNode } from "react";
import { Badge, Divider, Value } from "../../atoms";
import { MetaItem, StatusIndicator } from "../../molecules";
import type { IdentityView } from "./IdentityBar.helper";
import styles from "./IdentityBar.module.css";

/** Quién es el episodio que se está viendo: estado, tarea, semilla, commit y reloj. */
type Props = IdentityView & {
  /** Sustituye al «3 / 25»: el selector de episodio del detalle de una ejecución. */
  picker?: ReactNode;
};

export function IdentityBar({
  status, meta, oracle, synthetic, counter, clock, picker,
}: Props) {
  return (
    <header className={styles.bar}>
      <StatusIndicator label={status.label} tone={status.tone} pulse={status.pulse} />
      <Divider orientation="vertical" />
      {meta.map((m) => <MetaItem key={m.label} label={m.label} value={m.value} mono={m.mono} />)}

      <span className={styles.spacer} />

      {oracle && <Badge tone="oracle">Oracle</Badge>}
      {synthetic && <Badge tone="synthetic">Sembrado</Badge>}
      {picker ?? (counter && <MetaItem label="Episodio" value={counter} />)}
      <Value value={clock.value} unit={clock.unit} size="md" />
    </header>
  );
}
