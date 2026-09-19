import type { Run } from "@/lib/supabase";
import {
  changeTone, mm, pct, seconds, shortDate, signedMm, signedNumber, splitQuantity,
} from "@/lib/ui";
import type { TrendPoint } from "../../atoms";
import type { MetricChange } from "../../molecules";

/** De dónde son los números. Las tres clases NO se mezclan en una serie: un oracle (la
 *  percepción sustituida por poses reales) o un dato sembrado no mide lo mismo que uno medido,
 *  y una curva que los junta enseña una mejora que no existe. */
export type DataKind = "measured" | "oracle" | "synthetic";

export const KIND_TEXT: Record<DataKind, string> = {
  measured: "Medidos", oracle: "Oracle", synthetic: "Sembrados",
};

export function kindOf(run: Run): DataKind {
  return run.synthetic ? "synthetic" : run.oracle ? "oracle" : "measured";
}

export type MetricView = {
  key: string;
  label: string;
  value: string;
  unit: string;
  change: MetricChange | null;
  note: string;
  points: TrendPoint[];
  tone: "ok" | "bad" | "muted";
  chartLabel: string;
};

export type Verdict = { tone: "ok" | "warn" | "bad" | "muted"; label: string; detail: string };

export type LevelCardView = {
  key: string;
  title: string;
  /** «15 ejecuciones · 19 sep – 21 sep». */
  meta: string;
  kind: DataKind;
  /** La serie mezcla rangos de semillas distintos: se compara suerte, no código. */
  mixedSeeds: boolean;
  verdict: Verdict;
  metrics: MetricView[];
};

type MetricDef = {
  key: string;
  label: string;
  pick: (r: Run) => number | null;
  lowerIsBetter: boolean;
  /** El valor con su unidad, para enseñarlo. Toda conversión pasa por lib/ui. */
  format: (v: number | null) => string;
  /** El cambio se cuenta en la unidad con la que se habla de ello. */
  delta: { scale: number; digits: number; unit: string };
  /** Unidad que se muestra junto al valor cuando el formato no la trae en un solo token. */
  unit?: string;
};

/** Lo que se mide de cada serie. La flecha «mejor» es una decisión de dominio: un tiempo o un
 *  error que bajan mejoran; un éxito o un margen que suben también. */
const METRICS: MetricDef[] = [
  { key: "success", label: "Tasa de éxito", pick: (r) => r.success_rate, lowerIsBetter: false,
    format: (v) => pct(v), delta: { scale: 100, digits: 0, unit: "puntos" } },
  { key: "cycle", label: "Tiempo de ciclo", pick: (r) => r.median_cycle_s, lowerIsBetter: true,
    format: (v) => seconds(v), delta: { scale: 1, digits: 1, unit: "s" }, unit: "s / paquete" },
  { key: "stability", label: "Margen de estabilidad", pick: (r) => r.median_stability_m,
    lowerIsBetter: false, format: (v) => signedMm(v),
    delta: { scale: 1000, digits: 0, unit: "mm" } },
  { key: "error", label: "Error de colocación", pick: (r) => r.median_error_xy_m,
    lowerIsBetter: true, format: (v) => mm(v), delta: { scale: 1000, digits: 1, unit: "mm" } },
];

const byDate = (a: Run, b: Run) => Date.parse(a.started_at) - Date.parse(b.started_at);

function metricOf(def: MetricDef, runs: Run[]): MetricView | null {
  const values = runs.map(def.pick);
  const known = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null);
  // Una métrica que la tarea no mide (la estabilidad de la inducción) no aparece: nada de «—».
  if (!known.length) return null;

  const first = known[0].v;
  const last = known[known.length - 1].v;
  const { value, unit } = splitQuantity(def.format(last));

  let change: MetricChange | null = null;
  if (known.length > 1) {
    const diff = (last - first) * def.delta.scale;
    const tone = changeTone(diff, def.delta.digits, def.lowerIsBetter);
    change = {
      tone,
      direction: tone === "muted" ? "flat" : diff > 0 ? "up" : "down",
      text: `${signedNumber(diff, def.delta.digits)} ${def.delta.unit}`,
    };
  }

  const n = runs.length;
  return {
    key: def.key,
    label: def.label,
    value,
    unit: def.unit ?? unit,
    change,
    note: change ? `desde el primero (${def.format(first)})` : "un solo dato",
    points: runs.map((r, i) => ({
      value: values[i],
      title: `${r.git_sha || r.label || "sin commit"} · ${shortDate(r.started_at)} · ` +
        `${values[i] == null ? "sin dato" : def.format(values[i])} · ${r.episodes} episodios`,
    })),
    tone: change?.tone ?? "muted",
    chartLabel: change
      ? `${def.label}, de ${def.format(first)} a ${def.format(last)} en ${n} ejecuciones`
      : `${def.label}, ${def.format(last)} en ${n} ejecución`,
  };
}

/** De cuántas métricas mejoran y cuántas empeoran a una sola palabra, para leer la tarjeta sin
 *  entrar en los números. */
export function verdictOf(metrics: MetricView[]): Verdict {
  const compared = metrics.filter((m) => m.change);
  if (!compared.length) return { tone: "muted", label: "Sin comparación", detail: "un solo dato" };
  const better = compared.filter((m) => m.change?.tone === "ok").length;
  const worse = compared.filter((m) => m.change?.tone === "bad").length;
  const detail = `${better} mejoran · ${worse} empeoran · ${compared.length - better - worse} igual`;
  if (better && !worse) return { tone: "ok", label: "Mejora", detail };
  if (worse && !better) return { tone: "bad", label: "Empeora", detail };
  if (better && worse) return { tone: "warn", label: "Mixto", detail };
  return { tone: "muted", label: "Sin cambios", detail };
}

/** La tarjeta de UN nivel de UNA tarea con UNA clase de datos. `runs` ya viene filtrado. */
export function buildLevelCard(level: number, runs: Run[], kind: DataKind): LevelCardView {
  const sorted = [...runs].sort(byDate);
  const metrics = METRICS
    .map((def) => metricOf(def, sorted))
    .filter((m): m is MetricView => m != null);

  const from = shortDate(sorted[0].started_at);
  const to = shortDate(sorted[sorted.length - 1].started_at);
  const seedRanges = new Set(sorted.map((r) => `${r.seed_min}-${r.seed_max}`));

  return {
    key: `${level}`,
    title: `Nivel ${level}`,
    meta: `${sorted.length} ${sorted.length === 1 ? "ejecución" : "ejecuciones"} · ` +
      (from === to ? from : `${from} – ${to}`),
    kind,
    mixedSeeds: seedRanges.size > 1,
    verdict: verdictOf(metrics),
    metrics,
  };
}
