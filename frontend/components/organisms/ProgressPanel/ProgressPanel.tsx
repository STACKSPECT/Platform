import type { Run } from "@/lib/supabase";
import { Badge, Card, Donut, Text, Trend, Value } from "../../atoms";
import { ChangePill, ColorLegendItem, InfoTip } from "../../molecules";
import { KIND_TEXT, type DataKind } from "../LevelCard";
import { buildOverall } from "./ProgressPanel.helper";
import styles from "./ProgressPanel.module.css";

const DIRECTION = { ok: "up", bad: "down", muted: "flat" } as const;

/** Cómo va el sistema en conjunto, encima de la lista de niveles: cuánto se ha medido, cómo
 *  va y cuánto se ha avanzado. Una tarea por bloque, y nunca dos juntas: inducción y
 *  paletizado tienen criterios de éxito distintos y un número que los sume no dice nada.
 *
 *  Aquí no se entra en niveles a propósito: eso ya lo cuentan las tarjetas de abajo. */
export function ProgressPanel({ runs, tasks, kind }: {
  runs: Run[];
  /** En qué orden van las tareas. El mismo que la lista de tarjetas de abajo. */
  tasks: string[];
  kind: DataKind;
}) {
  const views = buildOverall(runs, tasks);
  if (!views.length) return null;
  const hatched = kind !== "measured";

  return (
    <Card className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.heading}>
          <Text variant="body" size="lg" className={styles.title}>Mejora general</Text>
          <InfoTip label="Qué es «Mejora general»">
            <p>
              Lo medido de esta tarea en total y cuánto se ha avanzado desde el principio, sin
              entrar en niveles.
            </p>
            <p>
              La tasa de éxito es episodios con éxito entre episodios totales, no el promedio
              de las tasas de cada ejecución: una prueba suelta de tres episodios no pesa lo
              mismo que un benchmark de cuarenta.
            </p>
          </InfoTip>
        </div>
        {hatched && <Badge tone={kind}>{KIND_TEXT[kind]}</Badge>}
      </div>

      {views.map((v) => (
        <section key={v.task} className={styles.block} aria-label={`En conjunto · ${v.title}`}>
          <div className={styles.blockHead}>
            <Text variant="label" tone="muted">
              {views.length > 1 ? `En conjunto · ${v.title}` : "En conjunto"}
            </Text>
            <Text variant="caption" tone="faint">{v.meta}</Text>
          </div>

          <div className={styles.body}>
            <div className={styles.left}>
              <div className={styles.stats}>
                {v.stats.map((s) => (
                  <div key={s.key} className={styles.stat}>
                    <Value value={s.value} unit={s.unit} size="lg" />
                    <Text variant="caption" tone="faint">{s.label}</Text>
                  </div>
                ))}
              </div>

              {/* Debajo de las cifras y sin pasar de su columna: acaba donde empieza el
                  anillo, que es el que manda a la derecha. */}
              {v.points.length > 0 && (
                <div className={styles.curve}>
                  <div className={styles.chartHead}>
                    <Text variant="label" tone="muted">Avance de la tasa de éxito</Text>
                    {v.headline && (
                      <ChangePill direction={DIRECTION[v.tone]} tone={v.tone}>
                        {v.headline}
                      </ChangePill>
                    )}
                  </div>
                  <Trend points={v.points} tone={v.tone} dashed={hatched} label={v.chartLabel}
                         height={150} />
                </div>
              )}
            </div>

            {v.outcomeTotal > 0 && (
              <div className={styles.outcomes}>
                <Text variant="label" tone="muted">En qué acabaron</Text>
                {/* «acabados» y no «episodios»: los que siguen en marcha no entran en el
                    reparto, y sin decirlo este número contradice al de arriba. */}
                <Donut segments={v.outcomes} centerValue={`${v.outcomeTotal}`}
                       centerLabel="acabados" label={v.outcomeLabel} size={168} />
                <div className={styles.legend}>
                  {v.outcomes.filter((s) => s.value > 0).map((s) => (
                    <ColorLegendItem key={s.key} color={s.color}
                                     label={`${s.label} · ${s.value}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      ))}
    </Card>
  );
}
