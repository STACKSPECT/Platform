"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../atoms";
import { placeTip, type TipPosition } from "./InfoTip.helper";
import styles from "./InfoTip.module.css";

type Props = {
  /** Qué se explica, para el lector de pantalla: «Qué es la tasa de éxito». */
  label: string;
  /** La explicación. Corta: dos o tres frases. */
  children: ReactNode;
};

/** Un icono «i» que explica lo que tiene al lado. Se abre con el ratón, con el foco del teclado y
 *  con un toque; se cierra al salir, con Escape o al tocar fuera, y sigue al icono si se scrollea.
 *
 *  La explicación se pinta en un portal y con posición fija: las tarjetas recortan lo que se sale
 *  (`overflow`) y crean su propio contexto de posición (container queries), y una explicación
 *  cortada a medias es peor que ninguna. */
export function InfoTip({ label, children }: Props) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<TipPosition | null>(null);

  const place = () => {
    if (!button.current || !tip.current) return;
    setPos(placeTip(
      button.current.getBoundingClientRect(),
      { width: tip.current.offsetWidth, height: tip.current.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    ));
  };

  // Se mide después de pintarla (hasta entonces, invisible) para saber cuánto ocupa y dónde cabe.
  useLayoutEffect(() => { if (open) place(); }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => { setOpen(false); setPos(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onPointer = (e: PointerEvent) => {
      if (!button.current?.contains(e.target as Node)) close();
    };
    // Al scrollear (también al llegar con el teclado a un icono fuera de vista) el icono se mueve:
    // la explicación lo sigue en vez de cerrarse o quedarse en el aire.
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const show = () => setOpen(true);
  const hide = () => { setOpen(false); setPos(null); };

  return (
    <>
      <button ref={button} type="button" className={styles.trigger} aria-label={label}
              aria-describedby={open ? id : undefined} aria-expanded={open}
              onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onClick={show}>
        <Icon name="info" size={14} />
      </button>
      {open && createPortal(
        <div ref={tip} id={id} role="tooltip" className={styles.tip}
             style={pos ? { left: pos.left, top: pos.top } : { visibility: "hidden", left: 0, top: 0 }}>
          {children}
        </div>,
        document.body,
      )}
    </>
  );
}
