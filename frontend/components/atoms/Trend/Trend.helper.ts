export type TrendPoint = { value: number | null; title: string };

export type TrendGeometry = {
  width: number;
  height: number;
  /** Un tramo por cada racha de valores; un hueco (null) corta la línea. */
  path: string;
  dots: Array<{ x: number; y: number; title: string; last: boolean }>;
  /** Altura del primer valor: la referencia contra la que se lee el avance. */
  baselineY: number | null;
};

const W = 200;
const H = 52;
const PAD_X = 8;
const PAD_Y = 8;
/** Con más puntos que esto los círculos se pisan: solo se marca el último. */
const MAX_DOTS = 40;

/** De valores a coordenadas. La escala va del mínimo al máximo de LA SERIE: enseña la forma
 *  de la evolución, no el valor absoluto (el valor ya lo dice el número de al lado). Una
 *  serie plana se dibuja en el centro y no como una subida exagerada de nada. */
export function trendGeometry(points: TrendPoint[]): TrendGeometry {
  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo;

  const x = (i: number) =>
    points.length === 1 ? W / 2 : PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2);
  const y = (v: number) =>
    span === 0 ? H / 2 : PAD_Y + ((hi - v) / span) * (H - PAD_Y * 2);

  let path = "";
  let pen = false;
  const dots: TrendGeometry["dots"] = [];
  let lastIndex = -1;
  points.forEach((p, i) => { if (p.value != null) lastIndex = i; });

  points.forEach((p, i) => {
    if (p.value == null) { pen = false; return; }
    path += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)} `;
    pen = true;
    if (points.length <= MAX_DOTS || i === lastIndex) {
      dots.push({ x: x(i), y: y(p.value), title: p.title, last: i === lastIndex });
    }
  });

  const first = values[0];
  return {
    width: W, height: H, path: path.trim(), dots,
    baselineY: first == null || values.length < 2 ? null : y(first),
  };
}
