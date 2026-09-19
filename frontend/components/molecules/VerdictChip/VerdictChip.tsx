import { Dot, Text } from "../../atoms";
import styles from "./VerdictChip.module.css";

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

/** Un nivel y cómo va, en una línea. Es un enlace: lleva a su tarjeta con el detalle. */
export function VerdictChip({ href, label, verdict, tone, detail, onSelect }: Props) {
  return (
    <a href={href} className={styles.chip} title={detail}
       onClick={onSelect && ((e) => { e.preventDefault(); onSelect(); })}>
      <Dot tone={tone} />
      <Text variant="body" size="md" className={styles.label}>{label}</Text>
      <Text variant="body" size="sm" tone={tone === "muted" ? "faint" : tone}>{verdict}</Text>
    </a>
  );
}
