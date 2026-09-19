import type { ReactNode } from "react";

export type IconName = "check" | "arrowDown" | "crosshair" | "circleDot" | "wave" | "x";

/* Trazos de 16×16. Iconos de línea, sin relleno: ninguno lleva color propio, heredan
   `currentColor` del que los use. */
const PATHS: Record<IconName, ReactNode> = {
  check: <path d="M3 8.5 6.5 12 13 4.5" />,
  arrowDown: <path d="M8 2.5v10M4 8.5l4 4 4-4" />,
  crosshair: (<><circle cx="8" cy="8" r="3.2" /><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3" /></>),
  circleDot: (<><circle cx="8" cy="8" r="5.5" /><circle cx="8" cy="8" r="1.4" fill="currentColor" /></>),
  wave: <path d="M2 6c2-2 4-2 6 0s4 2 6 0M2 10.5c2-2 4-2 6 0s4 2 6 0" />,
  x: <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />,
};

/** Decorativo: el significado lo lleva el texto de al lado, no el icono. */
export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
         strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
