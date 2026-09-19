import { Text } from "../../atoms";
import { ChangePill } from "../ChangePill";
import styles from "./ChangeLegend.module.css";

/** Cómo se lee el resumen: la flecha dice hacia dónde se movió el valor y el color, si eso es
 *  bueno o malo. Sin esto un «▼ −0.4 s» en verde parece un error. */
export function ChangeLegend() {
  return (
    <div className={styles.legend}>
      <Text variant="body" size="lg" className={styles.title}>Cómo leerlo</Text>
      <div className={styles.pills}>
        <ChangePill direction="up" tone="ok">mejora</ChangePill>
        <ChangePill direction="down" tone="bad">empeora</ChangePill>
        <ChangePill direction="flat" tone="muted">igual</ChangePill>
      </div>
      <Text variant="caption" tone="muted" className={styles.text}>
        Cada cambio se cuenta desde la primera ejecución. La flecha es hacia dónde se movió el
        valor; el color, si eso es bueno o malo.
      </Text>
    </div>
  );
}
