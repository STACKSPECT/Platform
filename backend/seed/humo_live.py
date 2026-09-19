"""Prueba de humo de la pantalla Live: monta un palé de verdad, despacio.

Usa el ciclo begin()/event()/pallet_state()/end() para que Realtime tenga algo que
repartir. Con `/` abierto en el navegador, el palé tiene que montarse paquete a paquete
y los KPIs moverse solos, sin recargar.

    python humo_live.py [--paquetes 8] [--pausa 1.5]
"""

import argparse
import math
import random
import sys
import time
from pathlib import Path

# Desde el directorio de trabajo y no desde __file__: este guion vive en el scratchpad,
# fuera del repo, así que subir por su propia ruta no llega a ninguna parte.
BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
REPO = BACKEND.parent

from seed.palletizing import BOXES, SLOTS, stability_margin, support_polygon  # noqa: E402
from theker_telemetry import EpisodeResult, RunLog  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--paquetes", type=int, default=8)
    ap.add_argument("--pausa", type=float, default=1.5,
                    help="segundos entre paquetes; sube esto para verlo mejor")
    args = ap.parse_args()

    rng = random.Random(20260919)
    log = RunLog(REPO, task="palletizing", level=2, motion_speed=1.0,
                 label="humo-live", n_episodes=1, tag="humo")
    if not log.run_id:
        print("no hay Supabase configurado: esto solo sirve contra el proyecto real")
        return 1
    print(f"run {log.run_id}  ->  /runs/{log.run_id}")

    log.begin(seed=37, n_objects=args.paquetes)
    if not log.episode_id:
        print("no se ha podido abrir el episodio")
        return 1
    print(f"episodio {log.episode_id} en curso. Abre / en el navegador.\n")

    t = 0.0
    mx = my = mz = masa = 0.0
    base: list[tuple[float, float, float, float]] = []
    colocados = 0
    fallo = None

    for i in range(args.paquetes):
        nombre, dx, dy, dz, kg = BOXES[i % len(BOXES)]
        capa = i // len(SLOTS) + 1
        sx, sy = SLOTS[i % len(SLOTS)]
        z = (capa - 1) * dz + dz / 2

        t += 0.6
        log.event(ts=round(t, 2), seq=i * 4, kind="perceive",
                  package_id=f"pkg_{i:02d}",
                  payload={"seen": args.paquetes - i, "confidence": 0.97})

        t += 0.4
        log.event(ts=round(t, 2), seq=i * 4 + 1, kind="plan",
                  package_id=f"pkg_{i:02d}",
                  payload={"layer": capa, "slot": "AB"[i % len(SLOTS)]})

        # Un poco de imprecisión, para que la traza de CoG no sea una recta.
        ex, ey = rng.gauss(0, 0.006), rng.gauss(0, 0.006)
        x, y = sx + ex, sy + ey

        masa += kg
        mx += x * kg
        my += y * kg
        mz += z * kg
        if capa == 1:
            base.append((x, y, dx, dy))

        cog = (mx / masa, my / masa, mz / masa)
        margen = stability_margin(*cog, base)
        x0, x1, y0, y1 = support_polygon(base) if base else (0.0, 0.0, 0.0, 0.0)
        overhang = max(0.0, max(x + dx / 2 - x1, x0 - (x - dx / 2)))

        t += 1.2
        log.event(ts=round(t, 2), seq=i * 4 + 2, kind="place",
                  package_id=f"pkg_{i:02d}",
                  payload={"error_xy_mm": round(math.hypot(ex, ey) * 1000, 1),
                           "error_yaw_deg": 0.4,
                           "overhang_mm": round(overhang * 1000, 1)})

        puesto = margen > 0 and overhang <= 0.02
        log.placement(seq=i, package_id=f"pkg_{i:02d}", package_type=nombre,
                      mass_kg=kg, dims_m=[dx, dy, dz], layer=capa,
                      planned_pose={"x": sx, "y": sy, "z": z, "yaw": 0.0},
                      actual_pose={"x": round(x, 4), "y": round(y, 4),
                                   "z": round(z, 4), "yaw": 0.01},
                      error_xy_m=round(math.hypot(ex, ey), 5), error_yaw_rad=0.01,
                      support_ratio=1.0, overhang_m=round(overhang, 4), placed=puesto)

        log.pallet_state(after_seq=i, mass_kg=round(masa, 3),
                         cog_x=round(cog[0], 4), cog_y=round(cog[1], 4),
                         cog_z=round(cog[2], 4),
                         stability_margin_m=round(margen, 4),
                         fill_ratio=round((i + 1) / args.paquetes * 0.7, 3),
                         settle_drift_m=round(abs(rng.gauss(0, 0.002)), 4))

        if puesto:
            colocados += 1
        print(f"  paquete {i + 1}/{args.paquetes}  capa {capa}  "
              f"margen {margen * 1000:+.0f} mm  {'ok' if puesto else 'FALLO'}")

        if not puesto:
            fallo = "stack_collapse" if margen <= 0 else "overhang_violation"
            log.event(ts=round(t, 2), seq=i * 4 + 3, kind="fail",
                      package_id=f"pkg_{i:02d}", payload={"cause": fallo})
            break

        time.sleep(args.pausa)

    log.end(EpisodeResult(
        seed=37, level=2, n_objects=args.paquetes, n_placed=colocados, n_misrouted=0,
        success=fallo is None, duration_s=round(t, 2), failure=fallo, oracle=False,
        task="palletizing",
        metrics={"score": round(colocados / args.paquetes, 3),
                 "cog_offset_xy": round(math.hypot(mx / masa, my / masa), 4)},
    ))
    log.close()

    print(f"\nepisodio cerrado: {colocados}/{args.paquetes} colocados, "
          f"fallo={fallo or 'ninguno'}")
    print(f"jsonl en {log.path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
