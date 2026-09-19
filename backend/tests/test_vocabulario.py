"""Los vocabularios cerrados, cuadrados entre SQL, Python y TypeScript.

AGENTS.md §5 dice que añadir una causa de fallo obliga a tocar TRES sitios. Nada lo
comprobaba, y saltarse uno falla tarde y mal: el episodio se escribe en disco, la
subida entera se cae por el CHECK, y nadie se entera hasta ver la interfaz vacía. O
peor, la UI acaba enseñando el identificador crudo, que es justo lo que prohíben
AGENTS.md §4 y API.md §2.2.

No hace falta base de datos: se leen los ficheros como texto. Los CHECK son listas
planas de literales, que es lo único que un regex aguanta sin mentir.
"""

import re
from pathlib import Path

from theker_telemetry.schema import FAILURES, TASKS

RAIZ = Path(__file__).resolve().parents[2]
SQL = (RAIZ / "backend" / "sql" / "001_schema.sql").read_text(encoding="utf-8")
UI = (RAIZ / "frontend" / "lib" / "ui.ts").read_text(encoding="utf-8")
SUPABASE = (RAIZ / "frontend" / "lib" / "supabase.ts").read_text(encoding="utf-8")


def sin_comentarios_sql(sql: str) -> str:
    """Los CHECK llevan comentarios `--` dentro del paréntesis."""
    return re.sub(r"--[^\n]*", "", sql)


def sin_comentarios_ts(ts: str) -> str:
    return re.sub(r"//[^\n]*", "", ts)


def valores_check(columna: str) -> set[str]:
    """Los literales de `check (<columna> in ('a', 'b', ...))`.

    Se recorre el paréntesis contando profundidad en vez de cortar por la primera `)`,
    porque el CHECK de `kind` parte en dos líneas y el de `failure` lleva comentarios.
    """
    texto = sin_comentarios_sql(SQL)
    inicio = re.search(rf"check\s*\(\s*{columna}\s+in\s*\(", texto)
    assert inicio, f"no encuentro el CHECK de {columna}"

    profundidad, i = 1, inicio.end()
    while profundidad:
        profundidad += {"(": 1, ")": -1}.get(texto[i], 0)
        i += 1
    # [\w-] y no \w: hay valores con guion, y comillas dobladas dentro de un
    # literal SQL, que el findall salta solo.
    return set(re.findall(r"'+([\w-]+)'+", texto[inicio.end():i]))


def claves_record(nombre: str) -> set[str]:
    """Las claves de un `export const NOMBRE: Record<...> = { clave: "...", }`."""
    texto = sin_comentarios_ts(UI)
    bloque = re.search(rf"export const {nombre}[^=]*=\s*\{{(.*?)\n\}};", texto, re.S)
    assert bloque, f"no encuentro {nombre} en ui.ts"
    # La clave va entre comillas si lleva un guion, que en TS no es un
    # identificador válido.
    return set(re.findall(r'^\s*"?([\w-]+)"?:', bloque.group(1), re.M))


def union_ts(fuente: str, tipo: str, campo: str | None = None) -> set[str]:
    """Los literales de una unión de cadenas, sea un `export type` o un campo."""
    if campo is None:
        bloque = re.search(rf"export type {tipo}\s*=(.*?);", fuente, re.S)
    else:
        cuerpo = re.search(rf"export type {tipo} = \{{(.*?)\n\}};", fuente, re.S)
        assert cuerpo, f"no encuentro el tipo {tipo}"
        bloque = re.search(rf"{campo}:([^;]*);", cuerpo.group(1))
    assert bloque, f"no encuentro {tipo}.{campo}"
    return set(re.findall(r'"(\w+)"', bloque.group(1)))


# ── causas de fallo: los tres sitios de AGENTS.md §5 ─────────────────────────

def test_lo_que_se_produce_cabe_en_lo_que_se_almacena():
    """Subconjunto, NO igualdad, y la asimetría es deliberada (001_schema.sql:61):
    el CHECK dice qué se puede almacenar e incluye el histórico; FAILURES dice qué se
    puede producir e incluye solo lo vivo. Una causa producible que el CHECK rechace
    tumbaría la subida del episodio entero."""
    assert FAILURES <= valores_check("failure")


def test_la_interfaz_sabe_traducir_todo_lo_almacenable():
    """Igualdad: cualquier causa que pueda salir de la base tiene que tener texto, o
    la pantalla enseña el enum crudo. Y una traducción de más es una causa que alguien
    borró del CHECK sin limpiar el front."""
    assert claves_record("FAILURE_TEXT") == valores_check("failure")


def test_el_tipo_failure_del_front_es_el_vocabulario_almacenable():
    assert union_ts(UI, "Failure") == valores_check("failure")


def test_el_historico_sigue_siendo_almacenable_pero_no_producible():
    """`place_inaccurate` lo midió una versión anterior. Tirarlo falsearía la curva de
    mejora; producirlo otra vez sería resucitar un vocabulario muerto."""
    assert "place_inaccurate" in valores_check("failure")
    assert "place_inaccurate" not in FAILURES


# ── el resto de vocabularios cerrados ────────────────────────────────────────

def test_las_tareas_cuadran_en_los_tres_sitios():
    assert valores_check("task") == set(TASKS) == claves_record("TASK_TEXT")


def test_los_tipos_de_evento_cuadran():
    """API.md §2.6 los lista como el contrato de `events.kind`."""
    assert valores_check("kind") == claves_record("EVENT_TEXT")


def test_los_estados_de_episodio_cuadran():
    """Si el front declarase un estado que el CHECK no permite, la rama que lo pinta
    sería código muerto; al revés, un estado real se pintaría como desconocido."""
    esperado = valores_check("status")
    assert union_ts(SUPABASE, "Episode", "status") == esperado
    assert union_ts(SUPABASE, "SeedPoint", "status") == esperado


def test_running_es_uno_de_los_estados():
    """Live pregunta por `status=eq.running` (API.md §2.2). Sin este valor esa consulta
    no devolvería nunca nada y la pantalla no podría estar en vivo."""
    assert "running" in valores_check("status")
