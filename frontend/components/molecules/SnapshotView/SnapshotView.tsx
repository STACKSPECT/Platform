import Image from "next/image";
import type { Snapshot } from "@/lib/supabase";
import styles from "./SnapshotView.module.css";

type Props = { snapshot: Snapshot; alt: string };

/** La captura que dejó el simulador. Se enseña al lado del esquema para comprobar que
 *  el dibujo no miente: si la foto y el esquema no coinciden, uno de los dos está mal y
 *  hasta ahora no había forma de saberlo.
 *
 *  Va en un marco que ocupa todo el panel, con las esquinas y el borde del resto de la
 *  interfaz; la foto se ve entera (no se recorta) y el sobrante se queda en el fondo del marco. */
export function SnapshotView({ snapshot, alt }: Props) {
  return (
    <figure className={styles.frame}>
      <Image
        className={styles.shot}
        src={snapshot.url}
        alt={alt}
        width={snapshot.width ?? 800}
        height={snapshot.height ?? 600}
        unoptimized
      />
      <figcaption className={styles.tag}>captura del simulador</figcaption>
    </figure>
  );
}
