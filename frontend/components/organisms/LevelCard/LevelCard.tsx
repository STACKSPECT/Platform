import { Badge, Card, Text } from "../../atoms";
import { InfoTip, MetricTrend } from "../../molecules";
import {
  EXCLUDED_HELP, KIND_HELP, KIND_TEXT, SEEDS_HELP, VERDICT_HELP, type LevelCardView,
} from "./LevelCard.helper";
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
          <span className={styles.meta}>
            <Text variant="caption" tone="faint">
              {[view.meta, view.seeds].filter(Boolean).join(" · ")}
            </Text>
            {view.seeds && <InfoTip label="Qué son las semillas">{SEEDS_HELP}</InfoTip>}
          </span>
        </div>
        <div className={styles.tags}>
          {view.kind !== "measured" && (
            <span className={styles.tag}>
              <Badge tone={view.kind}>{KIND_TEXT[view.kind]}</Badge>
              <InfoTip label={`Qué son los datos ${KIND_TEXT[view.kind].toLowerCase()}`}>
                {KIND_HELP[view.kind]}
              </InfoTip>
            </span>
          )}
          {view.excluded > 0 && (
            <span className={styles.tag}>
              <Badge tone="warn">+{view.excluded} con otras semillas</Badge>
              <InfoTip label="Por qué se dejan fuera estas ejecuciones">{EXCLUDED_HELP}</InfoTip>
            </span>
          )}
          <span className={styles.tag}>
            <Badge tone={view.verdict.tone === "muted" ? "neutral" : view.verdict.tone}>
              {view.verdict.label}
            </Badge>
            <InfoTip label="Cómo se calcula el veredicto">
              {`${view.verdict.detail}. ${VERDICT_HELP}`}
            </InfoTip>
          </span>
        </div>
      </header>

      <div className={styles.body}>
        {view.metrics.map((m) => (
          <MetricTrend key={m.key} label={m.label} help={m.help} value={m.value} unit={m.unit}
                       change={m.change} note={m.note} points={m.points} tone={m.tone}
                       dashed={dashed} chartLabel={m.chartLabel} />
        ))}
      </div>
    </Card>
  );
}
