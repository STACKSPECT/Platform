import { cx } from "@/lib/cx";
import { trendGeometry, type TrendPoint } from "./Trend.helper";
import styles from "./Trend.module.css";

type Props = {
  points: TrendPoint[];
  /** Cómo se lee la evolución: verde mejora, rojo empeora, gris sin cambio. */
  tone: "ok" | "bad" | "muted";
  /** Trazo discontinuo: son datos que no son de verdad (oracle o sembrados). */
  dashed?: boolean;
  /** Lo que dice el gráfico, para quien no lo ve: «Tasa de éxito, de 41 % a 64 %». */
  label: string;
};

/** La línea de evolución de una serie, un punto por ejecución, de la más antigua a la más
 *  reciente. Sin ejes ni cifras: el valor y el cambio los dicen el número y la etiqueta de al
 *  lado, y cada punto enseña su detalle al pasar el ratón. */
export function Trend({ points, tone, dashed, label }: Props) {
  const g = trendGeometry(points);
  return (
    <svg className={cx(styles.trend, styles[tone])} viewBox={`0 0 ${g.width} ${g.height}`}
         role="img" aria-label={label}>
      {g.baselineY != null && (
        <line className={styles.baseline} x1={0} x2={g.width} y1={g.baselineY} y2={g.baselineY} />
      )}
      <path className={cx(styles.line, dashed && styles.dashed)} d={g.path} />
      {g.dots.map((d, i) => (
        <circle key={i} className={d.last ? styles.last : styles.dot}
                cx={d.x} cy={d.y} r={d.last ? 4.5 : 3}>
          <title>{d.title}</title>
        </circle>
      ))}
    </svg>
  );
}
