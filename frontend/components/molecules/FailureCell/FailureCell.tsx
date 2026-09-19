import { Swatch, Text } from "../../atoms";
import { failureColor, failureText } from "@/lib/ui";
import styles from "./FailureCell.module.css";

/** La causa de fallo con su color de identidad, o «sin fallos». Nunca el identificador crudo. */
export function FailureCell({ failure }: { failure: string | null }) {
  if (!failure) return <Text tone="faint">sin fallos</Text>;
  return (
    <span className={styles.cell}>
      <Swatch color={failureColor(failure)} />
      <Text tone="muted">{failureText(failure)}</Text>
    </span>
  );
}
