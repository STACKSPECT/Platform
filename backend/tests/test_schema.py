"""`EpisodeResult` y `RunWriter`: el vocabulario cerrado y el fichero en disco.

El `episodes.jsonl` es la fuente de verdad (AGENTS.md §4), así que lo que se comprueba
aquí es que se escribe siempre y que se sigue leyendo aunque el formato haya cambiado
por el camino.
"""

import json

import pytest

from theker_telemetry.schema import FAILURES, TASKS, EpisodeResult, RunWriter


def episodio(**cambios) -> EpisodeResult:
    """Un episodio de paletizado válido, para retocarle un campo por test."""
    base = dict(
        seed=7, level=2, n_objects=10, n_placed=7, n_misrouted=0, success=False,
        duration_s=42.0, failure="stack_collapse", oracle=False, task="palletizing",
    )
    return EpisodeResult(**{**base, **cambios})


# ── vocabulario cerrado ──────────────────────────────────────────────────────

def test_rechaza_una_causa_de_fallo_inventada():
    with pytest.raises(ValueError, match="fuera del vocabulario"):
        episodio(failure="se_puso_triste")


def test_rechaza_una_tarea_desconocida():
    with pytest.raises(ValueError, match="tarea desconocida"):
        episodio(task="soldadura")


def test_acepta_las_causas_vivas_y_la_ausencia_de_fallo():
    assert episodio(failure=None, success=True).failure is None
    for causa in FAILURES:
        assert episodio(failure=causa).failure == causa


def test_acepta_las_tareas_declaradas():
    for tarea in TASKS:
        assert episodio(task=tarea).task == tarea


# ── frontera de serialización ────────────────────────────────────────────────

def test_los_escalares_se_normalizan_al_construir():
    """Los tipos de numpy que llegan del simulador no son JSON: mueren aquí."""
    r = episodio(seed=7.0, level=2.0, n_placed=7.0, duration_s=42)

    assert isinstance(r.seed, int) and r.seed == 7
    assert isinstance(r.level, int)
    assert isinstance(r.n_placed, int)
    assert isinstance(r.duration_s, float)
    assert isinstance(r.oracle, bool)


def test_success_entero_se_vuelve_booleano_de_verdad():
    assert episodio(success=1).success is True
    assert episodio(success=0).success is False


# ── el fichero en disco ──────────────────────────────────────────────────────

def test_write_deja_una_linea_json_por_episodio(tmp_path):
    writer = RunWriter(tmp_path)
    writer.write(episodio(seed=1))
    writer.write(episodio(seed=2, failure=None, success=True))

    lineas = writer.path.read_text(encoding="utf-8").splitlines()
    assert len(lineas) == 2
    assert [json.loads(x)["seed"] for x in lineas] == [1, 2]


def test_write_rellena_el_sha_si_viene_vacio(tmp_path):
    writer = RunWriter(tmp_path)
    writer.sha = "abc1234"
    writer.write(episodio())
    writer.write(episodio(seed=8, git_sha="otro999"))

    shas = [json.loads(x)["git_sha"]
            for x in writer.path.read_text(encoding="utf-8").splitlines()]
    assert shas == ["abc1234", "otro999"]


def test_summary_sin_fichero(tmp_path):
    assert RunWriter(tmp_path).summary() == {"episodes": 0}


def test_summary_cuenta_y_ordena_las_causas(tmp_path):
    writer = RunWriter(tmp_path)
    writer.write(episodio(seed=1, failure=None, success=True, n_placed=10))
    writer.write(episodio(seed=2, failure="stack_collapse", n_placed=4))
    writer.write(episodio(seed=3, failure="stack_collapse", n_placed=5))
    writer.write(episodio(seed=4, failure="grasp_slip", n_placed=6))

    s = writer.summary()
    assert s["episodes"] == 4
    assert s["success_rate"] == 0.25
    assert s["objects_placed"] == 25
    assert s["objects_total"] == 40
    assert s["placement_rate"] == 0.625
    # Ordenado de más frecuente a menos: es lo que acaba en la diapositiva.
    assert list(s["failures"].items()) == [("stack_collapse", 2), ("grasp_slip", 1)]


def test_summary_tolera_el_formato_viejo_sin_n_misrouted(tmp_path):
    """Hay episodios en disco escritos antes de que existiera `n_misrouted`. Leerlos no
    puede reventar, o el histórico deja de ser cargable."""
    writer = RunWriter(tmp_path)
    viejo = {"seed": 1, "level": 1, "n_objects": 5, "n_placed": 5, "success": True,
             "duration_s": 10.0, "failure": None, "oracle": False, "git_sha": "old1234"}
    writer.path.write_text(json.dumps(viejo) + "\n", encoding="utf-8")

    s = writer.summary()
    assert s["episodes"] == 1
    assert s["misrouted"] == 0
