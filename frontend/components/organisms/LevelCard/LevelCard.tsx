"use client";

import { useState } from "react";
import { Badge, Card, Icon, Text } from "../../atoms";
import { MetricTrend } from "../../molecules";
import { KIND_TEXT, type LevelCardView } from "./LevelCard.helper";
import styles from "./LevelCard.module.css";

/** Cómo va un nivel de una tarea: un veredicto arriba y, debajo, cada métrica con dónde está,
 *  cuánto ha cambiado y cómo ha ido. Las etiquetas avisan de lo que resta fiabilidad: datos que
 *  no son de verdad, o ejecuciones que se dejan fuera por no ser comparables.
 *
 *  Las métricas van plegadas: los niveles se cuentan por decenas y desplegarlos todos deja el
 *  veredicto de cada uno a una pantalla del siguiente, que es justo lo que esta pantalla existe
 *  para comparar. Plegada, la tarjeta sigue diciendo lo que importa: qué nivel es, con cuántas
 *  ejecuciones y cómo va. Se usa `<details>` y no un desplegable propio porque trae hechos el
 *  teclado, el foco y el «buscar en la página».
 *
 *  El estado se guarda aquí, y no se deja suelto en el DOM, porque la pantalla refresca sus datos
 *  sola: sin esto, un refetch volvería a plegar la tarjeta que acabas de abrir. */
export function LevelCard({ view, defaultOpen = false }: {
  view: LevelCardView;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const dashed = view.kind !== "measured";
  return (
    <Card className={styles.card}>
      <details className={styles.details} open={open}
               onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className={styles.header}>
          <span className={styles.chevron}><Icon name="chevronRight" /></span>
          <div className={styles.title}>
            <Text variant="body" size="lg" className={styles.name}>{view.title}</Text>
            <Text variant="caption" tone="faint">
              {[view.meta, view.seeds].filter(Boolean).join(" · ")}
            </Text>
          </div>
          <div className={styles.tags}>
            {view.kind !== "measured" && (
              <Badge tone={view.kind}>{KIND_TEXT[view.kind]}</Badge>
            )}
            {view.excluded > 0 && (
              <Badge tone="warn">+{view.excluded} con otras semillas</Badge>
            )}
            <Badge tone={view.verdict.tone === "muted" ? "neutral" : view.verdict.tone}>
              {view.verdict.label}
            </Badge>
          </div>
        </summary>

        <div className={styles.body}>
          {view.metrics.map((m) => (
            <MetricTrend key={m.key} label={m.label} help={m.help} value={m.value} unit={m.unit}
                         change={m.change} note={m.note} points={m.points} tone={m.tone}
                         dashed={dashed} chartLabel={m.chartLabel} />
          ))}
        </div>
      </details>
    </Card>
  );
}
