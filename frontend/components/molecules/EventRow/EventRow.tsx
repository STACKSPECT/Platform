import { Icon, Text, type IconName, type TextTone } from "../../atoms";
import { cx } from "@/lib/cx";
import styles from "./EventRow.module.css";

type Props = {
  time: string;
  icon: IconName;
  iconTone: TextTone;
  label: string;
  target: string;
  detail: string;
  failed?: boolean;
  /** La fila más reciente se destaca con un fondo más claro. */
  highlighted?: boolean;
};

export function EventRow({
  time, icon, iconTone, label, target, detail, failed, highlighted,
}: Props) {
  return (
    <li className={cx(styles.row, highlighted && styles.highlighted)}>
      <Text variant="num" tone="faint">{time}</Text>
      <Text tone={iconTone}><Icon name={icon} /></Text>
      <Text tone={failed ? "bad" : "default"}>{label}</Text>
      <Text variant="mono" tone="muted" truncate className={styles.target}>{target}</Text>
      <Text variant="mono" tone={failed ? "bad" : "muted"} truncate className={styles.detail}>
        {detail}
      </Text>
    </li>
  );
}
