"""Geometría del palé: polígono de apoyo y margen de estabilidad.

Vive en el paquete y no en `seed/` porque es el indicador que define toda la interfaz
—el diseño le dedica un tablero entero a sus tres estados— y lo calculan dos repos: la
simulación y el sembrado. Dos implementaciones del mismo número acaban discrepando, y
entonces no se sabe cuál miente.

Sin dependencias: sólo la stdlib.
"""

from __future__ import annotations

# Aceleración lateral que se exige aguantar, en g. El caso no es un palé quieto: un
# montón vuelca frenando o girando. Con aceleración lateral `a`, cae si
#
#     a/g  >  d / h        d = distancia del CoG al borde del apoyo, h = altura del CoG
#
# de donde el margen que queda es `d - (a/g)*h`. Esto es lo que hace que el indicador
# signifique algo: apilar alto y descentrar lo empeoran a la vez, que es exactamente el
# compromiso que el planificador tiene que resolver.
TRANSPORT_ACCEL_G = 0.28

# Caja = (x, y, ancho_x, ancho_y), en metros y en el frame del palé.
Caja = tuple[float, float, float, float]


def support_polygon(base: list[Caja]) -> tuple[float, float, float, float]:
    """Rectángulo que apoya en el palé: la envolvente de las cajas de la capa 1.

    Lo que sostiene el montón es lo que toca el suelo, no el palé entero. Un palé con
    una sola caja en una esquina tiene un apoyo pequeño aunque la tabla sea enorme.
    """
    xs0 = [x - dx / 2 for x, _, dx, _ in base]
    xs1 = [x + dx / 2 for x, _, dx, _ in base]
    ys0 = [y - dy / 2 for _, y, _, dy in base]
    ys1 = [y + dy / 2 for _, y, _, dy in base]
    return min(xs0), max(xs1), min(ys0), max(ys1)


def stability_margin(cog_x: float, cog_y: float, cog_z: float,
                     base: list[Caja],
                     accel_g: float = TRANSPORT_ACCEL_G) -> float:
    """Margen de estabilidad en metros. Negativo = vuelca en la primera frenada.

    Se mide contra el polígono de apoyo, NO contra el borde del palé: medirlo contra el
    palé da números optimistas y la pantalla diría que todo va bien hasta el derrumbe.
    """
    if not base:
        return 0.0
    x0, x1, y0, y1 = support_polygon(base)
    d_edge = min(cog_x - x0, x1 - cog_x, cog_y - y0, y1 - cog_y)
    return d_edge - accel_g * cog_z
