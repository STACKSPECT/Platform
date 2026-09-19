"""
SDK de telemetría de la plataforma de observabilidad.

Lo importa quien **produce** episodios —hoy la simulación de inducción, mañana la de
paletizado— para que el dato llegue a Supabase con la forma que la interfaz espera.

    from theker_telemetry import EpisodeResult, RunLog

    log = RunLog(REPO, task="palletizing", level=2, remote=True)
    log.episode(result, placements=[...], pallet_states=[...], events=[...])
    log.close()

Regla de oro, y el motivo de que `RunLog` envuelva a `RunWriter` en vez de sustituirlo:
el `episodes.jsonl` en disco es la fuente de verdad y Supabase una réplica. Un fallo de
red avisa una vez y el episodio sigue.
"""

from .core import RunLog, Supabase, episode_row, load_env
from .pallet import (
    TRANSPORT_ACCEL_G,
    corners,
    stability_margin,
    support_hull,
    support_polygon,
)
from .schema import FAILURES, TASKS, EpisodeResult, RunWriter, git_sha

__all__ = [
    "EpisodeResult", "RunWriter", "RunLog", "Supabase",
    "FAILURES", "TASKS", "git_sha", "episode_row", "load_env",
    "TRANSPORT_ACCEL_G", "corners", "stability_margin", "support_hull", "support_polygon",
]
