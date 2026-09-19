"""
Esquema de métricas y escritura. Una línea JSON por episodio (AGENTS.md §5).

Vive en la plataforma y no en la simulación porque es el **contrato de lo que se
guarda**, y quien define la forma del dato es quien lo almacena. La simulación produce
`EpisodeResult`; cuando se reescriba para paletizado seguirá produciéndolo igual.

Sin log no hay mejora demostrable: el listón del reto es la curva de `episodes.jsonl`
entre commits, así que todo episodio escribe, también los que fallan.
"""

from __future__ import annotations

import json
import subprocess
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path

# No hay REPO por defecto, a propósito: este paquete ya no vive dentro del árbol de la
# simulación, así que deducir la raíz desde `__file__` daría una ruta equivocada en
# silencio. Quien llama sabe cuál es su repo y lo pasa.

# Vocabulario cerrado de causas de fallo. Si aparece una nueva, se añade aquí, en
# AGENTS.md §5 y en el CHECK de platform/backend/sql: un fallo sin nombre es un fallo
# que nadie arregla, y uno que no pase el CHECK tumba la subida del episodio.
FAILURES = frozenset(
    {"no_detection", "ik_unreachable", "collision", "grasp_slip",
     "wrong_placement", "timeout",
     # Propios de paletizado.
     "stack_collapse",        # el montón se derrumba
     "overhang_violation"}    # depositado fuera del palé
)

# Tareas que el repo sabe medir. La tarea es un campo, no una rama del código: así la
# línea base de inducción sigue siendo comparable cuando entre el paletizado.
TASKS = frozenset({"induction", "palletizing"})


@dataclass
class EpisodeResult:
    """Lo que se sabe de un episodio cuando termina."""

    seed: int
    level: int
    n_objects: int
    n_placed: int
    # Bultos que acabaron DENTRO de una caja, pero de la equivocada. Solo tiene sentido
    # en los niveles de clasificación, y es el único número que separa "clasificó mal"
    # de "se le cayó": con n_placed a secas los dos fallos se ven iguales.
    n_misrouted: int
    success: bool
    duration_s: float
    failure: str | None
    oracle: bool
    git_sha: str = ""
    # Campos nuevos AL FINAL y con default: hay llamadas posicionales vivas y
    # ficheros `episodes.jsonl` ya escritos sin ellos.
    task: str = "induction"
    # Métricas propias de la tarea, que no merecen una columna cada una: en
    # inducción, nada; en paletizado, cog_offset_xy, fill_ratio, settle_drift...
    metrics: dict = field(default_factory=dict)

    def __post_init__(self) -> None:
        # Frontera de serialización: los escalares de numpy que se cuelan desde el
        # simulador no son JSON. Se convierten aquí, una vez, y no en cada llamada.
        self.seed = int(self.seed)
        self.level = int(self.level)
        self.n_objects = int(self.n_objects)
        self.n_placed = int(self.n_placed)
        self.n_misrouted = int(self.n_misrouted)
        self.success = bool(self.success)
        self.duration_s = float(self.duration_s)
        self.oracle = bool(self.oracle)

        if self.failure is not None and self.failure not in FAILURES:
            raise ValueError(
                f"causa de fallo fuera del vocabulario: {self.failure!r}. "
                f"Añádela a FAILURES y a AGENTS.md §5 antes de usarla."
            )
        if self.task not in TASKS:
            raise ValueError(
                f"tarea desconocida: {self.task!r}. Añádela a TASKS y al CHECK de "
                f"platform/backend/sql antes de usarla."
            )


def git_sha(repo: Path) -> str:
    """SHA corto, o cadena vacía si esto no es un repo git todavía."""
    try:
        out = subprocess.run(
            ["git", "-C", str(repo), "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=5,
        )
        return out.stdout.strip() if out.returncode == 0 else ""
    except (OSError, subprocess.SubprocessError):
        return ""


class RunWriter:
    """Una carpeta por ejecución: `runs/<timestamp>/episodes.jsonl`."""

    def __init__(self, repo: Path, tag: str | None = None):
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        self.directory = repo / "runs" / (f"{stamp}-{tag}" if tag else stamp)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.path = self.directory / "episodes.jsonl"
        self.sha = git_sha(repo)

    def write(self, result: EpisodeResult) -> None:
        result.git_sha = result.git_sha or self.sha
        with open(self.path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(asdict(result)) + "\n")

    def summary(self) -> dict:
        """Resumen de la ejecución, que es lo que acaba en la diapositiva."""
        if not self.path.exists():
            return {"episodes": 0}
        rows = [
            json.loads(line)
            for line in self.path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        if not rows:
            return {"episodes": 0}
        placed = sum(r["n_placed"] for r in rows)
        total = sum(r["n_objects"] for r in rows)
        misrouted = sum(r.get("n_misrouted", 0) for r in rows)
        causes: dict[str, int] = {}
        for r in rows:
            if r["failure"]:
                causes[r["failure"]] = causes.get(r["failure"], 0) + 1
        return {
            "episodes": len(rows),
            "success_rate": sum(r["success"] for r in rows) / len(rows),
            "objects_placed": placed,
            "objects_total": total,
            "placement_rate": placed / total if total else 0.0,
            "misrouted": misrouted,
            "misroute_rate": misrouted / total if total else 0.0,
            "mean_duration_s": sum(r["duration_s"] for r in rows) / len(rows),
            "failures": dict(sorted(causes.items(), key=lambda kv: -kv[1])),
        }
