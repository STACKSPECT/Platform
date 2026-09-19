#!/usr/bin/env bash
#
# Levanta la plataforma entera con un solo comando:
#
#     ./dev.sh
#
# No hay servidor propio que arrancar —Supabase ES el backend—, así que "todo" es:
# dependencias puestas, credenciales en su sitio, esquema al día, y el front escuchando.
#
# Lo que comprueba antes de arrancar no es ceremonia: el esquema se pega a mano en el
# editor de Supabase, así que es normal que el repo vaya por delante de la base. Que la
# interfaz salga vacía por eso, y descubrirlo delante del jurado, es el fallo caro.
#
#     ./dev.sh --check     solo comprueba, no arranca nada
#     ./dev.sh --seed      siembra datos de ejemplo antes de arrancar

set -euo pipefail
cd "$(dirname "$0")"

VERDE=$'\033[32m'; ROJO=$'\033[31m'; AMBAR=$'\033[33m'; FIN=$'\033[0m'
ok()    { echo "  ${VERDE}ok${FIN}    $1"; }
aviso() { echo "  ${AMBAR}aviso${FIN} $1"; }
error() { echo "  ${ROJO}error${FIN} $1"; }

SOLO_CHECK=false
SEMBRAR=false
for arg in "$@"; do
  case "$arg" in
    --check) SOLO_CHECK=true ;;
    --seed)  SEMBRAR=true ;;
    -h|--help) sed -n '3,15p' "$0" | sed 's/^# \?//'; exit 0 ;;
    *) error "opción desconocida: $arg"; exit 2 ;;
  esac
done

echo "── credenciales ──────────────────────────────────────────────"

falta_env=false
for f in .env frontend/.env.local; do
  if [[ ! -f "$f" ]]; then
    error "falta $f"
    falta_env=true
  elif ! grep -qE '^(NEXT_PUBLIC_)?SUPABASE_URL=[^[:space:]]' "$f"; then
    error "$f existe pero SUPABASE_URL está vacío"
    falta_env=true
  else
    ok "$f"
  fi
done
if $falta_env; then
  echo
  echo "  Copia .env.example a .env y rellena los valores desde Supabase:"
  echo "  Project Settings -> Data API -> Project URL y API Keys."
  echo "  frontend/.env.local lleva los dos primeros, con prefijo NEXT_PUBLIC_."
  exit 1
fi

echo "── dependencias ──────────────────────────────────────────────"

# El SDK de Python solo hace falta para sembrar, subir episodios o correr los tests;
# el front no lo necesita. Si no hay venv se dice y se sigue.
if [[ ! -d .venv ]]; then
  aviso "sin .venv (solo hace falta para backend/tests y los guiones de datos)"
  echo "        python3 -m venv .venv && .venv/bin/pip install -e './backend[dev]'"
else
  if .venv/bin/python -c "import theker_telemetry" 2>/dev/null; then
    ok "theker_telemetry instalado"
  else
    aviso "theker_telemetry no instalado; instalando"
    .venv/bin/pip install -q -e './backend[dev]'
    ok "instalado"
  fi
fi

# package-lock manda: si node_modules va por detrás, npm ci lo deja exacto. Pasa cada
# vez que alguien fusiona una rama que añade una dependencia.
if [[ ! -d frontend/node_modules ]] \
   || [[ frontend/package-lock.json -nt frontend/node_modules ]]; then
  aviso "dependencias del front desactualizadas; npm ci"
  (cd frontend && npm ci --silent)
fi
ok "node_modules al día"

echo "── esquema en Supabase ───────────────────────────────────────"

# Se comprueba lo que de verdad rompe la interfaz, no que "haya conexión": una columna
# que el front consulta y la vista no proyecta devuelve 400 y deja la pantalla vacía.
if [[ -d .venv ]]; then
  .venv/bin/python - <<'PY' || exit 1
import sys
sys.path.insert(0, "backend")
from pathlib import Path

from theker_telemetry import Supabase

VERDE, ROJO, FIN = "\033[32m", "\033[31m", "\033[0m"

cliente = Supabase.from_env(Path("."))
if cliente is None:
    print(f"  {ROJO}error{FIN} .env sin SUPABASE_URL o SUPABASE_SERVICE_KEY")
    raise SystemExit(1)

# Cada entrada es (relación, columna que el front necesita, fichero que la trae). Si
# falla alguna, ese .sql está sin pegar en el editor de Supabase.
ESPERADO = [
    ("v_episode_summary", "started_at", "002_design.sql"),
    ("v_episode_summary", "config", "002_design.sql"),
    ("v_run_summary", "config", "002_design.sql"),
    ("snapshots", "url", "003_snapshots.sql"),
]

faltan = set()
for relacion, columna, fichero in ESPERADO:
    try:
        cliente.get(relacion, select=columna, limit=1)
    except RuntimeError as err:
        print(f"  {ROJO}error{FIN} {relacion}.{columna}: {str(err)[:90]}")
        faltan.add(fichero)
    else:
        print(f"  {VERDE}ok{FIN}    {relacion}.{columna}")

if faltan:
    print()
    print("  Pega en el SQL editor de Supabase, en orden:")
    for fichero in sorted(faltan):
        print(f"    backend/sql/{fichero}")
    raise SystemExit(1)

runs = cliente.get("v_run_summary", select="task,synthetic,episodes")
medidos = sum(1 for r in runs if not r["synthetic"])
print(f"  {VERDE}ok{FIN}    {len(runs)} ejecuciones "
      f"({medidos} medidas, {len(runs) - medidos} sembradas), "
      f"{sum(r['episodes'] for r in runs)} episodios")
if not runs:
    print("        sin datos: ./dev.sh --seed los genera")
PY
else
  aviso "sin .venv: no puedo comprobar el esquema"
fi

if $SEMBRAR; then
  echo "── datos de ejemplo ──────────────────────────────────────────"
  .venv/bin/python backend/seed/ejemplo_contrato.py
fi

if $SOLO_CHECK; then
  echo
  ok "todo listo (no se arranca nada con --check)"
  exit 0
fi

echo "── front ─────────────────────────────────────────────────────"
echo "  http://localhost:3000   (Ctrl+C para parar)"
echo
exec npm --prefix frontend run dev
