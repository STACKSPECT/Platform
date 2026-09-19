export type SparkBar = { x: number; y: number; width: number; height: number };

const BAR_WIDTH = 6;
const GAP = 2;

/** De una fracción (0-1) por episodio a barras de anchura fija. La anchura total crece
 *  con el número de episodios: un run corto se ve corto. Suelo visible de 2 px: un
 *  episodio que no colocó nada tiene que verse, no borrarse. */
export function sparkBars(ratios: number[], height: number): { bars: SparkBar[]; width: number } {
  const bars = ratios.map((r, i) => {
    const h = Math.max(2, Math.min(1, Math.max(0, r)) * height);
    return { x: i * (BAR_WIDTH + GAP), y: height - h, width: BAR_WIDTH, height: h };
  });
  const width = ratios.length ? ratios.length * (BAR_WIDTH + GAP) - GAP : 0;
  return { bars, width };
}
