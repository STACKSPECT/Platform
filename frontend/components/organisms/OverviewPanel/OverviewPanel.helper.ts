/** Lleva la pantalla a una tarjeta. La navegación por `#hash` no vale aquí: la que scrollea es un
 *  contenedor de la pantalla y no el documento, y `scrollIntoView` sí lo respeta (y respeta
 *  `scroll-margin-top` y el `scroll-behavior` del CSS, así que «reducir movimiento» salta). */
export function scrollToAnchor(id: string): void {
  const card = document.getElementById(id);
  if (!card) return;
  // La tarjeta puede estar plegada, y llevar a una cabecera cerrada no es llevar a ningún
  // sitio: lo que se ha pedido son sus curvas. Abrirla dispara el `toggle` del `<details>`,
  // así que el componente se entera y no vuelve a plegarla en el siguiente refresco.
  const detalle = card.querySelector("details");
  if (detalle) detalle.open = true;
  card.scrollIntoView({ block: "start" });
}
