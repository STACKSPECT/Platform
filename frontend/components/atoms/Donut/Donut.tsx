import { C, R, donutArcs, type DonutSegment } from "./Donut.helper";
import styles from "./Donut.module.css";

type Props = {
  segments: DonutSegment[];
  /** El número grande del centro, ya formateado. */
  centerValue: string;
  /** Qué es ese número: «episodios». */
  centerLabel: string;
  /** Lo que dice el gráfico, para quien no lo ve. */
  label: string;
  /** Ancho máximo en px. El alto va solo: el anillo es cuadrado. */
  size?: number;
};

/** Un anillo con el reparto de un total. Sin etiquetas dentro: los nombres y las cantidades
 *  van en la leyenda de al lado, y cada tramo enseña el suyo al pasar el ratón. */
export function Donut({ segments, centerValue, centerLabel, label, size = 172 }: Props) {
  const { arcs, total } = donutArcs(segments);
  if (!total) return null;

  return (
    <svg className={styles.donut} style={{ maxWidth: size }} viewBox="0 0 100 100"
         role="img" aria-label={label}>
      {/* El anillo arranca arriba y no a las tres en punto, que es como se lee un reparto. */}
      <g transform="rotate(-90 50 50)">
        <circle className={styles.track} cx={50} cy={50} r={R} pathLength={C} />
        {arcs.map((a) => (
          <circle key={a.key} className={styles.arc} cx={50} cy={50} r={R}
                  stroke={a.color} strokeDasharray={a.dash} strokeDashoffset={a.offset}>
            <title>{a.title}</title>
          </circle>
        ))}
      </g>
      <text className={styles.value} x={50} y={50}>{centerValue}</text>
      <text className={styles.label} x={50} y={63}>{centerLabel}</text>
    </svg>
  );
}
