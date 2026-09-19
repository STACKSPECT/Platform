import Image from "next/image";
import type { CSSProperties } from "react";
import type { Snapshot } from "@/lib/supabase";
import styles from "./SnapshotView.module.css";

type Props = { snapshot: Snapshot; alt: string };

/** La captura que dejó el simulador. Se enseña al lado del esquema para comprobar que
 *  el dibujo no miente: si la foto y el esquema no coinciden, uno de los dos está mal y
 *  hasta ahora no había forma de saberlo.
 *
 *  La foto es una tarjeta más: esquinas y borde como el resto de la interfaz, del mayor
 *  tamaño que cabe en el panel con su proporción, centrada y sin recortar ni dejar franjas. */
export function SnapshotView({ snapshot, alt }: Props) {
  const width = snapshot.width ?? 800;
  const height = snapshot.height ?? 600;
  return (
    <div className={styles.area}>
      <figure className={styles.shot} style={{ "--ratio": width / height } as CSSProperties}>
        <Image className={styles.image} src={snapshot.url} alt={alt}
               width={width} height={height} unoptimized />
        <figcaption className={styles.tag}>captura del simulador</figcaption>
      </figure>
    </div>
  );
}
