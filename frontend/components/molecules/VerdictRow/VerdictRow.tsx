import { Dot, Text } from "../../atoms";
import styles from "./VerdictRow.module.css";

type Props = {
  href: string;
  /** «Nivel 2». */
  label: string;
  /** «Mejora», «Mixto», «Empeora»… */
  verdict: string;
  tone: "ok" | "warn" | "bad" | "muted";
  /** Lo que hay detrás del veredicto: «3 mejoran · 1 empeoran · 0 igual». */
  detail: string;
  /** Qué hacer al pulsarlo: ir a su tarjeta. Con `href` sigue siendo un enlace de verdad (abrir
   *  en otra pestaña, copiar), pero el clic normal lo gestiona quien lo usa. */
  onSelect?: () => void;
};

/** Un nivel y cómo va, en una fila de la lista. Es un enlace: lleva a su tarjeta. */
export function VerdictRow({ href, label, verdict, tone, detail, onSelect }: Props) {
  return (
    <a href={href} className={styles.row}
       onClick={onSelect && ((e) => { e.preventDefault(); onSelect(); })}>
      <Dot tone={tone} />
      <Text variant="body" size="md" className={styles.label}>{label}</Text>
      <Text variant="body" size="md" tone={tone === "muted" ? "faint" : tone}
            className={styles.verdict}>{verdict}</Text>
      <Text variant="caption" tone="faint" className={styles.detail}>{detail}</Text>
    </a>
  );
}
