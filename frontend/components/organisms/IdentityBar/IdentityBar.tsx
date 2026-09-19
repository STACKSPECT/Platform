import { Badge, Divider, Value } from "../../atoms";
import { MetaItem, StatusIndicator } from "../../molecules";
import type { IdentityView } from "./IdentityBar.helper";
import styles from "./IdentityBar.module.css";

/** Quién es el episodio que se está viendo: estado, tarea, semilla, commit y reloj. */
export function IdentityBar({ status, meta, oracle, synthetic, counter, clock }: IdentityView) {
  return (
    <header className={styles.bar}>
      <StatusIndicator label={status.label} tone={status.tone} pulse={status.pulse} />
      <Divider orientation="vertical" />
      {meta.map((m) => <MetaItem key={m.label} label={m.label} value={m.value} mono={m.mono} />)}

      <span className={styles.spacer} />

      {oracle && <Badge tone="oracle">Oracle</Badge>}
      {synthetic && <Badge tone="synthetic">Sembrado</Badge>}
      {counter && <MetaItem label="Episodio" value={counter} />}
      <Value value={clock.value} unit={clock.unit} size="md" />
    </header>
  );
}
