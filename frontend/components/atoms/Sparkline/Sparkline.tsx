import { cx } from "@/lib/cx";
import { sparkBars } from "./Sparkline.helper";
import styles from "./Sparkline.module.css";

type Props = {
  /** Una fracción 0-1 por episodio, en orden de semilla (paquetes colocados / totales). */
  ratios: number[];
  tone: "ok" | "warn" | "bad";
  label: string;
  height?: number;
};

/** Barras de éxito por episodio. Sirve para lo que ninguna media sirve: ver si un 64 % es
 *  estable o es suerte de un tramo de semillas. */
export function Sparkline({ ratios, tone, label, height = 26 }: Props) {
  const { bars, width } = sparkBars(ratios, height);
  return (
    <svg className={cx(styles.spark, styles[tone])} width={width} height={height}
         viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {bars.map((b, i) => <rect key={i} {...b} />)}
    </svg>
  );
}
