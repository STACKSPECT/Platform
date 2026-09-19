"""El sembrado: el modelo de vuelco y la reproducibilidad del histórico.

`stability_margin` es el indicador que define toda la interfaz —el diseño dedica un
tablero entero a sus tres estados— así que conviene que su signo signifique lo que dice
que significa: negativo = vuelca.
"""

import os
import random
import subprocess
import sys
from pathlib import Path

from seed.palletizing import (
    CAMPAIGN,
    PACKAGES_BY_LEVEL,
    TRANSPORT_ACCEL_G,
    build_episode,
    episode_seed,
    stability_margin,
    support_polygon,
)

# Dos cajas de 580x380 en los huecos A y B: la capa 1 típica del sembrado.
BASE = [(-0.30, 0.0, 0.580, 0.380), (0.30, 0.0, 0.580, 0.380)]


# ── el polígono de apoyo ─────────────────────────────────────────────────────

def test_el_apoyo_es_la_envolvente_de_la_capa_1():
    """Lo que sostiene el montón es lo que toca el suelo, no el palé entero."""
    x0, x1, y0, y1 = support_polygon(BASE)
    assert (round(x0, 3), round(x1, 3)) == (-0.590, 0.590)
    assert (round(y0, 3), round(y1, 3)) == (-0.190, 0.190)


def test_una_sola_caja_en_una_esquina_apoya_poco():
    x0, x1, y0, y1 = support_polygon([(0.30, 0.0, 0.580, 0.380)])
    assert round(x1 - x0, 3) == 0.580
    assert round(y1 - y0, 3) == 0.380


# ── el margen de estabilidad ─────────────────────────────────────────────────

def test_sin_base_no_hay_margen():
    assert stability_margin(0.0, 0.0, 0.0, []) == 0.0


def test_un_cog_centrado_y_bajo_es_estable():
    assert stability_margin(0.0, 0.0, 0.10, BASE) > 0


def test_un_cog_fuera_del_apoyo_vuelca():
    """Fuera del polígono el margen tiene que ser negativo, no un cero optimista."""
    assert stability_margin(0.80, 0.0, 0.10, BASE) < 0


def test_apilar_mas_alto_empeora_el_margen():
    bajo = stability_margin(0.0, 0.0, 0.10, BASE)
    alto = stability_margin(0.0, 0.0, 0.50, BASE)
    assert alto < bajo


def test_descentrar_empeora_el_margen():
    """En Y, que es la dimensión estrecha: el apoyo mide 1180x380, así que el borde que
    manda es siempre el de Y y descentrar en X no acerca el CoG a caerse."""
    centrado = stability_margin(0.0, 0.0, 0.20, BASE)
    torcido = stability_margin(0.0, 0.15, 0.20, BASE)
    assert torcido < centrado


def test_en_el_lado_largo_manda_el_borde_estrecho():
    a_lo_ancho = stability_margin(0.15, 0.0, 0.20, BASE)
    centrado = stability_margin(0.0, 0.0, 0.20, BASE)
    assert a_lo_ancho == centrado


def test_el_margen_es_la_distancia_al_borde_menos_el_termino_de_transporte():
    """`d - (a/g)*h`: el listón es un giro de carretilla, no un palé quieto."""
    esperado = 0.19 - TRANSPORT_ACCEL_G * 0.30
    assert stability_margin(0.0, 0.0, 0.30, BASE) == round(esperado, 10) or \
        abs(stability_margin(0.0, 0.0, 0.30, BASE) - esperado) < 1e-12


# ── la campaña sembrada ──────────────────────────────────────────────────────

def test_todos_los_niveles_de_la_campana_tienen_paquetes():
    """Un nivel nuevo en CAMPAIGN sin entrada aquí revienta el sembrado entero."""
    niveles = {level for _, level, *_ in CAMPAIGN}
    assert niveles <= set(PACKAGES_BY_LEVEL)


def test_la_campana_va_de_peor_a_mejor():
    """El histórico tiene que contar una curva de mejora, no ruido: la ventana del
    planificador no puede encogerse por el camino."""
    ventanas = [fila[6] for fila in CAMPAIGN]
    assert ventanas == sorted(ventanas)


# ── reproducibilidad ─────────────────────────────────────────────────────────

def test_la_semilla_no_depende_de_pythonhashseed():
    """El bug que esto cierra: `hash()` de una cadena está aleatorizado por proceso
    desde Python 3.3, así que cada ejecución del sembrado daba un histórico distinto
    mientras el comentario prometía lo contrario. Hay que lanzarlo en dos procesos
    con PYTHONHASHSEED distinto, porque dentro de uno solo el hash sí es estable y el
    fallo no se ve."""
    guion = ("import sys; sys.path.insert(0, '.');"
             "from seed.palletizing import episode_seed;"
             "print(episode_seed('8c5cbf4', 37))")

    salidas = set()
    for semilla_hash in ("0", "1", "random"):
        entorno = {**os.environ, "PYTHONHASHSEED": semilla_hash}
        salidas.add(subprocess.run(
            [sys.executable, "-c", guion], capture_output=True, text=True,
            cwd=Path(__file__).resolve().parents[1], env=entorno, check=True,
        ).stdout.strip())

    assert len(salidas) == 1, f"la semilla cambia entre procesos: {salidas}"


def test_semillas_distintas_para_episodios_distintos():
    """Determinista no puede significar constante, o todos los episodios de un run
    saldrían calcados."""
    semillas = {episode_seed("8c5cbf4", s) for s in range(25)}
    assert len(semillas) == 25
    assert episode_seed("8c5cbf4", 1) != episode_seed("6f0f534", 1)


def test_el_mismo_rng_da_el_mismo_episodio():
    """Sin esto el histórico sembrado cambia solo, y la curva de mejora deja de ser
    comparable consigo misma."""
    a = build_episode(random.Random(1234), 0.011, 0.004, 2, False, 10)
    b = build_episode(random.Random(1234), 0.011, 0.004, 2, False, 10)

    assert a["n_placed"] == b["n_placed"]
    assert a["failure"] == b["failure"]
    assert a["duration_s"] == b["duration_s"]
    assert a["placements"] == b["placements"]
    assert a["pallet_states"] == b["pallet_states"]


def test_un_episodio_tiene_traza_de_cog_por_paquete():
    """Una fila de `pallet_states` por paquete INTENTADO: eso ES la traza de CoG. El
    intento que derrumba el montón también deja su fila, y es justo la que hace que
    CogTrace pueda enseñar el margen cruzando el cero."""
    for seed in range(15):
        ep = build_episode(random.Random(seed), 0.011, 0.004, 2, False, 10)
        estados = ep["pallet_states"]

        assert [s["after_seq"] for s in estados] == list(range(len(estados)))
        assert ep["n_placed"] <= len(estados) <= ep["n_placed"] + 1


def test_un_episodio_fallido_nombra_una_causa_del_vocabulario():
    from theker_telemetry.schema import FAILURES

    for seed in range(30):
        ep = build_episode(random.Random(seed), 0.020, 0.010, 1, False, 10)
        assert ep["failure"] is None or ep["failure"] in FAILURES


def test_mirar_mas_lejos_coloca_al_menos_tantos_paquetes():
    """La ventana del planificador es la palanca grande: manda lo pesado abajo."""
    miope = sum(build_episode(random.Random(s), 0.011, 0.004, 1, False, 10)["n_placed"]
                for s in range(40))
    previsor = sum(build_episode(random.Random(s), 0.011, 0.004, 4, True, 10)["n_placed"]
                   for s in range(40))
    assert previsor > miope
