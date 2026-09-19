import type { Run } from "@/lib/supabase";
import { TASK_TEXT, capitalize } from "@/lib/ui";
import { buildLevelCard, kindOf, type DataKind } from "../../organisms/LevelCard";
import type { TaskSectionView } from "../../organisms/TaskSection";

/** Se piden todas: el resumen agrupa por tarea y nivel en la vista, y una ejecución que se
 *  quedara fuera del límite falsearía la primera parte de su curva. */
export const RUN_LIMIT = 200;

export const KIND_ORDER: DataKind[] = ["measured", "oracle", "synthetic"];

/** Lo que hay que saber de cada clase de datos, dicho junto al selector. */
export const KIND_NOTE: Record<DataKind, string | null> = {
  measured: null,
  oracle: "Con oracle la percepción se sustituye por poses reales: no son números de verdad.",
  synthetic: "Datos sembrados: generados para poder ver la interfaz, no medidos.",
};

/** La tarea en la que se trabaja ahora primero; la línea base de inducción, después. */
const TASK_ORDER = ["palletizing", "induction"];

export function kindCounts(runs: Run[]): Record<DataKind, number> {
  const counts: Record<DataKind, number> = { measured: 0, oracle: 0, synthetic: 0 };
  for (const r of runs) counts[kindOf(r)] += 1;
  return counts;
}

/** Lo que se enseña al entrar: lo medido si lo hay y, si no, lo primero que haya. Nunca se
 *  elige por defecto algo que no es de verdad habiendo algo que sí lo es. */
export function defaultKind(counts: Record<DataKind, number>): DataKind {
  return KIND_ORDER.find((k) => counts[k] > 0) ?? "measured";
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Una sección por tarea y, dentro, una tarjeta por nivel, con las ejecuciones de UNA clase de
 *  datos. Agrupar y ordenar es presentación; los números de cada ejecución los calculó la vista. */
export function buildDashboard(runs: Run[], kind: DataKind): TaskSectionView[] {
  const ofKind = runs.filter((r) => kindOf(r) === kind);
  const tasks = [...new Set(ofKind.map((r) => r.task))].sort((a, b) => {
    const ia = TASK_ORDER.indexOf(a);
    const ib = TASK_ORDER.indexOf(b);
    return (ia < 0 ? TASK_ORDER.length : ia) - (ib < 0 ? TASK_ORDER.length : ib) || a.localeCompare(b);
  });

  return tasks.map((task) => {
    const ofTask = ofKind.filter((r) => r.task === task);
    const levels = [...new Set(ofTask.map((r) => r.level))].sort((a, b) => a - b);
    return {
      task,
      title: capitalize(TASK_TEXT[task] ?? task),
      subtitle: `${plural(levels.length, "nivel", "niveles")} · ${plural(ofTask.length, "ejecución", "ejecuciones")}`,
      levels: levels.map((level) =>
        buildLevelCard(level, ofTask.filter((r) => r.level === level), kind)),
    };
  });
}
