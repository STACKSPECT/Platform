# API de la plataforma

No hay servidor propio: **Supabase es el backend** (AGENTS.md §7). Los endpoints son los de
PostgREST, más los canales Realtime. Este documento sale de `backend/sql/001_schema.sql`,
`backend/sql/002_design.sql` y `backend/theker_telemetry/core.py`; las respuestas de ejemplo son
la forma de las columnas, no capturas de una base real.

Los clientes del front que los consumen están en `frontend/api/clients/` y los hooks en
`frontend/api/hooks/`. Los tipos siguen en `frontend/lib/supabase.ts`, que es lo que
compara `backend/tests/test_contrato.py` contra las columnas de verdad.

## 1. Convenciones

| | |
|---|---|
| Base URL | `{SUPABASE_URL}/rest/v1` |
| Lectura | cabeceras `apikey: <ANON_KEY>` y `Authorization: Bearer <ANON_KEY>`. Política RLS `lectura_publica` (`select` para `anon` y `authenticated`) |
| Escritura | igual, con `SUPABASE_SERVICE_KEY`. **Solo el lado Python**: la `service_role` se salta RLS y nunca va al front |
| Formato | JSON. Un `GET` devuelve un **array** de filas; PostgREST no envuelve la respuesta |
| Unidades | SI en el dato: metros (`_m`), radianes (`_rad`), segundos (`_s`), kilos (`_kg`). La conversión a mm/° vive solo en `frontend/lib/ui.ts` |
| `null` | significa «no medido», no cero. `cycle_time_s` es `null` si no se colocó nada |
| `numeric` | las vistas devuelven `numeric` redondeado; PostgREST lo serializa como número JSON |
| Filtros | `col=eq.valor`, orden `order=col.asc\|desc`, `limit=N`, columnas `select=a,b` |

Errores de PostgREST (cuerpo JSON `{ "code", "message", "details", "hint" }`):

| HTTP | Cuándo |
|---|---|
| 400 | columna inexistente (`42703`), violación de CHECK (`23514`), cuerpo inválido |
| 401 | clave ausente o inválida |
| 403 | RLS deniega (`42501`), p. ej. un `POST` con la `anon` |
| 404 | tabla o vista inexistente (`PGRST205`) |
| 406 | `.single()` sin exactamente una fila (`PGRST116`) |

En el front, todo error llega como `ApiError` (`source`, `code`, `details`).

## 2. Lectura (clave `anon`)

### 2.1 `GET /v_run_summary`: ejecuciones

Una fila por run, con los agregados ya calculados en SQL (medianas, no medias).

- Lista: `?select=*&order=started_at.desc&limit=60` → `getRuns(limit)` / `useRuns(limit)`
- Una: `?select=*&id=eq.{uuid}` → `getRun(id)` / `useRun(id)` (`null` si no existe)

```json
[{
  "id": "0b6f…-uuid",
  "started_at": "2026-09-18T10:12:04.311+00:00",
  "ended_at": "2026-09-18T10:31:40.002+00:00",
  "task": "palletizing",
  "level": 2,
  "git_sha": "75f7187",
  "oracle": false,
  "synthetic": false,
  "motion_speed": 1,
  "label": "recentrado-v2",
  "description": "planificador de capas con recentrado de CoG",
  "episodes": 20,
  "successes": 14,
  "success_rate": 0.7,
  "objects_placed": 168,
  "objects_total": 200,
  "placement_rate": 0.84,
  "seed_min": 0,
  "seed_max": 19,
  "median_cycle_s": 8.412,
  "median_stability_m": 0.0412,
  "median_error_xy_m": 0.00382,
  "mean_duration_s": 91.3,
  "mean_score": 0.7123,
  "dominant_failure": "stack_collapse",
  "seed_series": [
    { "seed": 0, "status": "success", "failure": null, "placed": 10, "objects": 10,
      "cycle_s": 8.1, "stability": 0.044 },
    { "seed": 1, "status": "failure", "failure": "stack_collapse", "placed": 6, "objects": 10,
      "cycle_s": 9.9, "stability": -0.003 }
  ]
}]
```

Notas: `ended_at` es `null` mientras el run sigue abierto (o si reventó sin `close()`).
`success_rate`, `placement_rate` y las medianas son `null` en un run sin episodios.
`dominant_failure` es `null` en un run sin fallos. `seed_series` es `[]` sin episodios y va
ordenada por semilla. `mean_score` está en la vista pero **no** en el tipo `Run` del front.
`status` ∈ `running | success | failure`.

### 2.2 `GET /v_episode_summary`: episodios

Una fila por episodio, con datos del run (`git_sha`, `oracle`, `synthetic`, `motion_speed`) y del
último `pallet_state`.

- Por run: `?select=*&run_id=eq.{uuid}&order=seed.asc` → `getEpisodes(runId)` / `useEpisodes(runId)`
- Por run y semilla: `?select=*&run_id=eq.{uuid}&seed=eq.{n}` → `getEpisode(runId, seed)` / `useEpisode(runId, seed)` (`null` si no existe)
- En curso (`getRunningEpisode()` / `useRunningEpisode()`): `?select=*&status=eq.running&order=started_at.desc&limit=1`. `null` si no hay ninguno. Es lo único que enseña Live: **no** cae al último terminado. Con varios en curso, el más reciente.

```json
[{
  "id": "5c1e…-uuid",
  "run_id": "0b6f…-uuid",
  "seed": 1,
  "task": "palletizing",
  "level": 2,
  "status": "failure",
  "duration_s": 61.4,
  "n_objects": 10,
  "n_placed": 6,
  "score": 0.6,
  "failure": "stack_collapse",
  "metrics": { "cog_offset_xy": 0.031, "score": 0.6, "n_misrouted": 0 },
  "git_sha": "75f7187",
  "oracle": false,
  "synthetic": false,
  "motion_speed": 1,
  "cycle_time_s": 10.233,
  "final_stability_m": -0.003,
  "final_fill_ratio": 0.48,
  "final_settle_drift_m": 0.041,
  "mean_error_xy_m": 0.00412,
  "n_layers": 3,
  "load_height_m": 0.4
}]
```

Notas: `duration_s` y `score` pueden ser `null` (episodio en curso). `cycle_time_s`,
`final_*`, `mean_error_xy_m`, `n_layers` y `load_height_m` son `null` si no hay
`pallet_states` / `placements` colocados. `final_stability_m` negativo = el montón vuelca.
`metrics` es libre (jsonb): en inducción lleva `n_misrouted`; en paletizado, `cog_offset_xy`,
etc. `failure` es el identificador crudo: la interfaz nunca lo muestra, usa `failureText()`.

> **Resuelto: `v_episode_summary` ya tiene `started_at` y `ended_at`.** Se confirmó contra un
> Postgres real: `?order=started_at.desc` daba `400 42703`, y ese era el motivo de que Live se
> quedara en "todavía no hay episodios" siempre que no hubiera un episodio `running`. La vista de
> `002_design.sql` los proyecta desde el commit que arregló esto, así que el front ordena la vista
> directamente (`getRunningEpisode`) sin el rodeo por `GET /episodes`. Lo vigila
> `backend/tests/test_contrato.py`, que exige que toda columna usada en un `.order()`/`.eq()` exista
> en la relación de su `.from()`.

### 2.3 `GET /v_failure_breakdown`: causas de fallo por run

`?select=*&run_id=eq.{uuid}&order=n.desc` → `getFailureBreakdown(runId)` / `useFailureBreakdown(runId)`

```json
[
  { "run_id": "0b6f…-uuid", "failure": "stack_collapse", "n": 4 },
  { "run_id": "0b6f…-uuid", "failure": "grasp_slip", "n": 2 }
]
```

Solo aparecen causas con al menos un episodio: un run sin fallos devuelve `[]`.

### 2.4 `GET /placements`: paquetes colocados (o intentados)

`?select=*&episode_id=eq.{uuid}&order=seq.asc` → `getPlacements(id)` / `usePlacements(id)`

```json
[{
  "id": "…-uuid", "episode_id": "5c1e…-uuid",
  "seq": 0, "package_id": "pkg_03", "package_type": "box_small",
  "mass_kg": 1.2, "dims_m": [0.2, 0.3, 0.15], "layer": 0,
  "planned_pose": { "x": 0.1, "y": 0.15, "z": 0.075, "yaw": 0 },
  "actual_pose":  { "x": 0.102, "y": 0.149, "z": 0.075, "yaw": 0.01 },
  "error_xy_m": 0.0022, "error_yaw_rad": 0.01,
  "support_ratio": 1, "overhang_m": 0, "placed": true
}]
```

`planned_pose`/`actual_pose` son jsonb y pueden ser `null`. `dims_m` es `[largo, ancho, alto]`.
Las tres poses/dimensiones están en metros y radianes.

### 2.5 `GET /pallet_states`: traza del centro de gravedad

`?select=*&episode_id=eq.{uuid}&order=after_seq.asc` → `getPalletStates(id)` / `usePalletStates(id)`

```json
[{
  "id": "…-uuid", "episode_id": "5c1e…-uuid", "after_seq": 0,
  "mass_kg": 1.2, "cog_x": 0.101, "cog_y": 0.149, "cog_z": 0.075,
  "stability_margin_m": 0.052, "fill_ratio": 0.08, "settle_drift_m": 0.002
}]
```

Una fila por paquete depositado (estado **tras** colocarlo). `stability_margin_m` negativo = vuelca.
`settle_drift_m` lo añade 002 y es el aviso previo al derrumbe.

### 2.6 `GET /events`: cronología del episodio

`?select=*&episode_id=eq.{uuid}&order=seq.asc` → `getEvents(id)` / `useEvents(id)`

```json
[{
  "id": "…-uuid", "episode_id": "5c1e…-uuid",
  "ts": 3.42, "seq": 4, "kind": "place", "package_id": "pkg_03",
  "payload": { "target": [0.1, 0.15], "ok": true }
}]
```

`ts` son segundos desde el inicio del episodio. `kind` ∈ `perceive | plan | pick | place | settle | fail`.
`payload` es libre (jsonb) y depende de `kind`.

### 2.7 Tablas `runs` y `episodes` en crudo

Legibles con `anon` (`lectura_publica`) pero **el front no las usa**: lee las vistas. Columnas en AGENTS.md §6; la fila de `runs` lleva además `config` (jsonb) y `n_episodes`
(los episodios **pedidos**, no los reales).

### 2.8 Totales: recuento sin filas

`HEAD /v_run_summary?select=*` y `HEAD /episodes?select=*`, con la cabecera `Prefer: count=exact`
→ `getRunsCount()` / `getEpisodesCount()` / `useRunsTotals()`.

No hay cuerpo: el total es el número que sigue a `/` en `Content-Range` (`*/0` si la tabla está vacía).

```
Content-Range: 0-53/54
```

Alimentan «54 ejecuciones · 833 episodios» de la barra superior de Ejecuciones. Se cuentan en la base y no se
suman en el cliente (AGENTS.md §4): `sum(episodes)` de `v_run_summary` y `count(episodes)` coinciden hoy, pero
son dos cuentas distintas.

### 2.9 Vocabularios cerrados

`failure`: `no_detection`, `ik_unreachable`, `collision`, `grasp_slip`, `wrong_placement`, `timeout`,
`stack_collapse`, `overhang_violation`, y el histórico `place_inaccurate` (ya no se emite). Traducción en
`frontend/lib/ui.ts:FAILURE_TEXT`. `task`: `induction | palletizing`.

## 3. Escritura (solo Python, `service_role`)

Lo usa `RunLog` en `backend/theker_telemetry/core.py`. El front no debe llamarlos: con la `anon` devuelven `403`.
Todo fallo remoto avisa una vez y el episodio sigue: el `episodes.jsonl` en disco es la fuente de verdad.

| Método y ruta | Cuerpo | `Prefer` | Respuesta |
|---|---|---|---|
| `POST /runs` | `[{ task, level, git_sha, oracle, motion_speed, label, n_episodes, config }]` | `return=representation` | `201` + `[fila creada]` (de ahí sale `run_id`) |
| `POST /episodes` | `[{ run_id, seed, task, level, status, duration_s, n_objects, n_placed, score, failure, metrics }]` | `return=representation` | `201` + `[fila creada]` (de ahí sale `episode_id`) |
| `POST /placements` | lote de filas con `episode_id` | `return=minimal` | `201` sin cuerpo |
| `POST /pallet_states` | ídem | `return=minimal` | `201` sin cuerpo |
| `POST /events` | ídem | `return=minimal` | `201` sin cuerpo |
| `PATCH /episodes?id=eq.{uuid}` | `{ status, duration_s, n_placed, score, failure, metrics, ended_at }` — y nada más: `seed`, `task`, `level` y `n_objects` se fijaron en `begin()` | `return=minimal` | `204` sin cuerpo |
| `PATCH /runs?id=eq.{uuid}` | `{ "ended_at": "now()" }` | `return=minimal` | `204` sin cuerpo |

Restricciones que hacen fallar la escritura: `episodes.failure` fuera del CHECK (`23514`), `unique(run_id, seed)`,
`unique(episode_id, seq)` en `placements`/`events`, `unique(episode_id, after_seq)` en `pallet_states`.
`episodes.status` se calcula en el SDK: `success` o `failure`. `git_sha`/`oracle` **no** se guardan por episodio;
las vistas los recuperan del run.

### 3.1 `runs.config`: el montaje

`jsonb` libre que describe cómo estaba montado el banco. Lo manda `RunLog(config={...})`.
La clave que la interfaz **necesita** es `pallet_size_m`:

```json
{ "pallet_size_m": [0.2105, 0.1404], "pallet_scale": 5.7 }
```

El palé puede ser una maqueta a escala —la pinza del Panda abre 80 mm y un europeo es
inagarrable—, y sin esto la pantalla lo dibuja a 1200x800 y **todas** las cotas salen mal
por el mismo factor. Viaja también en `v_episode_summary.config`, porque Live solo tiene
el episodio en la mano. El front lo lee con `palletSize()` de `lib/ui.ts`, que mira
`config`, luego `metrics` (donde estuvo mientras la columna no se podía escribir) y por
último cae al europeo.

### 3.2 `GET /snapshots`: las fotos del palé

`?select=*&episode_id=eq.{uuid}&order=after_seq.asc`

```json
[{ "id": "…-uuid", "episode_id": "5c1e…-uuid", "after_seq": 3, "view": "top",
   "url": "https://…/storage/v1/object/public/snapshots/5c1e…/003-top.png",
   "width": 640, "height": 480, "created_at": "2026-09-19T11:04:04Z" }]
```

`after_seq` casa con `pallet_states.after_seq`: la foto y el punto de la traza de CoG son
el mismo instante, que es lo que permite que el scrubber enseñe el palé en el instante `t`.
`view` ∈ `top | side | iso | camera`. El bucket es público y solo se guarda la URL: los
binarios no entran en Postgres.

`RunLog.snapshot(after_seq=…, view="top", png=<bytes>)` sube el PNG y rellena `url` sola;
si ya tienes la URL, pásala y no sube nada.

## 4. Realtime

Publicación `supabase_realtime`, canal `postgres_changes` sobre el esquema `public`. La pantalla Live
(`app/page.tsx`) es la única que lo usa y se queda con su suscripción: no pasa por TanStack Query.

| Tabla | Evento | Filtro | Payload (`payload.new`) |
|---|---|---|---|
| `events` | `INSERT` | `episode_id=eq.{id}` | fila de `events` (§2.6) |
| `pallet_states` | `INSERT` | `episode_id=eq.{id}` | fila de `pallet_states` (§2.5) |
| `episodes` | `UPDATE` | `id=eq.{id}` | fila de `episodes` **en crudo**, no de la vista: sin `git_sha`, `oracle`, ni columnas derivadas |
| `episodes` | `INSERT` | *(sin filtro)* | fila en crudo. Es lo que hace que Live se entere **al instante** de que arranca un episodio (`useRunningEpisodeRealtime`, canal `live-episodes`): no usa el payload, vuelve a preguntar cuál está `running`. El sondeo de 5 s queda de red de seguridad |
| `snapshots` | `INSERT` | `episode_id=eq.{id}` | fila de `snapshots` (§3.2) |

Por eso, ante un `UPDATE` de `episodes` Live vuelve a consultar la vista en vez de usar el payload. Con el `UPDATE` que cierra un episodio, Live **no** lo retira al instante: lo mantiene 10 s con su resultado («Terminado») y solo entonces, si no ha arrancado otro, pasa a «No hay ninguna ejecución en directo».

La suscripción sin filtro es aparte y hace falta: las otras tres van filtradas al episodio que se está
enseñando, así que un episodio **nuevo** no despertaría a nadie y la pantalla se quedaría en el anterior
hasta recargar a mano. Se filtra por `status = running` en el cliente porque un backfill inserta cientos
de episodios ya terminados y no hay por qué recargar con cada uno.

### Qué enseña Live, exactamente

Es un **episodio**, no una ejecución, y se elige en dos pasos:

1. ¿Hay alguno con `status = running`? → ese, en vivo.
2. Si no → el de `started_at` más reciente: el último guardado.

Ojo con el paso 2: `episodes.started_at` es `default now()`, así que para lo subido por `backfill.py` o por
el sembrado es la hora de **inserción**, no la de ejecución (los episodios de un mismo run backfilleado
comparten sello al segundo). Para lo que se produce con `begin()` sí es la hora real de arranque. Y tras
sembrar, lo sintético queda como "lo último" hasta que se mida algo nuevo: sale con su trama, pero
conviene saberlo antes de una demo.

El SDK sabe producir las tres. `RunLog.episode()` sigue subiendo el episodio **ya terminado** con sus
filas hijas de golpe, que es lo que quieren el backfill y el sembrado; para el modo en vivo hay un ciclo
de vida aparte:

| Llamada | Qué hace | Qué ve Live |
|---|---|---|
| `begin(seed, n_objects=…)` | `POST /episodes` con `status: "running"` | aparece el episodio en curso |
| `event(...)` / `pallet_state(...)` / `placement(...)` | una fila suelta con su `episode_id` | los `INSERT` de §4, según ocurren |
| `end(result)` | escribe el `jsonl` y hace el `PATCH` de arriba | el `UPDATE` que cierra el episodio |

Quien produce episodios tiene que llamarlas, o Live seguirá enseñando el palé ya montado: sin una fila
`running` y sin `UPDATE`, dos de las tres suscripciones no se disparan nunca.

## 5. Versiones del esquema

`001_schema.sql` crea las tablas, los índices, el RLS y la publicación de Realtime; las tres vistas las
define solo `002_design.sql`; `003_snapshots.sql` añade las fotos y su bucket. Se pegan en orden. 002 además añade
`runs.description`, `runs.synthetic`, `pallet_states.settle_drift_m`, `seed_min/max`, medianas, `dominant_failure`,
`seed_series` y las columnas derivadas de `v_episode_summary`. Con solo 001 aplicado, las respuestas de arriba
no tienen esos campos.
