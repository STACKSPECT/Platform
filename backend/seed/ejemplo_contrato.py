"""Borra los datos de humo y deja UNA entrada de ejemplo que ejercita el contrato entero.

Toca todas las columnas de API.md: las cinco tablas, los seis tipos de evento con las
claves de `payload` que espera EventFeed, varias causas de fallo, y los casos límite que
el front tiene que saber pintar (un episodio sin nada colocado, poses planificadas
contra reales, `overhang` positivo).

Va marcada `synthetic = true`. No es opcional: son números inventados, y la regla del
proyecto es que nunca se confundan con medidos ni entren en una comparación.

    python ejemplo_contrato.py [--borrar-solo]
"""

import argparse
import math
import random
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
REPO = BACKEND.parent

from seed.palletizing import BOXES, SLOTS, stability_margin, support_polygon  # noqa: E402
from theker_telemetry import Supabase  # noqa: E402

ETIQUETA = "ejemplo-contrato"

# seed -> (paquetes, causa de fallo o None, en qué paquete falla)
GUION = {
    20: (8, None, None),                        # éxito limpio: 4 capas
    21: (10, "stack_collapse", 8),              # el montón se derrumba
    22: (8, None, None),                        # éxito
    23: (10, "overhang_violation", 7),          # se sale del palé (hueco B)
    24: (10, "grasp_slip", 4),                  # se le escapa de la pinza
    25: (10, "no_detection", 0),                # no ve nada: 0 colocados
    # Dos más de lo mismo, para que haya una causa DOMINANTE de verdad y no un
    # empate que mode() resuelve a cara o cruz.
    26: (10, "stack_collapse", 8),
    27: (10, "stack_collapse", 7),
}


def borrar(c: Supabase, *etiquetas: str) -> int:
    n = 0
    for etiqueta in etiquetas:
        for fila in c.get("runs", select="id", label=etiqueta):
            c.delete("runs", {"id": fila["id"]})     # cascade limpia las hijas
            n += 1
    return n


def episodio(rng: random.Random, paquetes: int,
             causa: str | None, falla_en: int | None) -> dict:
    """Un episodio entero: placements, pallet_states y events coherentes entre sí."""
    t = 0.0
    mx = my = mz = masa = 0.0
    base: list[tuple[float, float, float, float]] = []
    colocaciones, estados, eventos = [], [], []
    puestos = 0
    seq_ev = 0

    def evento(kind: str, pkg: str | None, payload: dict) -> None:
        nonlocal seq_ev
        eventos.append({"ts": round(t, 2), "seq": seq_ev, "kind": kind,
                        "package_id": pkg, "payload": payload})
        seq_ev += 1

    if causa == "no_detection":
        t = 2.4
        evento("perceive", None, {"seen": 0, "confidence": 0.11})
        evento("fail", None, {"cause": causa})
        return {"placements": [], "pallet_states": [], "events": eventos,
                "n_placed": 0, "duration_s": t, "failure": causa, "final": None}

    for i in range(paquetes):
        nombre, dx, dy, dz, kg = BOXES[i % len(BOXES)]
        capa = i // len(SLOTS) + 1
        sx, sy = SLOTS[i % len(SLOTS)]
        z = (capa - 1) * dz + dz / 2

        t += 0.5
        evento("perceive", f"pkg_{i:02d}",
               {"seen": paquetes - i, "confidence": round(rng.uniform(0.93, 0.99), 2)})
        t += 0.3
        evento("plan", f"pkg_{i:02d}", {"layer": capa, "slot": "AB"[i % len(SLOTS)]})
        t += 0.6
        evento("pick", f"pkg_{i:02d}", {"mass_kg": kg})

        # Se le escapa de la pinza: no llega a depositarse, así que no deja colocación.
        if causa == "grasp_slip" and i == falla_en:
            t += 0.4
            evento("fail", f"pkg_{i:02d}", {"cause": causa})
            break

        # Sesgo sistemático + ruido, para que la traza derive en vez de temblar.
        ex = rng.gauss(0.004 if causa == "stack_collapse" else 0.0, 0.005)
        ey = rng.gauss(0.003 if causa == "stack_collapse" else 0.0, 0.005)
        if causa == "overhang_violation" and i == falla_en:
            # Hacia AFUERA, que depende del hueco: sumar en el hueco A (x negativa)
            # lo acercaría al centro y no se saldría de nada.
            ex += 0.075 * (1 if sx > 0 else -1)
        x, y = sx + ex, sy + ey

        masa += kg
        mx += x * kg
        my += y * kg
        mz += z * kg
        if capa == 1:
            base.append((x, y, dx, dy))

        cog = (mx / masa, my / masa, mz / masa)
        margen = stability_margin(*cog, base)
        x0, x1, y0, y1 = support_polygon(base)
        overhang = max(0.0, x + dx / 2 - x1, x0 - (x - dx / 2))
        if causa == "stack_collapse" and i == falla_en:
            margen = -0.012                   # aquí vuelca
        error = math.hypot(ex, ey)
        deriva = abs(rng.gauss(0.002, 0.0015)) * (3 if margen < 0.02 else 1)

        t += 1.4
        evento("place", f"pkg_{i:02d}",
               {"error_xy_mm": round(error * 1000, 1),
                "error_yaw_deg": round(abs(rng.gauss(0, 0.5)), 1),
                "overhang_mm": round(overhang * 1000, 1)})
        t += 0.8
        evento("settle", f"pkg_{i:02d}",
               {"layer": capa, "drift_mm": round(deriva * 1000, 1)})

        puesto = margen > 0 and overhang <= 0.02
        colocaciones.append({
            "seq": i, "package_id": f"pkg_{i:02d}", "package_type": nombre,
            "mass_kg": kg, "dims_m": [dx, dy, dz], "layer": capa,
            "planned_pose": {"x": sx, "y": sy, "z": round(z, 4), "yaw": 0.0},
            "actual_pose": {"x": round(x, 4), "y": round(y, 4), "z": round(z, 4),
                            "yaw": round(rng.gauss(0, 0.01), 4)},
            "error_xy_m": round(error, 5),
            "error_yaw_rad": round(abs(rng.gauss(0, 0.009)), 5),
            "support_ratio": round(min(1.0, 1.0 - overhang / dx), 3),
            "overhang_m": round(overhang, 4),
            "placed": puesto,
        })
        estados.append({
            "after_seq": i, "mass_kg": round(masa, 3),
            "cog_x": round(cog[0], 4), "cog_y": round(cog[1], 4),
            "cog_z": round(cog[2], 4),
            "stability_margin_m": round(margen, 4),
            "fill_ratio": round((i + 1) / paquetes * 0.78, 3),
            "settle_drift_m": round(deriva, 4),
        })

        if puesto:
            puestos += 1
        else:
            # La causa que se escribe es la que ha ocurrido de verdad. Si el guion
            # pedía otra cosa, manda la física: un episodio que dice "éxito" con
            # paquetes sin colocar es justo el dato falso que la plataforma existe
            # para no publicar.
            causa = causa if i == falla_en and causa else (
                "stack_collapse" if margen <= 0 else "overhang_violation")
            t += 0.3
            evento("fail", f"pkg_{i:02d}", {"cause": causa})
            break

    return {"placements": colocaciones, "pallet_states": estados, "events": eventos,
            "n_placed": puestos, "duration_s": round(t, 2), "failure": causa,
            "final": estados[-1] if estados else None}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--borrar-solo", action="store_true")
    args = ap.parse_args()

    c = Supabase.from_env(REPO)
    if c is None:
        print("sin credenciales de Supabase")
        return 1

    print(f"borrados {borrar(c, 'humo-live', ETIQUETA)} runs de prueba")
    if args.borrar_solo:
        return 0

    rng = random.Random(20260919)
    inicio = datetime.now(UTC) - timedelta(minutes=18)
    run_id = c.insert("runs", [{
        "task": "palletizing",
        "level": 2,
        "git_sha": "a1b2c3d",
        "oracle": False,
        "synthetic": True,
        "motion_speed": 4.0,
        "label": ETIQUETA,
        "description": "ejemplo del contrato: las 5 tablas, los 6 tipos de evento "
                       "y varias causas de fallo",
        # `config` es jsonb libre y hasta ahora no lo escribía nadie.
        "config": {"pallet_m": [1.2, 0.8], "lookahead": 3, "balance": True,
                   "transport_accel_g": 0.28},
        "n_episodes": len(GUION),
        "started_at": inicio.isoformat(),
        "ended_at": (inicio + timedelta(minutes=17)).isoformat(),
    }], returning=True)[0]["id"]

    for n, (seed, (paquetes, causa, falla_en)) in enumerate(sorted(GUION.items())):
        ep = episodio(rng, paquetes, causa, falla_en)
        arranque = inicio + timedelta(minutes=n * 2.5)
        final = ep["final"]
        eid = c.insert("episodes", [{
            "run_id": run_id, "seed": seed, "task": "palletizing", "level": 2,
            "status": "success" if ep["failure"] is None else "failure",
            "started_at": arranque.isoformat(),
            "ended_at": (arranque + timedelta(seconds=ep["duration_s"])).isoformat(),
            "duration_s": ep["duration_s"],
            "n_objects": paquetes, "n_placed": ep["n_placed"],
            "score": round(ep["n_placed"] / paquetes, 3),
            "failure": ep["failure"],
            "metrics": {
                "n_misrouted": 0,
                "score": round(ep["n_placed"] / paquetes, 3),
                "cog_offset_xy": round(math.hypot(final["cog_x"], final["cog_y"]), 4)
                if final else None,
                "fill_ratio": final["fill_ratio"] if final else 0.0,
                "settle_drift": final["settle_drift_m"] if final else 0.0,
                "n_layers": max((p["layer"] for p in ep["placements"]), default=0),
            },
        }], returning=True)[0]["id"]

        for tabla, filas in (("placements", ep["placements"]),
                             ("pallet_states", ep["pallet_states"]),
                             ("events", ep["events"])):
            if filas:
                c.insert(tabla, [{**f, "episode_id": eid} for f in filas])

        print(f"  seed {seed}  {ep['n_placed']}/{paquetes}  "
              f"{ep['failure'] or 'éxito'}  "
              f"({len(ep['events'])} ev, {len(ep['pallet_states'])} estados)")

    print(f"\nrun {run_id}  ->  /runs/{run_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
