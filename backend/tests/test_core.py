"""El SDK contra Supabase, sin tocar la red.

Lo que de verdad se protege aquí es la promesa dura de AGENTS.md §4: el disco manda.
Un fallo de red avisa UNA vez y el episodio sigue. Si esto se rompe, un benchmark de
cincuenta episodios se cae por el wifi de la sala y no queda ni el jsonl.
"""

import io
import json
import urllib.error
import urllib.request

import pytest

from theker_telemetry import core
from theker_telemetry.core import RunLog, Supabase, _json_safe, episode_row, load_env
from theker_telemetry.schema import EpisodeResult


def episodio(**cambios) -> EpisodeResult:
    base = dict(
        seed=7, level=2, n_objects=10, n_placed=7, n_misrouted=0, success=False,
        duration_s=42.0, failure="stack_collapse", oracle=False, git_sha="abc1234",
        task="palletizing", metrics={"cog_offset_xy": 0.031, "score": 0.7},
    )
    return EpisodeResult(**{**base, **cambios})


class ClienteFalso:
    """Un Supabase de mentira que apunta lo que le piden y falla cuando se le dice."""

    def __init__(self, falla_en=()):
        self.llamadas = []
        self.falla_en = set(falla_en)
        self._n = 0

    def insert(self, table, rows, *, returning=False):
        self.llamadas.append(("insert", table, [dict(r) for r in rows]))
        if table in self.falla_en:
            raise RuntimeError(f"{table}: HTTP 503 se cayó")
        if not returning:
            return []
        self._n += 1
        return [{"id": f"{table}-{self._n}"}]

    def patch(self, table, match, data):
        self.llamadas.append(("patch", table, dict(match), dict(data)))
        if table in self.falla_en:
            raise RuntimeError(f"{table}: HTTP 503 se cayó")

    def tablas(self, verbo="insert"):
        return [c[1] for c in self.llamadas if c[0] == verbo]


def log_conectado(tmp_path, cliente) -> RunLog:
    """Un RunLog con el remoto ya abierto, sin pasar por `Supabase.from_env`."""
    log = RunLog(tmp_path, task="palletizing", level=2, remote=False)
    log.client = cliente
    log.run_id = "run-1"
    return log


# ── episode_row: lo que era demo(), como test ────────────────────────────────

def test_episode_row_traduce_el_episodio_a_fila():
    row = episode_row(episodio(), "11111111-1111-1111-1111-111111111111")

    assert json.loads(json.dumps(row))["status"] == "failure"
    assert row["failure"] == "stack_collapse"
    assert row["score"] == 0.7
    assert row["metrics"] == {"cog_offset_xy": 0.031, "score": 0.7, "n_misrouted": 0}


def test_episode_row_no_repite_git_sha_ni_oracle():
    """Viven en `runs`; repetirlos por episodio es invitarlos a desincronizarse, y las
    vistas ya los recuperan por el join (API.md §3)."""
    row = episode_row(episodio(), "run-1")
    assert "git_sha" not in row
    assert "oracle" not in row


def test_episode_row_marca_exito():
    assert episode_row(episodio(success=True, failure=None), "r")["status"] == "success"


def test_episode_row_no_pisa_un_n_misrouted_explicito():
    row = episode_row(episodio(n_misrouted=3, metrics={"n_misrouted": 9}), "r")
    assert row["metrics"]["n_misrouted"] == 9


def test_demo_sigue_funcionando_sin_red(capsys):
    """Se ejecuta desde el repo de la simulación sin pytest instalado."""
    core.demo()
    assert "ok" in capsys.readouterr().out


# ── _json_safe: numpy sin importar numpy ─────────────────────────────────────

class EscalarFalso:
    """Se comporta como un `np.float32`: tiene `.item()` y `ndim == 0`."""
    ndim = 0

    def __init__(self, valor):
        self._valor = valor

    def item(self):
        return self._valor


class ArrayFalso:
    """Se comporta como un `np.ndarray`: tiene `.tolist()`."""

    def __init__(self, valor):
        self._valor = valor

    def tolist(self):
        return self._valor


def test_json_safe_desactiva_escalares_y_arrays():
    crudo = {"a": EscalarFalso(0.5), "b": ArrayFalso([EscalarFalso(1), 2])}
    assert _json_safe(crudo) == {"a": 0.5, "b": [1, 2]}


def test_json_safe_recorre_estructuras_anidadas():
    crudo = {"x": [{"y": (EscalarFalso(3),)}]}
    assert _json_safe(crudo) == {"x": [{"y": [3]}]}


def test_json_safe_deja_pasar_lo_que_ya_es_json():
    crudo = {"i": 1, "f": 1.5, "s": "t", "b": True, "n": None}
    assert _json_safe(crudo) == crudo


def test_json_safe_convierte_a_texto_lo_que_no_sabe_serializar():
    class Raro:
        def __repr__(self):
            return "<raro>"

    assert _json_safe({"k": Raro()}) == {"k": "<raro>"}


def test_json_safe_produce_algo_que_json_dumps_acepta():
    json.dumps(_json_safe({"a": EscalarFalso(0.5), "b": ArrayFalso([1.0])}))


# ── load_env ─────────────────────────────────────────────────────────────────

def test_load_env_lee_el_env_del_repo(tmp_path, monkeypatch):
    monkeypatch.setattr(core.os, "environ", {})
    (tmp_path / ".env").write_text("SUPABASE_URL=https://a.supabase.co\n")

    load_env(tmp_path)
    assert core.os.environ["SUPABASE_URL"] == "https://a.supabase.co"


def test_load_env_mira_la_carpeta_padre(tmp_path, monkeypatch):
    """Las credenciales son del hackathon y se comparten entre los dos repos."""
    monkeypatch.setattr(core.os, "environ", {})
    repo = tmp_path / "platform"
    repo.mkdir()
    (tmp_path / ".env").write_text("SUPABASE_URL=https://padre.supabase.co\n")

    load_env(repo)
    assert core.os.environ["SUPABASE_URL"] == "https://padre.supabase.co"


def test_el_env_del_repo_gana_al_del_padre(tmp_path, monkeypatch):
    monkeypatch.setattr(core.os, "environ", {})
    repo = tmp_path / "platform"
    repo.mkdir()
    (repo / ".env").write_text("SUPABASE_URL=https://propio.supabase.co\n")
    (tmp_path / ".env").write_text("SUPABASE_URL=https://padre.supabase.co\n")

    load_env(repo)
    assert core.os.environ["SUPABASE_URL"] == "https://propio.supabase.co"


def test_lo_ya_exportado_gana_al_fichero(tmp_path, monkeypatch):
    """Para que un `export` puntual apunte a otro proyecto sin editar nada."""
    monkeypatch.setattr(core.os, "environ", {"SUPABASE_URL": "https://mandado"})
    (tmp_path / ".env").write_text("SUPABASE_URL=https://fichero\n")

    load_env(tmp_path)
    assert core.os.environ["SUPABASE_URL"] == "https://mandado"


def test_load_env_ignora_comentarios_y_basura(tmp_path, monkeypatch):
    monkeypatch.setattr(core.os, "environ", {})
    (tmp_path / ".env").write_text(
        "\n# un comentario\nsin_igual\n  SUPABASE_URL = 'https://a.co'  \n")

    load_env(tmp_path)
    assert core.os.environ == {"SUPABASE_URL": "https://a.co"}


def test_from_env_sin_credenciales_no_es_un_error(tmp_path, monkeypatch):
    """Correr sin Supabase es el modo por defecto."""
    monkeypatch.setattr(core.os, "environ", {})
    assert Supabase.from_env(tmp_path) is None


def test_from_env_exige_las_dos_variables(tmp_path, monkeypatch):
    monkeypatch.setattr(core.os, "environ", {"SUPABASE_URL": "https://a.co"})
    assert Supabase.from_env(tmp_path) is None


# ── Supabase._send: traducir los errores de PostgREST ────────────────────────

def test_send_mete_el_cuerpo_de_postgrest_en_el_error(monkeypatch):
    """Sin leer el cuerpo, un 400 por esquema y un 401 por clave son indistinguibles."""
    cuerpo = b'{"code":"23514","message":"viola el CHECK de failure"}'

    def urlopen_falso(request, timeout=None):
        raise urllib.error.HTTPError(
            "http://x", 400, "Bad Request", {}, io.BytesIO(cuerpo))

    monkeypatch.setattr(urllib.request, "urlopen", urlopen_falso)
    cliente = Supabase("https://x.supabase.co", "clave")

    with pytest.raises(RuntimeError, match="HTTP 400") as err:
        cliente.insert("episodes", [{"seed": 1}])
    assert "23514" in str(err.value)


def test_send_traduce_un_corte_de_red(monkeypatch):
    def urlopen_falso(request, timeout=None):
        raise urllib.error.URLError("sin ruta al host")

    monkeypatch.setattr(urllib.request, "urlopen", urlopen_falso)
    cliente = Supabase("https://x.supabase.co", "clave")

    with pytest.raises(RuntimeError, match="sin ruta al host"):
        cliente.get("runs")


def test_insert_vacio_no_llama_a_la_red(monkeypatch):
    def urlopen_falso(request, timeout=None):
        raise AssertionError("no debería haber salido a la red")

    monkeypatch.setattr(urllib.request, "urlopen", urlopen_falso)
    assert Supabase("https://x.supabase.co", "clave").insert("events", []) == []


# ── RunLog: el disco manda ───────────────────────────────────────────────────

def test_el_episodio_se_escribe_en_disco_aunque_la_subida_falle(tmp_path):
    log = log_conectado(tmp_path, ClienteFalso(falla_en={"episodes"}))

    log.episode(episodio())          # no propaga

    lineas = log.path.read_text(encoding="utf-8").splitlines()
    assert len(lineas) == 1
    assert json.loads(lineas[0])["seed"] == 7


def test_tras_un_fallo_se_apaga_el_remoto_y_se_sigue_escribiendo(tmp_path):
    cliente = ClienteFalso(falla_en={"episodes"})
    log = log_conectado(tmp_path, cliente)

    for seed in range(5):
        log.episode(episodio(seed=seed))

    assert log.client is None and log.run_id is None
    # Un solo intento: los cuatro episodios siguientes ni tocan la red.
    assert cliente.tablas() == ["episodes"]
    assert len(log.path.read_text(encoding="utf-8").splitlines()) == 5


def test_solo_avisa_una_vez(tmp_path, capsys):
    """Cincuenta episodios serían cincuenta timeouts, y basta con enterarse una vez."""
    log = log_conectado(tmp_path, ClienteFalso(falla_en={"episodes"}))

    for seed in range(5):
        log.episode(episodio(seed=seed))

    salida = capsys.readouterr().out
    assert salida.count("aviso") == 1
    assert str(log.path) in salida


def test_un_episodio_correcto_sube_sus_filas_hijas(tmp_path):
    cliente = ClienteFalso()
    log = log_conectado(tmp_path, cliente)

    log.episode(
        episodio(),
        placements=[{"seq": 0, "package_id": "pkg_00"}],
        pallet_states=[{"after_seq": 0, "mass_kg": 1.2}],
        events=[{"ts": 0.1, "seq": 0, "kind": "place"}],
    )

    assert cliente.tablas() == ["episodes", "placements", "pallet_states", "events"]
    # Cada hija lleva el episode_id que devolvió la inserción del episodio.
    for _, tabla, filas in cliente.llamadas[1:]:
        assert all(f["episode_id"] == "episodes-1" for f in filas), tabla


def test_sin_run_id_no_se_intenta_subir_nada(tmp_path):
    cliente = ClienteFalso()
    log = log_conectado(tmp_path, cliente)
    log.run_id = None

    log.episode(episodio())

    assert cliente.llamadas == []
    assert len(log.path.read_text(encoding="utf-8").splitlines()) == 1


def test_close_cierra_el_run(tmp_path):
    cliente = ClienteFalso()
    log = log_conectado(tmp_path, cliente)

    log.close()

    assert cliente.llamadas == [
        ("patch", "runs", {"id": "run-1"}, {"ended_at": "now()"})]


def test_close_sin_remoto_no_hace_nada(tmp_path):
    log = RunLog(tmp_path, remote=False)
    log.close()          # no revienta
    assert log.path_in_ui is None


def test_path_in_ui_apunta_al_run(tmp_path):
    log = log_conectado(tmp_path, ClienteFalso())
    assert log.path_in_ui == "/runs/run-1"
