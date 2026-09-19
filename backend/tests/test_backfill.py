"""El camino de vuelta: los `episodes.jsonl` históricos de disco a Supabase.

Lo delicado aquí es que en disco conviven DOS formatos —el de clasificación de
inducción y el de la rama de ordenación— y ninguno se puede perder: son la línea base
contra la que se mide el paletizado. Por eso todo lo que no es columna cae en `metrics`
en vez de descartarse.
"""

import json
from datetime import datetime
from pathlib import Path

from backfill import episode_rows, read_rows, run_row, started_at

INDUCCION = {"seed": 3, "task": "induction", "level": 1, "duration_s": 12.5,
             "n_objects": 6, "n_placed": 5, "n_misrouted": 1, "success": False,
             "failure": "grasp_slip", "git_sha": "abc1234", "oracle": False}

ORDENACION = {"seed": 4, "task": "induction", "level": 2, "duration_s": 30.0,
              "n_objects": 8, "n_placed": 8, "success": True, "failure": None,
              "git_sha": "abc1234", "oracle": True,
              "n_slots": 4, "mean_error_xy": 0.004, "score": 0.91,
              "goal_source": "oracle"}


def carpeta(tmp_path: Path, nombre: str, filas: list[dict]) -> Path:
    directorio = tmp_path / nombre
    directorio.mkdir()
    (directorio / "episodes.jsonl").write_text(
        "".join(json.dumps(f) + "\n" for f in filas), encoding="utf-8")
    return directorio


# ── lectura ──────────────────────────────────────────────────────────────────

def test_read_rows_salta_las_lineas_en_blanco(tmp_path):
    path = tmp_path / "episodes.jsonl"
    path.write_text('{"seed": 1}\n\n   \n{"seed": 2}\n', encoding="utf-8")
    assert [r["seed"] for r in read_rows(path)] == [1, 2]


# ── la marca de tiempo del nombre de carpeta ─────────────────────────────────

def test_started_at_interpreta_el_sello_como_hora_local(tmp_path):
    """Las carpetas se nombraron en hora local: si se leyeran como UTC, la interfaz
    las pintaría desplazadas dos horas."""
    iso = started_at(carpeta(tmp_path, "20260919-082926", [INDUCCION]))

    esperado = datetime(2026, 9, 19, 8, 29, 26).astimezone()
    assert datetime.fromisoformat(iso) == esperado


def test_started_at_acepta_el_sufijo_de_etiqueta(tmp_path):
    assert started_at(carpeta(tmp_path, "20260919-000731-l1-oracle", [INDUCCION]))


def test_started_at_de_una_carpeta_que_no_sigue_el_patron(tmp_path):
    assert started_at(carpeta(tmp_path, "pruebas-sueltas", [INDUCCION])) is None


# ── la fila de `runs` ────────────────────────────────────────────────────────

def test_run_row_toma_la_identidad_de_la_primera_fila(tmp_path):
    d = carpeta(tmp_path, "20260919-082926-l1", [INDUCCION, ORDENACION])
    fila = run_row(d, [INDUCCION, ORDENACION])

    assert fila["task"] == "induction"
    assert fila["level"] == 1
    assert fila["git_sha"] == "abc1234"
    assert fila["oracle"] is False
    assert fila["n_episodes"] == 2


def test_run_row_guarda_el_nombre_de_carpeta_como_etiqueta(tmp_path):
    """Es la trazabilidad de vuelta al disco: sin ella una fila de la interfaz no se
    puede casar con su `episodes.jsonl`."""
    d = carpeta(tmp_path, "20260919-082926-l4", [INDUCCION])
    assert run_row(d, [INDUCCION])["label"] == "20260919-082926-l4"


def test_run_row_lee_la_velocidad_del_sufijo(tmp_path):
    d = carpeta(tmp_path, "20260919-082926-l2-v4", [INDUCCION])
    assert run_row(d, [INDUCCION])["motion_speed"] == 4.0


def test_run_row_sin_sufijo_de_velocidad_asume_tiempo_real(tmp_path):
    d = carpeta(tmp_path, "20260919-082926-l2", [INDUCCION])
    assert run_row(d, [INDUCCION])["motion_speed"] == 1.0


# ── las filas de `episodes` ──────────────────────────────────────────────────

def test_lo_que_no_es_columna_cae_en_metrics():
    fila = episode_rows([ORDENACION], "run-1")[0]

    assert fila["metrics"]["n_slots"] == 4
    assert fila["metrics"]["mean_error_xy"] == 0.004
    assert fila["metrics"]["goal_source"] == "oracle"


def test_el_formato_viejo_de_induccion_tambien_se_conserva():
    fila = episode_rows([INDUCCION], "run-1")[0]
    assert fila["metrics"]["n_misrouted"] == 1


def test_las_columnas_no_se_duplican_en_metrics():
    fila = episode_rows([ORDENACION], "run-1")[0]
    for columna in ("seed", "task", "level", "duration_s", "n_objects", "n_placed",
                    "success", "failure"):
        assert columna not in fila["metrics"]


def test_git_sha_y_oracle_no_bajan_al_episodio():
    """Describen el run. Repetirlos por episodio es invitarlos a desincronizarse."""
    fila = episode_rows([ORDENACION], "run-1")[0]
    assert "git_sha" not in fila and "oracle" not in fila
    assert "git_sha" not in fila["metrics"] and "oracle" not in fila["metrics"]


def test_success_se_traduce_a_status():
    filas = episode_rows([INDUCCION, ORDENACION], "run-1")
    assert [f["status"] for f in filas] == ["failure", "success"]


def test_el_score_sube_de_metrics_a_columna():
    assert episode_rows([ORDENACION], "run-1")[0]["score"] == 0.91
    assert episode_rows([INDUCCION], "run-1")[0]["score"] is None


def test_todas_las_filas_llevan_su_run_id():
    filas = episode_rows([INDUCCION, ORDENACION], "run-42")
    assert {f["run_id"] for f in filas} == {"run-42"}


def test_la_fila_resultante_es_serializable():
    json.dumps(episode_rows([INDUCCION, ORDENACION], "run-1"))
