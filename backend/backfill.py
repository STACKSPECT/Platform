#!/usr/bin/env python
"""
Sube a Supabase los `runs/` que ya están en disco.

    python backend/backfill.py --runs-dir ../theker-induction/simulation/runs --dry-run
    python backend/backfill.py --runs-dir ../theker-induction/simulation/runs

Existe para que la interfaz nazca con datos reales dentro y no vacía: la curva de
mejora que le enseñamos al jurado empieza antes de que existiera la telemetría.

Tolera los dos formatos de `episodes.jsonl` que conviven en disco: el de clasificación
(con `n_misrouted`) y el de la rama de ordenación (con `n_slots`, `mean_error_xy`,
`score`, `goal_source`). Las columnas conocidas se extraen; todo lo demás cae en
`metrics`, que para eso es `jsonb`. Perder una métrica vieja por no reconocerla sería
justo lo contrario de lo que hace este script.
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
REPO = BACKEND.parent
# Los `runs/` los produce la simulación, que vive en OTRO repositorio. Por eso no hay
# una ruta por defecto que adivinarla: se pasa --runs-dir y se acabó.

from theker_telemetry.core import Supabase, _json_safe  # noqa: E402

# Nombre de carpeta: 20260919-082926-l4, 20260919-000731-l1-oracle, ...-l2-v4
STAMP = re.compile(r"^(\d{8}-\d{6})(?:-(.*))?$")
SPEED = re.compile(r"-v([\d.]+)")

# Columnas propias de `episodes`. Cualquier otra clave de la línea JSON va a metrics.
COLUMNS = {"seed", "task", "level", "duration_s", "n_objects", "n_placed",
           "success", "failure"}
# Estas describen el RUN, no el episodio: se leen para construir la fila de `runs`
# y no se repiten en cada episodio.
RUN_LEVEL = {"git_sha", "oracle"}


def read_rows(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()
            if line.strip()]


def started_at(directory: Path) -> str | None:
    """La marca de tiempo del nombre de la carpeta, en UTC."""
    match = STAMP.match(directory.name)
    if not match:
        return None
    stamp = datetime.strptime(match.group(1), "%Y%m%d-%H%M%S")
    # Las carpetas se nombraron en hora local: se marcan como tal antes de pasar a
    # UTC, o la interfaz las pinta desplazadas dos horas.
    return stamp.astimezone().astimezone(timezone.utc).isoformat()


def run_row(directory: Path, rows: list[dict]) -> dict:
    first = rows[0]
    match = SPEED.search(directory.name)
    return {
        "task": first.get("task", "induction"),
        "level": int(first.get("level", 0)),
        "git_sha": first.get("git_sha", "") or "",
        "oracle": bool(first.get("oracle", False)),
        "motion_speed": float(match.group(1)) if match else 1.0,
        # El nombre de la carpeta es la trazabilidad de vuelta al disco: sin él una
        # fila de la interfaz no se puede casar con su `episodes.jsonl`.
        "label": directory.name,
        "n_episodes": len(rows),
        "started_at": started_at(directory),
    }


def episode_rows(rows: list[dict], run_id: str) -> list[dict]:
    out = []
    for row in rows:
        metrics = {k: v for k, v in row.items()
                   if k not in COLUMNS and k not in RUN_LEVEL}
        out.append({
            "run_id": run_id,
            "seed": int(row["seed"]),
            "task": row.get("task", "induction"),
            "level": int(row["level"]),
            "status": "success" if row.get("success") else "failure",
            "duration_s": row.get("duration_s"),
            "n_objects": int(row.get("n_objects", 0)),
            "n_placed": int(row.get("n_placed", 0)),
            "score": metrics.get("score"),
            "failure": row.get("failure"),
            "metrics": _json_safe(metrics),
        })
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true",
                        help="enumera lo que subiría y sale")
    parser.add_argument("--runs-dir", type=Path, required=True,
                        help="carpeta runs/ de la simulación, en su propio repo")
    args = parser.parse_args()

    if not args.runs_dir.exists():
        print(f"no existe {args.runs_dir}")
        return 0
    directories = sorted(d for d in args.runs_dir.iterdir()
                         if d.is_dir() and (d / "episodes.jsonl").exists())
    if not directories:
        print(f"no hay nada que subir en {args.runs_dir}")
        return 0

    client = None if args.dry_run else Supabase.from_env(REPO)
    if client is None and not args.dry_run:
        print("falta SUPABASE_URL o SUPABASE_SERVICE_KEY (mira .env)")
        return 1

    # `label` guarda el nombre de la carpeta, así que sirve de clave para no duplicar.
    # Relanzar esto tras un fallo a mitad tiene que ser seguro: si no, la primera vez
    # que algo peta te quedas con la mitad del histórico por duplicado.
    already = set()
    if client is not None:
        already = {row["label"] for row in client.get("runs", select="label")
                   if row.get("label")}

    total = skipped = 0
    for directory in directories:
        if directory.name in already:
            skipped += 1
            continue
        rows = read_rows(directory / "episodes.jsonl")
        if not rows:
            print(f"  -- {directory.name}: vacío, se salta")
            continue
        meta = run_row(directory, rows)
        total += len(rows)

        if args.dry_run:
            print(f"  {directory.name:<34} {meta['task']:<12} n{meta['level']} "
                  f"x{meta['motion_speed']:g} {len(rows):>3} ep"
                  f"{'  [oracle]' if meta['oracle'] else ''}")
            continue

        created = client.insert("runs", [meta], returning=True)
        client.insert("episodes", episode_rows(rows, created[0]["id"]))
        print(f"  ok {directory.name:<34} {len(rows):>3} ep")

    verb = "se subirían" if args.dry_run else "subidos"
    note = f", {skipped} ya estaban" if skipped else ""
    print(f"{len(directories) - skipped} runs, {total} episodios {verb}{note}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
