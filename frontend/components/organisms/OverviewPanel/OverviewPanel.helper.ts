/** Lleva la pantalla a una tarjeta. La navegación por `#hash` no vale aquí: la que scrollea es un
 *  contenedor de la pantalla y no el documento, y `scrollIntoView` sí lo respeta (y respeta
 *  `scroll-margin-top` y el `scroll-behavior` del CSS, así que «reducir movimiento» salta). */
export function scrollToAnchor(id: string): void {
  document.getElementById(id)?.scrollIntoView({ block: "start" });
}
