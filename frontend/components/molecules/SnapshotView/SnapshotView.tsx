import Image from "next/image";
import type { Snapshot } from "@/lib/supabase";
import styles from "./SnapshotView.module.css";

type Props = { snapshot: Snapshot; alt: string };

/** La captura que dejó el simulador. Se enseña al lado del esquema para comprobar que
 *  el dibujo no miente: si la foto y el esquema no coinciden, uno de los dos está mal y
 *  hasta ahora no había forma de saberlo. */
export function SnapshotView({ snapshot, alt }: Props) {
  return (
    <Image
      className={styles.shot}
      src={snapshot.url}
      alt={alt}
      width={snapshot.width ?? 800}
      height={snapshot.height ?? 600}
      unoptimized
    />
  );
}
