import { Badge, Card, Text } from "../../atoms";
import { MetricTrend } from "../../molecules";
import { KIND_TEXT, type LevelCardView } from "./LevelCard.helper";
import styles from "./LevelCard.module.css";

/** Cómo va un nivel de una tarea: un veredicto arriba y, debajo, cada métrica con dónde está,
 *  cuánto ha cambiado y cómo ha ido. Las etiquetas avisan de lo que resta fiabilidad: datos que
 *  no son de verdad, o ejecuciones que se dejan fuera por no ser comparables. */
export function LevelCard({ view }: { view: LevelCardView }) {
  const dashed = view.kind !== "measured";
  return (
    <Card className={styles.card}>
      <header className={styles.header}>
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
            <span title="Estas ejecuciones usaron otro rango de semillas y no se comparan con las de la curva: con otras semillas se compara suerte, no código.">
              <Badge tone="warn">+{view.excluded} con otras semillas</Badge>
            </span>
          )}
          <span title={view.verdict.detail}>
            <Badge tone={view.verdict.tone === "muted" ? "neutral" : view.verdict.tone}>
              {view.verdict.label}
            </Badge>
          </span>
        </div>
      </header>

      <div className={styles.body}>
        {view.metrics.map((m) => (
          <MetricTrend key={m.key} label={m.label} value={m.value} unit={m.unit}
                       change={m.change} note={m.note} points={m.points} tone={m.tone}
                       dashed={dashed} chartLabel={m.chartLabel} />
        ))}
      </div>
    </Card>
  );
}
