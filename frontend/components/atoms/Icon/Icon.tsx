import type { ReactNode } from "react";

export type IconName = "check" | "arrowDown" | "crosshair" | "circleDot" | "wave" | "x" | "flag" | "chevronsUpDown" | "sun" | "moon";

/* Trazos de 16×16. Iconos de línea, sin relleno: ninguno lleva color propio, heredan
   `currentColor` del que los use. */
const PATHS: Record<IconName, ReactNode> = {
  check: <path d="M3 8.5 6.5 12 13 4.5" />,
  arrowDown: <path d="M8 2.5v10M4 8.5l4 4 4-4" />,
  crosshair: (<><circle cx="8" cy="8" r="3.2" /><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3" /></>),
  circleDot: (<><circle cx="8" cy="8" r="5.5" /><circle cx="8" cy="8" r="1.4" fill="currentColor" /></>),
  wave: <path d="M2 6c2-2 4-2 6 0s4 2 6 0M2 10.5c2-2 4-2 6 0s4 2 6 0" />,
  x: <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />,
  flag: <path d="M4 14V2.5M4 3h8.5l-2.2 3 2.2 3H4" />,
  chevronsUpDown: <path d="M5 6.5 8 3.5l3 3M5 9.5l3 3 3-3" />,
  sun: (<><circle cx="8" cy="8" r="2.8" /><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" /></>),
  moon: <path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z" />,
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
