# AGENTS.md

Contexto permanente de este repositorio. Léelo entero antes de escribir código. Si algo
aquí contradice lo que crees saber, gana este documento; si algo está desactualizado,
corrígelo en el mismo PR.

---

## 1. Qué es esto

Plataforma de observabilidad de un sistema robótico de **paletizado**: un brazo que
apila paquetes en palés vigilando el centro de gravedad, reconoce los bultos por visión
y replica apilaciones ordenadas.

Reto THEKER Robotics de HackSpain '26. Uno de los cinco criterios del eje B es
literalmente *«iteración y mejora medida: indicadores propios, medidos, y datos que
respalden cuánto habéis mejorado la solución durante el desarrollo»*. Esta plataforma
**es** esa evidencia.

**La simulación vive en otro repositorio.** Aquí no hay MuJoCo, ni física, ni
percepción. Este repo solo sabe de episodios, métricas y pantallas.

---

## 2. Estructura

```
backend/                 SQL + SDK. Supabase ES el backend; no hay servidor propio.
  sql/001_schema.sql       tablas, vistas y RLS
  sql/002_design.sql       columnas y vistas que pide el diseño
  theker_telemetry/        el SDK que importa quien produce episodios
    schema.py                EpisodeResult, FAILURES, TASKS, RunWriter
    core.py                  cliente PostgREST y RunLog
  seed/palletizing.py      histórico sembrado, marcado como tal
  backfill.py              sube runs/ de disco a Supabase
  pyproject.toml

frontend/                Next.js 16. Lee Supabase con la clave anon, bajo RLS.
  app/                     rutas: / (Live), /runs
  api/clients/             una función por endpoint de PostgREST
  api/hooks/               los mismos, envueltos en TanStack Query
  components/              atoms / organisms / screens
  lib/ui.ts                TODA conversión de unidades, en un solo sitio
  lib/pallet.ts            geometría del dibujo; el tamaño del palé NO es fijo
  lib/supabase.ts          los tipos, que son la mitad del contrato

docs/
  BRIEFING-observabilidad.md   qué se construye y por qué
  API.md                       el contrato: endpoints, tipos y vocabularios
  design/                      los 11 tableros del diseño, a 1440 px
```

**La dependencia va en un solo sentido.** La simulación importa `theker_telemetry`;
esta plataforma no sabe que MuJoCo existe. Por eso el esquema de métricas vive aquí y
no allí: quien define la forma del dato es quien lo almacena, y así reescribir la
simulación no se lleva por delante la observabilidad.

---

## 3. Puesta en marcha

```bash
# 1. Esquema: pegar en el SQL editor de Supabase, en orden. Son idempotentes.
backend/sql/001_schema.sql
backend/sql/002_design.sql

# 2. Credenciales. .env en la raíz (gitignorado):
#    SUPABASE_URL=https://xxxx.supabase.co
#    SUPABASE_ANON_KEY=eyJ...       pública, lectura
#    SUPABASE_SERVICE_KEY=eyJ...    SECRETA, solo el lado Python

# 3. SDK
pip install -e backend

# 4. Datos con los que ver la interfaz
python backend/seed/palletizing.py            # histórico sembrado, 6 ejecuciones
python backend/seed/ejemplo_contrato.py       # una entrada que toca TODO el contrato
python backend/seed/humo_live.py              # monta un palé en vivo: comprueba Live
python backend/backfill.py --runs-dir <repo de la simulación>/simulation/runs

# 5. Front
cd frontend && npm install && npm run dev

# 6. Tests. Sin DATABASE_URL corren los que no tocan la red; con él se añaden los
#    que aplican el esquema de verdad y verifican el contrato con el front.
pip install -e 'backend[dev]'
docker run --rm -d --name pg -e POSTGRES_PASSWORD=postgres -p 5433:5432 postgres:16
export DATABASE_URL=postgresql://postgres:postgres@localhost:5433/postgres
ruff check backend && pytest backend -q
```

`frontend/.env.local` lleva **solo** `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. La `service_role` nunca entra ahí: se salta RLS.

---

## 4. Reglas duras

**Unidad siempre visible.** `4.1 mm`, nunca `4.1`. Media interfaz son magnitudes
físicas y confundir milímetros con centímetros es el error que se cuela en la demo. La
base de datos guarda SI (metros, radianes, segundos); la pantalla enseña milímetros y
grados. **Esa conversión vive solo en `frontend/lib/ui.ts`.** Si un componente formatea
por su cuenta, la regla se rompe sola.

**La interfaz nunca muestra el identificador crudo de un fallo.** `stack_collapse` se
lee «el montón se derrumbó». La traducción está en `lib/ui.ts:FAILURE_TEXT`.

**Los números que no son de verdad molestan a la vista.** Dos casos y el mismo trato:
`runs.oracle` (percepción sustituida por poses reales) y `runs.synthetic` (datos
sembrados, no medidos). Van con trama diagonal y **nunca** entran en una comparación
junto a datos medidos.

**Bloquear una comparación no es una validación de formulario.** `comparability()` en
`lib/supabase.ts` impide enseñar un delta entre dos ejecuciones que no miden lo mismo
—distinta tarea, distinto nivel, distinto rango de semillas, una con oracle o
sembrada—. Un gráfico bonito y falso es justo lo que el jurado va a buscar.

**La interfaz no agrega nada en cliente.** Totales, medianas y causas dominantes salen
calculados de las vistas SQL. Dos sitios que suman lo mismo acaban discrepando.

**Medianas, no medias.** Un episodio que se derrumba a los 3 s arrastra la media del
tiempo de ciclo y hace parecer rápido a un run que va mal.

**Live nunca se queda en blanco.** Sin ejecución activa enseña la última terminada; si
se pierde la conexión congela lo último recibido y lo dice. Quedarse en blanco delante
del jurado es lo peor que puede hacer esa pantalla.

**El disco manda.** El `episodes.jsonl` que escribe la simulación es la fuente de
verdad; Supabase es una réplica consultable. Un fallo de red avisa una vez y el
episodio sigue: la demo no puede depender del wifi de la sala.

---

## 5. Vocabulario de causas de fallo

Cerrado. Añadir una nueva obliga a tocar **tres sitios**: `FAILURES` en
`backend/theker_telemetry/schema.py`, el CHECK de `episodes.failure` en
`backend/sql/001_schema.sql`, y `FAILURE_TEXT` en `frontend/lib/ui.ts`. Saltarse el
segundo hace que el episodio se escriba en disco y la subida se caiga entera sin que
nadie se entere hasta ver la interfaz vacía.

Ya no hace falta acordarse: `backend/tests/test_vocabulario.py` compara los tres sitios
y falla si uno se queda atrás.

| enum | en pantalla |
|---|---|
| `no_detection` | no vio ningún paquete |
| `ik_unreachable` | no alcanza la posición |
| `collision` | chocó |
| `grasp_slip` | se le escapó de la pinza |
| `wrong_placement` | lo dejó fuera de tolerancia |
| `timeout` | se quedó sin tiempo |
| `stack_collapse` | el montón se derrumbó |
| `overhang_violation` | lo dejó fuera del palé |
| `place_inaccurate` | *histórico, ya no se emite* |

El CHECK de Postgres dice qué se puede **almacenar** (incluye el histórico);
`FAILURES` dice qué se puede **producir** (solo lo vivo). No son lo mismo.

---

## 6. Modelo de datos

```
runs           id, started_at, ended_at, task, level, git_sha, oracle, synthetic,
               motion_speed, label, description, config, n_episodes

episodes       id, run_id, seed, task, level, status, started_at, ended_at,
               duration_s, n_objects, n_placed, score, failure, metrics

placements     id, episode_id, seq, package_id, package_type, mass_kg, dims_m,
               layer, planned_pose, actual_pose, error_xy_m, error_yaw_rad,
               support_ratio, overhang_m, placed

pallet_states  id, episode_id, after_seq, mass_kg, cog_x, cog_y, cog_z,
               stability_margin_m, fill_ratio, settle_drift_m
               -- una fila por paquete depositado: esto ES la traza de CoG

events         id, episode_id, ts, seq, kind, package_id, payload
               -- kind: perceive | plan | pick | place | settle | fail
```

Lo común a toda tarea va en columnas tipadas; lo específico, en `metrics` (jsonb). Así
medir algo nuevo no obliga a migrar el esquema a las tres de la mañana.

Vistas: `v_run_summary`, `v_episode_summary`, `v_failure_breakdown`. Realtime está
publicado en `events`, `pallet_states` y `episodes`; Live se alimenta de ahí.

`task` es un campo (`induction` | `palletizing`), no una rama del código: así la línea
base de inducción sigue siendo comparable cuando entre el paletizado, y el jurado ve
evolución en vez de borrón y cuenta nueva.

---

## 7. Qué NO hacer

- **No metas un servidor entre el front y Supabase.** PostgREST, RLS y Realtime ya son
  el backend. Un proceso más es una cosa más que se cae a las tres de la mañana.
- **No metas Tailwind.** El diseño son valores exactos en `docs/design/`; traducirlos a
  utilidades solo añade ruido donde no hay ninguna decisión que tomar.
- **No pongas la `service_role` en el frontend.** Se salta RLS.
- **No añadas dependencias sin motivo.** El SDK de Python no tiene ninguna: PostgREST
  se habla con `urllib` de la stdlib.
- **No calcules en el cliente lo que puede calcular una vista.**

---

## 8. Convenciones

- Python 3.11, type hints en las firmas públicas. TypeScript estricto en el front.
- Unidades SI en el dato, milímetros y grados en la pantalla.
- Nombres de código en inglés; comentarios y documentos en castellano.
- Commits pequeños, con números cuando toquen comportamiento.
- El diseño de referencia es `docs/design/observality-platform-design.html`: un bundle
  autoextraíble con 11 tableros. Se abre en el navegador.

---

## 9. Estado

- **Backend: completo y con red.** Esquema, SDK, backfill y sembrado, con 116 tests y
  CI. `pytest backend -q` no toca la red; exportando `DATABASE_URL` a un Postgres
  desechable se añaden los que levantan el esquema de verdad y comprueban el contrato
  con el front (`backend/tests/test_contrato.py`). El contrato está escrito en `docs/API.md`.
- **Episodio en vivo:** `RunLog` tiene `begin()` / `event()` / `pallet_state()` /
  `end()` además de `episode()`. **La simulación tiene que llamarlas** o Live enseñará
  el palé ya montado: `episode()` sube todo de golpe y entonces no hay fila `running`
  ni `UPDATE` a los que Realtime pueda reaccionar.
- **Front:** `/` (Live) y `/runs` (Ejecuciones), sobre TanStack Query, con Realtime y
  los tres estados no felices. El tamaño del palé sale de `config.pallet_size_m` vía
  `palletSize()`: **no** se dibuja siempre a 1200x800, porque el palé real puede ser una
  maqueta a escala y entonces todas las cotas saldrían mal por el mismo factor.
- **Pendiente:** las rutas `/runs/[id]` y `/runs/[id]/[seed]`.

Aviso de Next 16: `params` es una Promise (`const { id } = await params`) y existen los
tipos globales `PageProps<'/runs/[id]'>`. Hay documentación offline en
`frontend/node_modules/next/dist/docs/`.
