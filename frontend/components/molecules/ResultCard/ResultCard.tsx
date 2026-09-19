import Link from "next/link";
import { Card, Text } from "../../atoms";
import styles from "./ResultCard.module.css";

type Props = {
  state: "ok" | "bad";
  title: string;
  description: string;
  /** Sin enlace cuando ya se está en el detalle. */
  href?: string;
  linkLabel?: string;
};

/** Cómo acabó un episodio y, si procede, a dónde ir a verlo con detalle. */
export function ResultCard({ state, title, description, href, linkLabel }: Props) {
  return (
    <Card state={state} className={styles.card}>
      <Text variant="label" tone={state}>{title}</Text>
      <Text tone="muted">{description}</Text>
      {href && linkLabel && <Link href={href} className={styles.link}>{linkLabel}</Link>}
    </Card>
  );
}
