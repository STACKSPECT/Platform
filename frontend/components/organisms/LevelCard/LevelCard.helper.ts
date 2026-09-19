import { comparability, type Run } from "@/lib/supabase";
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

/** Qué significa cada clase de datos, para el icono de ayuda de su etiqueta. */
export const KIND_HELP: Record<DataKind, string> = {
  measured: "Ejecuciones medidas de verdad: el robot percibe, planifica y coloca por sí mismo.",
  oracle: "La percepción se sustituye por las poses reales de los paquetes, así que estas ejecuciones " +
    "no miden la visión. Nunca se mezclan con las medidas en una misma curva.",
  synthetic: "Datos sembrados para poder ver la interfaz, no medidos. Nunca se mezclan con las " +
    "medidas en una misma curva.",
};

export const EXCLUDED_HELP =
  "Estas ejecuciones usaron otro rango de semillas y no entran en la curva: con otras semillas se " +
  "compara suerte, no código.";

export const SEEDS_HELP =
  "La semilla fija cómo se reparten los paquetes en un episodio. Solo se comparan ejecuciones que " +
  "usaron las mismas semillas; la curva usa el rango de semillas con más ejecuciones.";

export const VERDICT_HELP =
  "Resume la tarjeta en una palabra según cuántas métricas van a mejor y cuántas a peor desde la " +
  "primera ejecución: Mejora, Empeora, Mixto (unas y otras) o Sin cambios.";

export function kindOf(run: Run): DataKind {
  return run.synthetic ? "synthetic" : run.oracle ? "oracle" : "measured";
}

export type MetricView = {
  key: string;
  label: string;
  help: string;
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
  /** Con qué semillas se mide la serie (las de más ejecuciones), por ejemplo «semillas 20–44». */
  seeds: string;
  /** Ejecuciones de este nivel que se dejan fuera de la curva por no ser comparables con las de la
   *  serie (otro rango de semillas): con otras semillas se compara suerte, no código. */
  excluded: number;
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
  /** Qué mide, cómo se calcula y qué es «mejor». */
  help: string;
};

/** Lo que se mide de cada serie. La flecha «mejor» es una decisión de dominio: un tiempo o un
 *  error que bajan mejoran; un éxito o un margen que suben también. */
const METRICS: MetricDef[] = [
  { key: "success", label: "Tasa de éxito", pick: (r) => r.success_rate, lowerIsBetter: false,
    format: (v) => pct(v), delta: { scale: 100, digits: 0, unit: "puntos" },
    help: "De los episodios de cada ejecución, cuántos terminan con éxito: todos los paquetes " +
      "colocados y sin ningún fallo. Cada punto de la curva es una ejecución. Más es mejor." },
  { key: "cycle", label: "Tiempo de ciclo", pick: (r) => r.median_cycle_s, lowerIsBetter: true,
    format: (v) => seconds(v), delta: { scale: 1, digits: 1, unit: "s" }, unit: "s / paquete",
    help: "Lo que tarda el robot en colocar un paquete, en la mediana de la ejecución. Se usa la " +
      "mediana y no la media: un episodio que se derrumba enseguida no debe hacer parecer " +
      "rápida una ejecución que va mal. Menos es mejor." },
  { key: "stability", label: "Margen de estabilidad", pick: (r) => r.median_stability_m,
    lowerIsBetter: false, format: (v) => signedMm(v),
    delta: { scale: 1000, digits: 0, unit: "mm" },
    help: "Cuánto cae el centro de gravedad de la pila hacia dentro del polígono que la sostiene, " +
      "en la mediana. Positivo, el centro está sobre el apoyo y la pila es estable; cuanto " +
      "mayor, más holgura antes de volcar. Más es mejor." },
  { key: "error", label: "Error de colocación", pick: (r) => r.median_error_xy_m,
    lowerIsBetter: true, format: (v) => mm(v), delta: { scale: 1000, digits: 1, unit: "mm" },
    help: "Distancia, en el plano del palé, entre donde el plan quería cada paquete y donde acabó, " +
      "en la mediana. Menos es mejor." },
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
      // La flecha dice si ha ido a mejor o a peor, no hacia dónde se movió el número: un tiempo
      // que sube es una flecha hacia abajo en rojo. Hacia dónde se movió lo dice el signo del texto.
      direction: tone === "muted" ? "flat" : tone === "ok" ? "up" : "down",
      text: `${signedNumber(diff, def.delta.digits)} ${def.delta.unit}`,
    };
  }

  const n = runs.length;
  return {
    key: def.key,
    label: def.label,
    help: def.help,
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

/** El protocolo de la serie: el rango de semillas con MÁS ejecuciones (a igualdad, el de la más
 *  reciente). Así una prueba suelta con otras semillas no le quita la serie a todo un benchmark.
 *  Devuelve una ejecución de ese grupo, que hace de referencia para `comparability()`. */
function referenceRun(sorted: Run[]): Run {
  const groups = new Map<string, Run[]>();
  for (const r of sorted) {
    const key = `${r.seed_min}-${r.seed_max}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const best = [...groups.values()].sort((a, b) =>
    b.length - a.length || Date.parse(b[b.length - 1].started_at) - Date.parse(a[a.length - 1].started_at))[0];
  return best[best.length - 1];
}

/** La tarjeta de UN nivel de UNA tarea con UNA clase de datos. `runs` ya viene filtrado.
 *
 *  La curva usa solo las ejecuciones comparables entre sí (`comparability()`, la misma regla que
 *  bloquea la comparativa): un delta entre dos ejecuciones que no miden lo mismo es un gráfico
 *  bonito y falso. Las demás se dejan fuera y se cuentan, no se esconden. */
export function buildLevelCard(level: number, runs: Run[], kind: DataKind): LevelCardView {
  const all = [...runs].sort(byDate);
  const latest = referenceRun(all);
  const sorted = all.filter((r) => comparability(latest, r).length === 0);
  const metrics = METRICS
    .map((def) => metricOf(def, sorted))
    .filter((m): m is MetricView => m != null);

  const from = shortDate(sorted[0].started_at);
  const to = shortDate(sorted[sorted.length - 1].started_at);

  return {
    key: `${level}`,
    title: `Nivel ${level}`,
    meta: `${sorted.length} ${sorted.length === 1 ? "ejecución" : "ejecuciones"} · ` +
      (from === to ? from : `${from} – ${to}`),
    kind,
    seeds: latest.seed_min == null ? "" : `semillas ${latest.seed_min}–${latest.seed_max}`,
    excluded: all.length - sorted.length,
    verdict: verdictOf(metrics),
    metrics,
  };
}
