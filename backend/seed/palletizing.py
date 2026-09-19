#!/usr/bin/env python
"""
Histórico de paletizado sembrado, para poder ver y enseñar la interfaz antes de que
exista el pipeline que la llenará de verdad.

    python backend/seed/palletizing.py --runs 6
    python backend/seed/palletizing.py --wipe          # borra solo lo sembrado

**Todo lo que escribe va con `synthetic = true`.** La interfaz lo distingue y nunca lo
mete en la misma comparación que un dato medido. Un número inventado que se lee como
medido es la forma más rápida de perder la credibilidad delante de un jurado, así que
la marca no es opcional ni se puede desactivar con un flag.

Escribe por el mismo camino que el sink real (`theker_telemetry`) en vez de meter SQL a
mano: así el camino de escritura que usará el pipeline de paletizado queda recorrido y
probado antes de que exista.

El modelo físico es deliberadamente sencillo —no es una simulación, es un generador de
datos plausibles— pero **la causalidad sí es real**: el CoG se desplaza según dónde y
con qué masa se coloca cada paquete, y el derrumbe ocurre cuando se sale del polígono
de soporte. Si no, la traza de CoG de la pantalla de episodio no enseñaría nada.
"""

from __future__ import annotations

import argparse
import math
import random
import sys
import urllib.request
from datetime import UTC, datetime, timedelta
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
REPO = BACKEND.parent

from theker_telemetry import EpisodeResult, Supabase  # noqa: E402

# Palé europeo. El diseño insiste en que se dibuje a escala real, así que las medidas
# tienen que ser las de verdad y no un cuadrado bonito.
PALLET_X, PALLET_Y = 1.200, 0.800

# El margen de estabilidad NO se mide contra el borde del palé, ni contra una
# envolvente fija. Un palé vuelca cuando, frenando o girando, el momento de vuelco
# supera al de restitución: con una aceleración lateral `a`, el montón cae si
#
#     a/g  >  d / h        d = distancia del CoG al borde del apoyo, h = altura del CoG
#
# de donde el margen que queda es `d - (a/g)*h`. Esto es lo que hace que el indicador
# signifique algo: apilar alto y descentrado lo empeora a la vez, que es exactamente
# el compromiso que el planificador tiene que resolver.
#
# El caso que se exige aguantar es un giro normal de carretilla, no estático. El reto
# pide "un palé que aguante el transporte", así que el listón se pone ahí.
TRANSPORT_ACCEL_G = 0.28

# Catálogo de paquetes: base de 580x380, el medio módulo europeo con la holgura que se
# deja de verdad en planta (un encaje al milímetro haría que cualquier error saliera
# del palé, y el fallo dominante sería el equivocado). Las masas son las del diseño;
# para el margen solo importan sus proporciones, pero la tabla de colocaciones las lee.
BOXES = [
    # nombre        largo  ancho  alto   masa
    ("caja baja",   0.580, 0.380, 0.200, 0.8),
    ("caja media",  0.580, 0.380, 0.300, 1.2),
    ("caja alta",   0.580, 0.380, 0.360, 2.8),
]

# Dos huecos por capa, así que el nivel se traduce en altura: más paquetes, más capas,
# el CoG más arriba y menos margen. En este repo el nivel ES la dificultad, y en
# paletizado la dificultad es apilar alto sin que se caiga.
SLOTS = [(-0.30, 0.0), (0.30, 0.0)]
SLOT_NAMES = ["A", "B"]
PACKAGES_BY_LEVEL = {1: 8, 2: 10}       # 4 capas (holgado) / 5 capas (al límite)

# Ejecuciones a sembrar, de peor a mejor: la curva de mejora es lo que se le enseña al
# jurado, así que el histórico sembrado tiene que contar una historia, no ser ruido.
#
# Dos palancas, y en este orden de importancia:
#
#   lookahead  cuántos paquetes de la cola ve el planificador antes de decidir. Con 1
#              coloca lo que le llega; con más, elige. Es la mejora grande, porque
#              permite mandar lo pesado abajo y bajar el CoG, que es lo que decide el
#              vuelco en un montón alto. No se modela como "ordenar el lote entero"
#              porque en planta la mercancía llega en cinta: solo ves lo que tienes
#              delante.
#   balance    elegir el hueco que devuelve el CoG al centro en vez de rellenar por
#              orden. Corrige el descentrado lateral. Es el afinado.
#
# La precisión del brazo es lo que menos mueve la aguja, y eso también es un resultado:
# el cuello de botella del paletizado es decidir qué caja va dónde, no la puntería.
CAMPAIGN = [
    # sha      nivel etiqueta            descripción                                       prec.  sesgo  ventana balance
    ("7e3b806", 2, "primer-paletizado", "primer planificador de capas, sin mirar el CoG",  0.014, 0.006, 1, False),
    ("2d77e41", 1, "huecos-fijos",      "huecos fijos por capa, sin elegir el paquete",    0.011, 0.004, 1, False),
    ("6f0f534", 2, "ventana-2",         "ventana de 2 paquetes: lo pesado, abajo",         0.011, 0.004, 2, False),
    ("9b1c220", 1, "recentrado-v1",     "ventana de 3 y recentrado del CoG por capa",      0.009, 0.003, 3, True),
    ("c40aa19", 2, "recentrado-v1",     "ventana de 3 y recentrado del CoG, nivel 2",      0.008, 0.002, 3, True),
    ("8c5cbf4", 2, "recentrado-v2",     "planificador de capas con recentrado de CoG",     0.005, 0.001, 4, True),
]


def support_polygon(base: list[tuple[float, float, float, float]]
                    ) -> tuple[float, float, float, float]:
    """Rectángulo que apoya en el palé: la envolvente de las cajas de la capa 1.

    Lo que sostiene el montón es lo que toca el suelo, no el palé entero. Un palé con
    una sola caja en una esquina tiene un apoyo pequeño aunque la tabla sea enorme."""
    xs0 = [x - dx / 2 for x, _, dx, _ in base]
    xs1 = [x + dx / 2 for x, _, dx, _ in base]
    ys0 = [y - dy / 2 for _, y, _, dy in base]
    ys1 = [y + dy / 2 for _, y, _, dy in base]
    return min(xs0), max(xs1), min(ys0), max(ys1)


def stability_margin(cog_x: float, cog_y: float, cog_z: float,
                     base: list[tuple[float, float, float, float]]) -> float:
    """Margen de estabilidad en metros. Negativo = vuelca en la primera frenada.

    Es el indicador que define toda la interfaz, así que se calcula en un solo sitio."""
    if not base:
        return 0.0
    x0, x1, y0, y1 = support_polygon(base)
    d_edge = min(cog_x - x0, x1 - cog_x, cog_y - y0, y1 - cog_y)
    return d_edge - TRANSPORT_ACCEL_G * cog_z


def _plan(queue: list, free: list[int], lookahead: int, balance: bool,
          mx: float, my: float, total: float) -> tuple[int, int]:
    """Decide qué paquete de la cola se coge y en qué hueco va.

    Devuelve (índice en la cola, hueco).

    La regla es "lo más pesado, lo más abajo posible", que es lo que hace un
    paletizador real y lo que baja el centro de gravedad. `lookahead` limita entre
    cuántos puede elegir: en planta la mercancía llega en cinta y solo se ve lo que se
    tiene delante. Con ventana 1 se coloca lo que toque, sin elegir nada.

    Ojo con la alternativa evidente, que se probó y es peor: maximizar el margen que
    queda TRAS esta colocación. Es miope — esquiva las cajas pesadas en cada paso y
    acaba amontonándolas arriba, que es exactamente el error que se quiere evitar.

    El hueco se elige aparte: con `balance`, el que deja el CoG más cerca del centro."""
    window = min(lookahead, len(queue))
    qi = max(range(window), key=lambda k: queue[k][4])      # [4] = masa

    if not balance:
        return qi, free[0]
    mass = queue[qi][4]
    def offset(slot: int) -> float:
        sx, sy = SLOTS[slot]
        return math.hypot((mx + sx * mass) / (total + mass),
                          (my + sy * mass) / (total + mass))
    return qi, min(free, key=offset)


def build_episode(rng: random.Random, precision: float, bias: float,
                  lookahead: int, balance: bool, n_packages: int = 12) -> dict:
    """Un episodio: coloca paquetes capa a capa y deja que el CoG decida el final."""
    placements, states, events = [], [], []
    total_mass = 0.0
    mx = my = mz = 0.0          # momentos, para el centro de gravedad acumulado
    t = 0.0
    failure: str | None = None
    n_placed = 0
    free: list[int] = []
    base: list[tuple[float, float, float, float]] = []   # huellas de la capa 1

    # La cola de paquetes de este episodio. El planificador solo ve los primeros
    # `lookahead`: en planta la mercancía llega en cinta y no se puede reordenar.
    queue = [BOXES[rng.randrange(len(BOXES))] for _ in range(n_packages)]
    mean_h = sum(b[3] for b in BOXES) / len(BOXES)

    for i in range(n_packages):
        layer = i // len(SLOTS) + 1
        if not free:
            free = list(range(len(SLOTS)))
        # Altura del hueco: las capas anteriores por debajo. Se aproxima con la altura
        # media del catálogo, que para decidir y para dibujar un alzado sobra.
        pz_of = {b[3]: mean_h * (layer - 1) + b[3] / 2 for b in BOXES}
        qi, slot = _plan(queue, free, lookahead, balance,
                         mx, my, total_mass or 1e-9)
        name, dx, dy, dz, mass = queue.pop(qi)
        free.remove(slot)
        px, py = SLOTS[slot]
        pz = pz_of[dz]

        t += rng.uniform(1.5, 2.0)
        events.append({"ts": round(t, 1), "seq": len(events), "kind": "perceive",
                       "payload": {"seen": rng.randint(1, 4),
                                   "confidence": round(rng.uniform(0.72, 0.97), 2)}})
        t += rng.uniform(0.4, 0.6)
        events.append({"ts": round(t, 1), "seq": len(events), "kind": "plan",
                       "package_id": f"caja_{i + 1:02d}",
                       "payload": {"layer": layer, "slot": SLOT_NAMES[slot]}})
        t += rng.uniform(0.5, 0.8)
        events.append({"ts": round(t, 1), "seq": len(events), "kind": "pick",
                       "package_id": f"caja_{i + 1:02d}",
                       "payload": {"mass_kg": mass, "type": name}})

        # El error de colocación es lo que mueve el CoG. El sesgo es sistemático (el
        # planificador tira siempre para el mismo lado) y la precisión es el ruido:
        # separarlos es lo que hace que la traza de CoG *derive* en vez de temblar.
        ex = rng.gauss(bias, precision)
        ey = rng.gauss(bias * 0.4, precision)
        ax, ay = px + ex, py + ey
        error_xy = math.hypot(ex, ey)
        error_yaw = abs(rng.gauss(0.0, precision * 3))

        total_mass += mass
        mx += ax * mass
        my += ay * mass
        mz += pz * mass
        cog_x, cog_y, cog_z = mx / total_mass, my / total_mass, mz / total_mass
        if layer == 1:
            base.append((ax, ay, dx, dy))
        margin = stability_margin(cog_x, cog_y, cog_z, base)

        overhang = max(0.0, abs(ax) + dx / 2 - PALLET_X / 2,
                       abs(ay) + dy / 2 - PALLET_Y / 2)
        support = max(0.0, min(1.0, 1.0 - error_xy / (min(dx, dy) / 2)))
        drift = abs(rng.gauss(0.002, 0.004)) + max(0.0, -margin) * 2

        t += rng.uniform(0.6, 0.9)
        placed = margin > 0 and overhang <= 0.02
        n_placed += int(placed)
        events.append({
            "ts": round(t, 1), "seq": len(events), "kind": "place",
            "package_id": f"caja_{i + 1:02d}",
            "payload": {"error_xy_mm": round(error_xy * 1000, 1),
                        "error_yaw_deg": round(math.degrees(error_yaw), 1),
                        "overhang_mm": round(overhang * 1000, 1)},
        })

        placements.append({
            "seq": i, "package_id": f"caja_{i + 1:02d}", "package_type": name,
            "mass_kg": mass, "dims_m": [dx, dy, dz], "layer": layer,
            "planned_pose": {"x": px, "y": py, "z": round(pz, 4), "yaw": 0.0},
            "actual_pose": {"x": round(ax, 4), "y": round(ay, 4), "z": round(pz, 4),
                            "yaw": round(error_yaw, 4)},
            "error_xy_m": round(error_xy, 5), "error_yaw_rad": round(error_yaw, 5),
            "support_ratio": round(support, 3), "overhang_m": round(overhang, 4),
            "placed": placed,
        })
        states.append({
            "after_seq": i, "mass_kg": round(total_mass, 3),
            "cog_x": round(cog_x, 4), "cog_y": round(cog_y, 4), "cog_z": round(cog_z, 4),
            "stability_margin_m": round(margin, 4),
            "fill_ratio": round(min(1.0, (i + 1) / n_packages * 0.78), 3),
            "settle_drift_m": round(drift, 4),
        })
        t += rng.uniform(0.3, 0.5)
        events.append({"ts": round(t, 1), "seq": len(events), "kind": "settle",
                       "payload": {"layer": layer, "drift_mm": round(drift * 1000, 1)}})

        # El montón se cae cuando el CoG sale del soporte. Esa es toda la regla, y es
        # la que hace que la traza de CoG deje ver venir el fallo.
        if margin < 0:
            failure = "stack_collapse"
        elif overhang > 0.02:
            failure = "overhang_violation"
        elif error_xy > 0.045:
            failure = "wrong_placement"
        if failure:
            events.append({"ts": round(t, 1), "seq": len(events), "kind": "fail",
                           "package_id": f"caja_{i + 1:02d}",
                           "payload": {"cause": failure}})
            break

    return {"placements": placements, "pallet_states": states, "events": events,
            "duration_s": round(t, 2), "n_placed": n_placed, "failure": failure,
            "n_packages": n_packages,
            "final": states[-1] if states else None}


def seed_run(client: Supabase, sha: str, level: int, label: str, description: str,
             precision: float, bias: float, lookahead: int, balance: bool, *, seeds: range, started: datetime,
             rng: random.Random) -> tuple[str, int]:
    run = client.insert("runs", [{
        "task": "palletizing", "level": level, "git_sha": sha,
        "oracle": False, "synthetic": True, "motion_speed": 4.0,
        "label": label, "description": description,
        "n_episodes": len(seeds), "started_at": started.isoformat(),
        "ended_at": (started + timedelta(minutes=17)).isoformat(),
    }], returning=True)[0]

    successes = 0
    for seed in seeds:
        # Semilla determinista por (commit, episodio): relanzar el sembrado dos veces
        # da el mismo histórico, igual que exigimos al simulador de verdad.
        rng.seed(hash((sha, seed)) & 0xFFFFFFFF)
        ep = build_episode(rng, precision, bias, lookahead, balance,
                           PACKAGES_BY_LEVEL[level])
        result = EpisodeResult(
            seed=seed, level=level, n_objects=ep["n_packages"],
            n_placed=ep["n_placed"], n_misrouted=0,
            success=ep["failure"] is None, duration_s=ep["duration_s"],
            failure=ep["failure"], oracle=False, git_sha=sha, task="palletizing",
            metrics={
                "cog_offset_xy": round(math.hypot(ep["final"]["cog_x"],
                                                  ep["final"]["cog_y"]), 4),
                "fill_ratio": ep["final"]["fill_ratio"],
                "settle_drift": ep["final"]["settle_drift_m"],
                "n_layers": ep["placements"][-1]["layer"],
            },
        )
        successes += int(result.success)
        episode = client.insert("episodes", [{
            "run_id": run["id"], "seed": result.seed, "task": result.task,
            "level": result.level,
            "status": "success" if result.success else "failure",
            "duration_s": result.duration_s, "n_objects": result.n_objects,
            "n_placed": result.n_placed, "failure": result.failure,
            "metrics": result.metrics, "started_at": started.isoformat(),
        }], returning=True)[0]

        for table, rows in (("placements", ep["placements"]),
                            ("pallet_states", ep["pallet_states"]),
                            ("events", ep["events"])):
            client.insert(table, [{**r, "episode_id": episode["id"]} for r in rows])
    return run["id"], successes


def wipe(client: Supabase) -> int:
    """Borra solo lo sembrado. Lo real no se toca ni por accidente."""
    rows = client.get("runs", select="id", synthetic="true")
    for row in rows:
        request = urllib.request.Request(
            f"{client.base}/runs?id=eq.{row['id']}", method="DELETE",
            headers=client._headers("return=minimal"))
        urllib.request.urlopen(request, timeout=10).close()
    return len(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runs", type=int, default=len(CAMPAIGN),
                        help=f"cuántas ejecuciones sembrar (máx {len(CAMPAIGN)})")
    parser.add_argument("--episodes", type=int, default=25)
    parser.add_argument("--wipe", action="store_true", help="borra lo sembrado y sale")
    args = parser.parse_args()

    client = Supabase.from_env(REPO)
    if client is None:
        print("falta SUPABASE_URL o SUPABASE_SERVICE_KEY (mira el .env de la raíz)")
        return 1

    if args.wipe:
        print(f"{wipe(client)} ejecuciones sembradas borradas")
        return 0

    rng = random.Random()
    now = datetime.now(UTC)
    for i, (sha, level, label, desc, precision, bias, lookahead, balance) in enumerate(CAMPAIGN[:args.runs]):
        # Las más viejas primero: la campaña cuenta una mejora a lo largo del tiempo.
        started = now - timedelta(hours=(len(CAMPAIGN) - i) * 9)
        seeds = range(20, 20 + args.episodes)
        _, ok = seed_run(client, sha, level, label, desc, precision, bias, lookahead, balance,
                         seeds=seeds, started=started, rng=rng)
        print(f"  {sha}  n{level}  {label:<18} {ok:>2}/{args.episodes} éxitos  {desc}")

    print(f"\n{min(args.runs, len(CAMPAIGN))} ejecuciones sembradas, "
          f"todas con synthetic = true")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
