import type { Run } from "@/lib/supabase";
import {
  TASK_TEXT, capitalize, changeTone, failureColor, failureText, pct, shortDate, signedNumber,
} from "@/lib/ui";
import type { DonutSegment, TrendPoint } from "../../atoms";

export type OverallStat = { key: string; label: string; value: string; unit: string };

export type OverallView = {
  task: string;
  /** «Paletizado». */
  title: string;
  /** «48 ejecuciones · 19 sept – 20 sept». */
  meta: string;
  stats: OverallStat[];
  /** Un punto por ejecución. Vacío si no hay dos que comparar. */
  points: TrendPoint[];
  tone: "ok" | "bad" | "muted";
  chartLabel: string;
  /** El avance acumulado, ya formateado: «+23 puntos». `null` sin curva. */
  headline: string | null;
  /** En qué acabaron los episodios: el reparto del anillo. */
  outcomes: DonutSegment[];
  outcomeTotal: number;
  outcomeLabel: string;
};

const byDateAsc = (a: Run, b: Run) => Date.parse(a.started_at) - Date.parse(b.started_at);

function sum(runs: Run[], pick: (r: Run) => number | null): number | null {
  const known = runs.map(pick).filter((v): v is number => v != null);
  return known.length ? known.reduce((a, b) => a + b, 0) : null;
}

function ratio(top: number | null, bottom: number | null): number | null {
  return top == null || !bottom ? null : top / bottom;
}

/**
 * La mirada de lejos: lo que se ha medido en total y cuánto se ha avanzado, sin entrar en
 * niveles. `runs` ya viene filtrado a UNA clase de datos.
 *
 * Solo la PRIMERA de `tasks`, que es la tarea en la que se trabaja ahora: ese orden lo pone
 * la pantalla y es el mismo de la lista de tarjetas. Una mirada de lejos con varias tareas
 * apiladas deja de serlo, y las demás siguen contándose en sus propias tarjetas, que es
 * donde se miran.
 *
 * Los cuatro números son sumas, no medianas, y por eso se pueden hacer aquí sin mentir: la
 * tasa de éxito es éxitos/episodios sobre el total, no el promedio de las tasas de cada
 * ejecución, así que una prueba suelta de 3 episodios no pesa lo mismo que un benchmark de
 * 40. Una mediana global (ciclo, estabilidad, error) NO se puede sacar de aquí —la mediana
 * de las medianas de cada ejecución no es la mediana— y por eso no se enseña ninguna: haría
 * falta una vista que agregue sobre episodios.
 */
export function buildOverall(runs: Run[], tasks: string[]): OverallView[] {
  return tasks.slice(0, 1).map((task) => {
    const sorted = runs.filter((r) => r.task === task).sort(byDateAsc);
    if (!sorted.length) return null;
    const episodes = sum(sorted, (r) => r.episodes);
    const from = shortDate(sorted[0].started_at);
    const to = shortDate(sorted[sorted.length - 1].started_at);

    return {
      task,
      title: capitalize(TASK_TEXT[task] ?? task),
      meta: `${sorted.length} ${sorted.length === 1 ? "ejecución" : "ejecuciones"} · `
        + (from === to ? from : `${from} – ${to}`),
      stats: [
        { key: "runs", label: "Ejecuciones", value: `${sorted.length}`, unit: "" },
        { key: "episodes", label: "Episodios", value: episodes == null ? "—" : `${episodes}`, unit: "" },
        quantity("success", "Tasa de éxito", pct(ratio(sum(sorted, (r) => r.successes), episodes))),
        quantity("placement", "Paquetes colocados",
          pct(ratio(sum(sorted, (r) => r.objects_placed), sum(sorted, (r) => r.objects_total)))),
      ],
      ...progressCurve(sorted),
      ...outcomes(sorted),
    };
  }).filter((v): v is OverallView => v != null);
}

/**
 * En qué acabaron los episodios, en tres tramos: los que salieron bien, los que se fueron
 * al suelo y los que fallaron por cualquier otro motivo.
 *
 * El derrumbe va aparte porque no es un fallo más: es EL fallo de apilar, el que mide si el
 * planificador entiende el centro de gravedad. Juntarlo con los demás esconde justo lo que
 * esta plataforma existe para vigilar.
 *
 * Se cuenta sobre `seed_series`, que ya viene en cada fila con un episodio por semilla: no
 * hace falta pedir nada. Los que siguen corriendo no entran: todavía no han acabado en nada.
 */
function outcomes(runs: Run[]): Pick<OverallView, "outcomes" | "outcomeTotal" | "outcomeLabel"> {
  const episodes = runs.flatMap((r) => r.seed_series ?? []);
  let ok = 0;
  let collapse = 0;
  let other = 0;
  for (const e of episodes) {
    if (e.status === "running") continue;
    if (e.status === "success") ok += 1;
    else if (e.failure === "stack_collapse") collapse += 1;
    else other += 1;
  }

  const segments: DonutSegment[] = [
    { key: "ok", label: "Funcionaron", value: ok, color: "var(--ok)" },
    {
      key: "collapse",
      label: capitalize(failureText("stack_collapse")),
      value: collapse,
      color: failureColor("stack_collapse"),
    },
    { key: "other", label: "Fallaron por otro motivo", value: other, color: "var(--bad)" },
  ];

  const total = ok + collapse + other;
  return {
    outcomes: segments,
    outcomeTotal: total,
    outcomeLabel: `De ${total} episodios acabados, ${ok} funcionaron, en ${collapse} se `
      + `derrumbó el montón y ${other} fallaron por otro motivo`,
  };
}

/** Parte «44 %» en número y unidad, para pintarlas a tamaños distintos. */
function quantity(key: string, label: string, formatted: string): OverallStat {
  const [value, ...rest] = formatted.split(/\s/);
  return { key, label, value, unit: rest.join(" ") };
}

/**
 * La curva de avance: un punto por ejecución, en orden, y el valor es cuántos puntos de tasa
 * de éxito lleva ESA ejecución respecto a la PRIMERA DE SU NIVEL.
 *
 * Por qué así y no la tasa de éxito a secas. Los niveles no miden lo mismo, y una línea con
 * la tasa cruda baja en cuanto entra un nivel más difícil: leería «va a peor» justo cuando el
 * sistema ha avanzado. Midiendo cada ejecución contra el arranque de su propio nivel, la
 * línea sube cuando se mejora y baja cuando se empeora, entre el nivel que entre, y no se
 * compara nunca un nivel con otro.
 */
function progressCurve(sorted: Run[]): Pick<OverallView, "points" | "tone" | "chartLabel" | "headline"> {
  const base = new Map<number, number>();
  for (const r of sorted) {
    if (r.success_rate != null && !base.has(r.level)) base.set(r.level, r.success_rate);
  }

  const points: TrendPoint[] = sorted.map((r) => {
    const start = base.get(r.level);
    const value = r.success_rate == null || start == null ? null : (r.success_rate - start) * 100;
    return {
      value,
      title: `${r.git_sha || r.label || "sin commit"} · ${shortDate(r.started_at)} · `
        + `nivel ${r.level} · ${pct(r.success_rate)} · `
        + (value == null ? "sin dato" : `${signedNumber(value, 0)} puntos desde su arranque`),
    };
  });

  const known = points.map((p) => p.value).filter((v): v is number => v != null);
  // Sin dos puntos no hay curva. Y si NINGUNO se ha movido del arranque, tampoco: una línea
  // plana de punta a punta ocupa lo que una curva y solo dice «todavía no ha pasado nada»,
  // que es justo lo que ya dice el «0 puntos» de al lado.
  if (known.length < 2 || known.every((v) => Math.round(v) === 0)) {
    return { points: [], tone: "muted", chartLabel: "", headline: null };
  }

  const last = known[known.length - 1];
  return {
    points,
    tone: changeTone(last, 0, false),
    chartLabel: `Avance de la tasa de éxito: ${signedNumber(last, 0)} puntos en la última de `
      + `${points.length} ejecuciones`,
    headline: `${signedNumber(last, 0)} puntos`,
  };
}
