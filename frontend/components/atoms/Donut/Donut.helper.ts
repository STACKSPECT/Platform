export type DonutSegment = {
  key: string;
  label: string;
  value: number;
  /** El color viene de fuera: es un dato de identidad, no una decisión del gráfico. */
  color: string;
};

export type DonutArc = {
  key: string;
  color: string;
  /** `stroke-dasharray`: lo que pinta el trazo y lo que deja en blanco. */
  dash: string;
  offset: number;
  title: string;
};

export const R = 40;
export const C = 2 * Math.PI * R;

/**
 * De cantidades a arcos del anillo. Cada segmento ocupa su parte del total, y el trazo se
 * dibuja con `stroke-dasharray` sobre una sola circunferencia: no hace falta calcular
 * ningún path.
 *
 * Los segmentos a cero no se dibujan, pero el que vale el total entero sí ocupa la vuelta
 * completa: «todos los episodios fallaron» es un anillo entero de su color, no un hueco.
 */
export function donutArcs(segments: DonutSegment[]): { arcs: DonutArc[]; total: number } {
  const total = segments.reduce((a, s) => a + Math.max(0, s.value), 0);
  if (!total) return { arcs: [], total: 0 };

  let acc = 0;
  const arcs = segments.filter((s) => s.value > 0).map((s) => {
    const len = (s.value / total) * C;
    const arc: DonutArc = {
      key: s.key,
      color: s.color,
      dash: `${len.toFixed(3)} ${(C - len).toFixed(3)}`,
      offset: -acc,
      title: `${s.label}: ${s.value} de ${total}`,
    };
    acc += len;
    return arc;
  });
  return { arcs, total };
}
