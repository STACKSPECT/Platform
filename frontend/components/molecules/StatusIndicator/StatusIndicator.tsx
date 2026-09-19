import { Dot, Text, type DotTone } from "../../atoms";
import { textToneFor } from "./StatusIndicator.helper";
import styles from "./StatusIndicator.module.css";

export function StatusIndicator({ label, tone, pulse }: {
  label: string; tone: DotTone; pulse?: boolean;
}) {
  return (
    <span className={styles.status} role="status">
      <Dot tone={tone} pulse={pulse} />
      <Text variant="label" tone={textToneFor(tone)}>{label}</Text>
    </span>
  );
}
