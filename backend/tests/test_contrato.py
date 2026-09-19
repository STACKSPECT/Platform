"""El contrato con el front, verificado contra un Postgres de verdad.

Supabase ES el backend: no hay servidor propio que pueda tener tests de integración, así
que el contrato son las relaciones que expone PostgREST y los tipos que el front escribe
a mano. Nada comparaba los dos lados, y por ahí se colaron tres cosas: `started_at`
ausente de la vista, `round()` sobre `double precision`, y `mean_score` sin declarar.

Se levanta el esquema de verdad y se lee `information_schema` en vez de parsear los
`create view` con un regex: esas vistas tienen subqueries correlacionadas, comentarios y
alias en otra línea, y un parser frágil que da falsos positivos la noche antes de la
demo es peor que no tener nada. Además, ejecutar el SQL es lo único que caza los errores
que solo aparecen con filas dentro.

    docker run --rm -d --name pg -e POSTGRES_PASSWORD=postgres -p 5433:5432 postgres:16
    export DATABASE_URL=postgresql://postgres:postgres@localhost:5433/postgres
    pytest backend -q

Sin `DATABASE_URL` se salta entero.
"""

import os
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse

import pytest

RAIZ = Path(__file__).resolve().parents[2]
SQL_DIR = RAIZ / "backend" / "sql"
DSN = os.environ.get("DATABASE_URL", "")
ESQUEMA = f"contrato_{os.getpid()}"

pytestmark = pytest.mark.skipif(
    not DSN, reason="sin DATABASE_URL: el contrato contra Postgres no se comprueba")


# ── psql, que es todo el cliente que hace falta ──────────────────────────────

def psql(sql: str, *, schema: str | None = ESQUEMA) -> str:
    return _run(["-c", sql], schema)


def psql_file(path: Path, schema: str = ESQUEMA) -> str:
    return _run(["-f", str(path)], schema)


def _run(args: list[str], schema: str | None) -> str:
    entorno = dict(os.environ)
    if schema:
        entorno["PGOPTIONS"] = f"-c search_path={schema}"
    hecho = subprocess.run(
        # -q para que `insert ... returning id` devuelva el id y no además el
        # "INSERT 0 1" que psql imprime como etiqueta de la orden.
        ["psql", DSN, "-v", "ON_ERROR_STOP=1", "-At", "-q", *args],
        capture_output=True, text=True, env=entorno,
    )
    if hecho.returncode:
        raise RuntimeError(hecho.stderr.strip() or hecho.stdout.strip())
    return hecho.stdout.strip()


@pytest.fixture(scope="module", autouse=True)
def esquema():
    """Levanta el esquema entero en una carpeta aparte y la tira al acabar.

    En un esquema propio y no en `public` por una razón muy concreta: si alguien apunta
    DATABASE_URL a un Supabase de verdad, esto no puede llevarse por delante los datos.
    Por si acaso, además, solo se habla con localhost.
    """
    # Con DATABASE_URL puesto y sin psql, lo que toca es decirlo una vez y claro, no
    # soltar veinte trazas idénticas de FileNotFoundError.
    assert shutil.which("psql"), (
        "hay DATABASE_URL pero no encuentro psql. En Debian/Ubuntu: "
        "apt-get install -y postgresql-client")

    host = urlparse(DSN).hostname or ""
    assert host in ("localhost", "127.0.0.1", "::1", "db", "postgres"), (
        f"DATABASE_URL apunta a {host!r}: esto crea y borra objetos, "
        f"solo se ejecuta contra un Postgres desechable")

    # Lo que Supabase trae puesto y un Postgres pelado no. Los .sql no se tocan.
    for sentencia in ("create role anon",
                      "create role authenticated",
                      "create publication supabase_realtime"):
        try:
            psql(sentencia, schema=None)
        except RuntimeError as err:
            if "already exists" not in str(err):
                raise

    psql(f"drop schema if exists {ESQUEMA} cascade; create schema {ESQUEMA}",
         schema=None)
    try:
        yield
    finally:
        psql(f"drop schema if exists {ESQUEMA} cascade", schema=None)


@pytest.fixture(scope="module", autouse=True)
def aplicado(esquema):
    """El esquema, ya aplicado, para el resto de los tests."""
    for fichero in sorted(SQL_DIR.glob("*.sql")):
        psql_file(fichero)


# ── 1. el esquema aplica, y aplica dos veces ─────────────────────────────────

def test_los_dos_ficheros_aplican_y_son_idempotentes():
    """Las cabeceras de 001 y 002 prometen que se pueden volver a pegar enteros. Y en
    cualquier orden: 001 después de 002 fallaba con 'cannot drop columns from view'
    mientras 001 definía vistas que 002 rehacía."""
    ficheros = sorted(SQL_DIR.glob("*.sql"))
    assert ficheros, "no hay ningún .sql que aplicar"
    for fichero in [*ficheros, *ficheros]:
        psql_file(fichero)


# ── 2. lo que el front consulta tiene que existir ────────────────────────────

def columnas(relacion: str) -> set[str]:
    filas = psql(
        "select column_name from information_schema.columns "
        f"where table_schema = '{ESQUEMA}' and table_name = '{relacion}'")
    return set(filas.splitlines()) - {""}


def fuentes_ts() -> list[Path]:
    return [p for p in (RAIZ / "frontend").rglob("*.ts")
            if "node_modules" not in p.parts]


def consultas_del_front() -> set[tuple[str, str]]:
    """Los pares (relación, columna) de cada `.from("x")` seguido de `.order`/`.eq`."""
    pares = set()
    for fichero in fuentes_ts():
        texto = fichero.read_text(encoding="utf-8")
        for trozo in texto.split('.from("')[1:]:
            relacion, _, resto = trozo.partition('"')
            # Se corta en el siguiente .from o en el fin de sentencia, para no
            # atribuirle a una relación los filtros de la siguiente.
            resto = re.split(r"\.from\(|;", resto)[0]
            for columna in re.findall(r'\.(?:order|eq|neq|gt|lt|gte|lte)\(\s*"(\w+)"',
                                      resto):
                pares.add((relacion, columna))
    return pares


def test_el_front_solo_filtra_y_ordena_por_columnas_que_existen():
    """El bug de Live vivía aquí, y NO lo caza comparar columnas contra tipos: `Episode`
    tampoco declaraba `started_at`, así que los dos lados coincidían y el error estaba
    en un literal de cadena. `?order=started_at.desc` sobre una vista que no la proyecta
    devuelve 400 42703 y la pantalla se queda sin episodio."""
    pares = consultas_del_front()
    assert pares, "no he encontrado ninguna consulta en frontend/**/*.ts"

    huerfanas = sorted(
        f"{relacion}.{columna}" for relacion, columna in pares
        if columnas(relacion) and columna not in columnas(relacion))
    assert not huerfanas, f"columnas que no existen: {huerfanas}"


def test_las_relaciones_que_consulta_el_front_existen():
    relaciones = {relacion for relacion, _ in consultas_del_front()}
    assert relaciones
    for relacion in relaciones:
        assert columnas(relacion), f"{relacion} no existe en el esquema"


# ── 3. los tipos TS caben en lo que devuelve la base ─────────────────────────

CONTRATO = {
    "Run": "v_run_summary",
    "Episode": "v_episode_summary",
    "Placement": "placements",
    "PalletState": "pallet_states",
    "RunEvent": "events",
}


def campos_ts(tipo: str) -> set[str]:
    for fichero in fuentes_ts():
        bloque = re.search(rf"export type {tipo} = \{{(.*?)\n\}};",
                           fichero.read_text(encoding="utf-8"), re.S)
        if bloque:
            return set(re.findall(r"^\s{2}(\w+)\??:", bloque.group(1), re.M))
    raise AssertionError(f"no encuentro el tipo {tipo}")


@pytest.mark.parametrize("tipo,relacion", sorted(CONTRATO.items()))
def test_cada_campo_declarado_existe_en_la_base(tipo, relacion):
    """Subconjunto, no igualdad: una columna de más no rompe nada y a veces es
    deliberada —`mean_score` está en la vista y no en `Run` a propósito (API.md §2.1)—,
    pero un campo declarado que no existe llega como `undefined` y se pinta mal en
    silencio, que es el fallo que nadie ve hasta la demo."""
    faltan = sorted(campos_ts(tipo) - columnas(relacion))
    assert not faltan, f"{tipo} declara campos que {relacion} no tiene: {faltan}"


def test_v_failure_breakdown_es_lo_que_dice_el_contrato():
    """No se compara contra ningún tipo TS porque el front no la tipa (API.md §2.3);
    inventarle uno sería fabricar falsos positivos."""
    assert columnas("v_failure_breakdown") == {"run_id", "failure", "n"}


# ── 4. las vistas calculan lo que dicen que calculan ─────────────────────────

@pytest.fixture
def run_de_prueba():
    """Un run con tres episodios, uno lentísimo, para separar mediana de media."""
    run_id = psql(
        "insert into runs (task, level, git_sha) "
        "values ('palletizing', 2, 'test123') returning id")
    psql(
        "insert into episodes "
        "  (run_id, seed, task, level, status, duration_s, n_objects, n_placed, failure) "
        "values "
        f"  ('{run_id}', 1, 'palletizing', 2, 'success',  1, 10, 1, null),"
        f"  ('{run_id}', 2, 'palletizing', 2, 'success',  2, 10, 1, null),"
        f"  ('{run_id}', 3, 'palletizing', 2, 'failure', 90, 10, 1, 'stack_collapse')")
    yield run_id
    psql(f"delete from runs where id = '{run_id}'")


def test_las_medianas_son_medianas_y_no_medias(run_de_prueba):
    """AGENTS.md §4: un episodio que se derrumba a los 3 s arrastra la media y hace
    parecer rápido a un run que va mal. Con 1, 2 y 90 la mediana es 2; la media, 31."""
    assert psql("select median_cycle_s from v_run_summary "
                f"where id = '{run_de_prueba}'") == "2.000"


def test_el_tiempo_de_ciclo_es_null_si_no_coloco_nada(run_de_prueba):
    """Más honesto que un cero, que parecería infinitamente rápido."""
    vacio = psql(
        "insert into episodes "
        "  (run_id, seed, task, level, status, duration_s, n_objects, n_placed) "
        f"values ('{run_de_prueba}', 9, 'palletizing', 2, 'failure', 5, 10, 0) "
        "returning id")
    assert psql("select cycle_time_s from v_episode_summary "
                f"where id = '{vacio}'") == ""


def test_la_causa_dominante_sale_del_run(run_de_prueba):
    assert psql("select dominant_failure from v_run_summary "
                f"where id = '{run_de_prueba}'") == "stack_collapse"


def test_sin_fallos_no_se_inventa_una_causa_dominante():
    """`null`, no un 'ninguno' inventado."""
    run_id = psql("insert into runs (task, level) values ('palletizing', 1) returning id")
    psql("insert into episodes (run_id, seed, task, level, status, n_objects, n_placed) "
         f"values ('{run_id}', 1, 'palletizing', 1, 'success', 5, 5)")
    try:
        assert psql("select dominant_failure from v_run_summary "
                    f"where id = '{run_id}'") == ""
    finally:
        psql(f"delete from runs where id = '{run_id}'")


def test_un_run_sin_episodios_sale_con_seed_series_vacia():
    """`[]` y no `null`: el front hace `.map()` sobre esto sin mirar (Sparkline)."""
    run_id = psql("insert into runs (task, level) values ('palletizing', 1) returning id")
    try:
        assert psql("select episodes, seed_series from v_run_summary "
                    f"where id = '{run_id}'") == "0|[]"
    finally:
        psql(f"delete from runs where id = '{run_id}'")


def test_las_columnas_derivadas_se_evaluan_con_filas_dentro(run_de_prueba):
    """El commit 8f235a1 fue justo esto: `round()` sobre `double precision` no existe en
    Postgres, y la expresión de `load_height_m` solo se evalúa si hay placements."""
    episodio = psql("select id from v_episode_summary "
                    f"where run_id = '{run_de_prueba}' and seed = 1")
    psql("insert into placements "
         "  (episode_id, seq, package_id, package_type, dims_m, layer, "
         "   actual_pose, error_xy_m, placed) "
         f"values ('{episodio}', 0, 'pkg_00', 'caja baja', '{{0.58,0.38,0.2}}', 1, "
         "        '{\"x\":0,\"y\":0,\"z\":0.1}'::jsonb, 0.004, true)")

    assert psql("select load_height_m, n_layers, mean_error_xy_m "
                f"from v_episode_summary where id = '{episodio}'") == "0.2000|1|0.00400"


# ── 5. el vocabulario cerrado lo impone la base ──────────────────────────────

def test_la_base_rechaza_una_causa_de_fallo_inventada(run_de_prueba):
    """Es lo que hace que saltarse el CHECK al añadir una causa tumbe la subida entera,
    y por eso el vocabulario se comprueba en los tres sitios (test_vocabulario.py)."""
    with pytest.raises(RuntimeError, match="episodes_failure_check|23514"):
        psql("insert into episodes "
             "  (run_id, seed, task, level, status, failure) "
             f"values ('{run_de_prueba}', 77, 'palletizing', 2, 'failure', 'se_rompio')")


def test_no_se_pueden_repetir_semillas_dentro_de_un_run(run_de_prueba):
    with pytest.raises(RuntimeError, match="unique|duplicate|llave duplicada"):
        psql("insert into episodes (run_id, seed, task, level, status) "
             f"values ('{run_de_prueba}', 1, 'palletizing', 2, 'success')")


# ── 6. realtime y RLS, que es de lo que vive Live ────────────────────────────

def test_las_tres_tablas_de_live_estan_publicadas():
    """Live se alimenta de estas suscripciones y de nada más (API.md §4)."""
    publicadas = set(psql(
        "select tablename from pg_publication_tables "
        f"where pubname = 'supabase_realtime' and schemaname = '{ESQUEMA}'").splitlines())
    assert {"events", "pallet_states", "episodes"} <= publicadas


def test_todo_lo_legible_tiene_rls_y_politica_de_lectura():
    """La clave `anon` viaja al navegador: sin políticas esto sería un DELETE abierto."""
    assert psql("select tablename from pg_tables "
                f"where schemaname = '{ESQUEMA}' and not rowsecurity") == ""

    # Sin lista a fuego: cualquier tabla nueva queda cubierta por este test el día que
    # se añada, que es justo cuando alguien se puede olvidar de darle su política.
    tablas = set(psql(
        f"select tablename from pg_tables where schemaname = '{ESQUEMA}'").splitlines())
    con_politica = set(psql(
        f"select tablename from pg_policies where schemaname = '{ESQUEMA}'").splitlines())
    assert tablas, "el esquema no tiene tablas"
    assert tablas - con_politica == set(), f"sin política de lectura: {tablas - con_politica}"
