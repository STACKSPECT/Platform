import { Text } from "../../atoms";
import { ChangePill } from "../ChangePill";
import styles from "./ChangeLegend.module.css";

/** Cómo se lee el resumen, en una línea: la flecha dice hacia dónde se movió el valor y el color,
 *  si eso es bueno o malo. Sin esto un «▼ −0.4 s» en verde parece un error. */
export function ChangeLegend() {
  return (
    <div className={styles.legend}>
      <Text variant="caption" tone="faint">Cambio desde la primera ejecución:</Text>
      <ChangePill direction="up" tone="ok">mejora</ChangePill>
      <ChangePill direction="down" tone="bad">empeora</ChangePill>
      <ChangePill direction="flat" tone="muted">igual</ChangePill>
      <Text variant="caption" tone="faint">
        La flecha es hacia dónde se movió el valor; el color, si eso es bueno o malo.
      </Text>
    </div>
  );
}
