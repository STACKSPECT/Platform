"""Geometría del palé: polígono de apoyo y margen de estabilidad.

Vive en el paquete y no en `seed/` porque es el indicador que define toda la interfaz
—el diseño le dedica un tablero entero a sus tres estados— y lo calculan dos repos: la
simulación y el sembrado. Dos implementaciones del mismo número acaban discrepando, y
entonces no se sabe cuál miente.

Sin dependencias: sólo la stdlib.
"""

from __future__ import annotations

import math

# Aceleración lateral que se exige aguantar, en g. El caso no es un palé quieto: un
# montón vuelca frenando o girando. Con aceleración lateral `a`, cae si
#
#     a/g  >  d / h        d = distancia del CoG al borde del apoyo, h = altura del CoG
#
# de donde el margen que queda es `d - (a/g)*h`. Esto es lo que hace que el indicador
# signifique algo: apilar alto y descentrar lo empeoran a la vez, que es exactamente el
# compromiso que el planificador tiene que resolver.
TRANSPORT_ACCEL_G = 0.28

# Caja = (x, y, ancho_x, ancho_y) o (x, y, ancho_x, ancho_y, yaw), en metros y radianes,
# en el frame del palé. El `yaw` es opcional y vale 0 si no viene: una caja sin girar se
# sigue escribiendo con cuatro números.
Caja = tuple[float, ...]

Punto = tuple[float, float]


def corners(caja: Caja) -> list[Punto]:
    """Las cuatro esquinas de la caja en planta, ya giradas por su `yaw`.

    El paletizado gira paquetes a propósito —90° para que entren en la fila—, así que
    tratar `(dx, dy)` como si siempre estuviera alineado con los ejes se come el giro:
    una caja de 480x340 puesta de canto apoya 340 de ancho, no 480.
    """
    x, y, dx, dy = caja[0], caja[1], caja[2], caja[3]
    yaw = caja[4] if len(caja) > 4 else 0.0
    cos, sin = math.cos(yaw), math.sin(yaw)
    return [(x + u * cos - v * sin, y + u * sin + v * cos)
            for u, v in ((-dx / 2, -dy / 2), (dx / 2, -dy / 2),
                         (dx / 2, dy / 2), (-dx / 2, dy / 2))]


def _cross(o: Punto, a: Punto, b: Punto) -> float:
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def support_hull(base: list[Caja]) -> list[Punto]:
    """Polígono de apoyo de verdad: la envolvente CONVEXA de las esquinas de la capa 1.

    Convexa y no rectangular porque con cajas giradas el rectángulo envolvente incluye
    esquinas donde no apoya nada, y eso da un margen optimista: la pantalla diría que
    todo va bien hasta el derrumbe, que es justo lo que este indicador existe para
    evitar. Sale en orden antihorario, que es lo que asume `stability_margin`.
    """
    pts = sorted({p for caja in base for p in corners(caja)})
    if len(pts) < 3:
        return pts

    def media(ordenados: list[Punto]) -> list[Punto]:
        out: list[Punto] = []
        for p in ordenados:
            while len(out) >= 2 and _cross(out[-2], out[-1], p) <= 0:
                out.pop()
            out.append(p)
        return out

    return media(pts)[:-1] + media(pts[::-1])[:-1]


def support_polygon(base: list[Caja]) -> tuple[float, float, float, float]:
    """Rectángulo que encierra el apoyo: `(x0, x1, y0, y1)`, con los giros ya aplicados.

    Es la caja envolvente del apoyo, útil para encuadrar y para medir vuelo (overhang).
    Para el margen de estabilidad se usa `support_hull`, que no regala las esquinas.
    """
    pts = [p for caja in base for p in corners(caja)]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), max(xs), min(ys), max(ys)


def stability_margin(cog_x: float, cog_y: float, cog_z: float,
                     base: list[Caja],
                     accel_g: float = TRANSPORT_ACCEL_G) -> float:
    """Margen de estabilidad en metros. Negativo = vuelca en la primera frenada.

    Se mide contra el polígono de apoyo, NO contra el borde del palé: medirlo contra el
    palé da números optimistas y la pantalla diría que todo va bien hasta el derrumbe.
    """
    if not base:
        return 0.0
    hull = support_hull(base)
    if len(hull) < 3:            # apoyo degenerado (sin área): no sostiene nada
        return 0.0

    # Distancia con signo del CoG a cada lado; en un polígono antihorario es positiva
    # por dentro. La menor es la que manda: el montón cae por su lado más flojo.
    d_edge = min(
        _cross(a, b, (cog_x, cog_y)) / math.dist(a, b)
        for a, b in zip(hull, hull[1:] + hull[:1])
    )
    return d_edge - accel_g * cog_z
