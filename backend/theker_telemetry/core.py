"""
Telemetría de ejecuciones: disco siempre, Supabase si está configurado.

El `jsonl` de `runs/` es la FUENTE DE VERDAD y Supabase una réplica consultable. El
orden importa: si la red falla a las tres de la mañana el benchmark no puede caerse
por eso, y la demo ante el jurado no puede depender de que haya wifi en la sala. Por
eso todo fallo remoto se avisa una vez, se apaga la subida y el episodio sigue.

Sin dependencias nuevas: PostgREST se habla con `urllib` de la stdlib.

    export SUPABASE_URL=https://xxxx.supabase.co
    export SUPABASE_SERVICE_KEY=eyJ...      # o en .env, que ya está gitignorado
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import asdict
from pathlib import Path
from typing import Any, Iterable, Sequence

from .schema import EpisodeResult, RunWriter, git_sha

# La subida no puede volverse el cuello de botella del benchmark: si Supabase tarda
# más que esto, el episodio siguiente importa más que el registro del anterior.
TIMEOUT_S = 6.0


# ─────────────────────────────────────────────────────────────────────────────
# Configuración
# ─────────────────────────────────────────────────────────────────────────────

def load_env(repo: Path) -> None:
    """Carga el primer `.env` que aparezca en el repo o en su carpeta padre.

    Se mira también arriba porque las credenciales son del hackathon, no de este
    repo: viven en `HackSpain/.env` y las comparten los dos proyectos. Y un fichero
    de secretos fuera del árbol versionado no puede colarse en un commit por
    despiste.

    Lo ya definido en el entorno gana, para que un `export` puntual apunte a otro
    proyecto sin editar nada."""
    for path in (repo / ".env", repo.parent / ".env"):
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip("'\""))
        return


def _json_safe(value: Any) -> Any:
    """Frontera de serialización, como la de `EpisodeResult`, pero para `metrics` y
    los payloads de eventos, que son dicts libres y traen numpy sin avisar.

    Un `np.float32` anidado no lo detecta nadie hasta que `json.dumps` revienta en
    mitad de un benchmark de cincuenta episodios."""
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, (bool, int, float, str)) or value is None:
        return value
    # Escalares y arrays de numpy, sin importar numpy aquí: `.item()` y `.tolist()`
    # son el protocolo, y así este módulo sigue siendo importable sin numpy.
    if hasattr(value, "item") and getattr(value, "ndim", None) == 0:
        return value.item()
    if hasattr(value, "tolist"):
        return _json_safe(value.tolist())
    return str(value)


# ─────────────────────────────────────────────────────────────────────────────
# Cliente PostgREST
# ─────────────────────────────────────────────────────────────────────────────

class Supabase:
    """Lo mínimo de PostgREST que necesitamos: insertar filas y leerlas de vuelta."""

    def __init__(self, url: str, key: str, timeout: float = TIMEOUT_S):
        self.base = url.rstrip("/") + "/rest/v1"
        self.key = key
        self.timeout = timeout

    @classmethod
    def from_env(cls, repo: Path) -> Supabase | None:
        """El cliente, o None si no está configurado. Que falte configuración no es un
        error: correr sin Supabase es el modo por defecto."""
        load_env(repo)
        url = os.environ.get("SUPABASE_URL", "").strip()
        # La clave de servicio se salta RLS y por eso es la única que puede escribir.
        # La `anon` nunca va aquí: es de lectura y vive en el frontend.
        key = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
        if not url or not key:
            return None
        return cls(url, key)

    def _headers(self, prefer: str) -> dict[str, str]:
        return {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": prefer,
        }

    def _send(self, request: urllib.request.Request, what: str) -> bytes:
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                return response.read()
        except urllib.error.HTTPError as err:
            # PostgREST dice en el cuerpo qué CHECK o qué columna ha fallado. Sin
            # leerlo, un 400 por esquema y un 401 por clave son indistinguibles.
            detail = err.read().decode("utf-8", "replace")[:400]
            raise RuntimeError(f"{what}: HTTP {err.code} {detail}") from err
        except (urllib.error.URLError, OSError) as err:
            raise RuntimeError(f"{what}: {err}") from err

    def get(self, table: str, *, select: str = "*", limit: int = 10000,
            **filters: str) -> list[dict]:
        """SELECT. Los filtros son de igualdad: `get("runs", task="induction")`."""
        query = [f"select={select}", f"limit={limit}"]
        query += [f"{k}=eq.{v}" for k, v in filters.items()]
        request = urllib.request.Request(
            f"{self.base}/{table}?" + "&".join(query),
            headers=self._headers("count=none"),
        )
        payload = self._send(request, table)
        return json.loads(payload) if payload else []

    def insert(self, table: str, rows: Sequence[dict], *,
               returning: bool = False) -> list[dict]:
        """Inserta y devuelve las filas creadas si `returning`. Lanza si falla: quien
        llama decide si eso tumba el episodio (no lo hace) o solo la subida."""
        if not rows:
            return []
        request = urllib.request.Request(
            f"{self.base}/{table}",
            data=json.dumps(_json_safe(list(rows))).encode("utf-8"),
            method="POST",
            headers=self._headers(
                "return=representation" if returning else "return=minimal"),
        )
        payload = self._send(request, table)
        return json.loads(payload) if returning and payload else []

    def patch(self, table: str, match: dict, data: dict) -> None:
        """UPDATE con filtro de igualdad. Se usa para cerrar el run al terminar."""
        query = "&".join(f"{k}=eq.{v}" for k, v in match.items())
        request = urllib.request.Request(
            f"{self.base}/{table}?{query}",
            data=json.dumps(_json_safe(data)).encode("utf-8"),
            method="PATCH",
            headers=self._headers("return=minimal"),
        )
        self._send(request, table)


# ─────────────────────────────────────────────────────────────────────────────
# Conversión a filas
# ─────────────────────────────────────────────────────────────────────────────

def episode_row(result: EpisodeResult, run_id: str) -> dict:
    """`EpisodeResult` -> fila de `episodes`.

    Lo común a toda tarea va a columnas; lo demás, a `metrics`. `n_misrouted` es el
    ejemplo: solo significa algo en los niveles de clasificación de inducción, así que
    no merece una columna que estaría vacía en todo el paletizado.

    `git_sha` y `oracle` no se copian: viven en `runs`, y repetirlos por episodio es
    invitarlos a desincronizarse. Las vistas los recuperan por el join."""
    row = asdict(result)
    metrics = dict(row.get("metrics") or {})
    metrics.setdefault("n_misrouted", row["n_misrouted"])
    return {
        "run_id": run_id,
        "seed": row["seed"],
        "task": row["task"],
        "level": row["level"],
        "status": "success" if row["success"] else "failure",
        "duration_s": row["duration_s"],
        "n_objects": row["n_objects"],
        "n_placed": row["n_placed"],
        "score": metrics.get("score"),
        "failure": row["failure"],
        "metrics": _json_safe(metrics),
    }


# ─────────────────────────────────────────────────────────────────────────────
# El objeto que usa el benchmark
# ─────────────────────────────────────────────────────────────────────────────

class RunLog:
    """Una ejecución: escribe `runs/<timestamp>/episodes.jsonl` y, si hay Supabase
    configurado, replica cada episodio según termina.

    Sustituye a `RunWriter` en `scripts/benchmark.py` pero no lo reemplaza: lo
    envuelve, y el formato en disco no cambia ni una coma."""

    def __init__(self, repo: Path, *, task: str = "induction", level: int = 0,
                 oracle: bool = False, motion_speed: float = 1.0,
                 tag: str | None = None, label: str | None = None,
                 n_episodes: int = 0, remote: bool = True):
        self.writer = RunWriter(repo, tag=tag)
        self.directory = self.writer.directory
        self.path = self.writer.path

        self.client = Supabase.from_env(repo) if remote else None
        self.run_id: str | None = None
        self._warned = False

        if self.client is None:
            return
        rows = self._try("runs", lambda: self.client.insert("runs", [{
            "task": task,
            "level": int(level),
            "git_sha": git_sha(repo),
            "oracle": bool(oracle),
            "motion_speed": float(motion_speed),
            "label": label,
            "n_episodes": int(n_episodes),
        }], returning=True))
        if rows:
            self.run_id = rows[0]["id"]

    # ── uso normal ───────────────────────────────────────────────────────────

    def episode(self, result: EpisodeResult, *,
                placements: Iterable[dict] = (),
                pallet_states: Iterable[dict] = (),
                events: Iterable[dict] = ()) -> None:
        """Registra un episodio terminado. El disco primero, siempre."""
        self.writer.write(result)
        if not self.run_id:
            return

        rows = self._try("episodes", lambda: self.client.insert(
            "episodes", [episode_row(result, self.run_id)], returning=True))
        if not rows:
            return
        episode_id = rows[0]["id"]

        for table, items in (("placements", placements),
                             ("pallet_states", pallet_states),
                             ("events", events)):
            batch = [{**item, "episode_id": episode_id} for item in items]
            if batch:
                self._try(table, lambda t=table, b=batch: self.client.insert(t, b))

    def close(self) -> None:
        """Cierra el run. Sin esto `ended_at` queda a null y la interfaz no distingue
        un run terminado de uno que reventó a la mitad."""
        if not self.run_id:
            return
        self._try("runs", lambda: self.client.patch(
            "runs", {"id": self.run_id}, {"ended_at": "now()"}))

    def summary(self) -> dict:
        return self.writer.summary()

    @property
    def path_in_ui(self) -> str | None:
        """Ruta del run dentro de la interfaz, para imprimirla al acabar."""
        return f"/runs/{self.run_id}" if self.run_id else None

    # ── resiliencia ──────────────────────────────────────────────────────────

    def _try(self, what: str, call) -> Any:
        """Ejecuta una subida. Al primer fallo avisa y apaga el remoto para el resto de
        la ejecución: cincuenta episodios serían cincuenta timeouts, y basta con
        enterarse una vez de que no se está guardando."""
        if self.client is None:
            return None
        try:
            return call()
        except RuntimeError as err:
            if not self._warned:
                print(f"  aviso: Supabase no responde ({err}). "
                      f"Se sigue escribiendo en {self.path}")
                self._warned = True
            self.client = None
            self.run_id = None
            return None


def demo() -> None:
    """Comprobación sin red: un episodio de paletizado se convierte en una fila que el
    esquema acepta, y los escalares de numpy mueren antes de salir."""
    result = EpisodeResult(
        seed=7, level=2, n_objects=10, n_placed=7, n_misrouted=0, success=False,
        duration_s=42.0, failure="stack_collapse", oracle=False, git_sha="abc1234",
        task="palletizing", metrics={"cog_offset_xy": 0.031, "score": 0.7},
    )
    row = episode_row(result, "11111111-1111-1111-1111-111111111111")
    assert json.loads(json.dumps(row))["status"] == "failure"
    assert row["failure"] == "stack_collapse"
    assert row["metrics"] == {"cog_offset_xy": 0.031, "score": 0.7, "n_misrouted": 0}
    assert row["score"] == 0.7
    assert "git_sha" not in row and "oracle" not in row
    print("ok  telemetry.demo")


if __name__ == "__main__":
    demo()
