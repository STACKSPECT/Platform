-- Esquema de observabilidad de ejecuciones.
--
-- Se aplica UNA vez, a mano, desde el SQL editor de Supabase. Es idempotente:
-- se puede volver a pegar entero sin romper nada.
--
-- Principio de diseño (docs/BRIEFING-observabilidad.md §7): lo que es común a toda
-- tarea va en columnas tipadas; lo específico de una tarea va en `jsonb`. Así medir
-- algo nuevo no obliga a migrar el esquema a las tres de la mañana.
--
-- El `jsonl` de runs/ sigue siendo la fuente de verdad. Esto es una réplica
-- consultable: si se pierde, se reconstruye con scripts/backfill.py.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tablas. Los vocabularios cerrados se expresan con CHECK y no con ENUM de
-- Postgres a propósito: ampliar un CHECK es un ALTER de una línea, ampliar un
-- ENUM es una migración. Si añades un valor aquí, añádelo TAMBIÉN en
-- src/metrics.py y en AGENTS.md §5.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists runs (
  id            uuid primary key default gen_random_uuid(),
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  task          text not null check (task in ('induction', 'palletizing')),
  level         int  not null,
  git_sha       text not null default '',
  oracle        bool not null default false,
  motion_speed  real not null default 1.0,
  label         text,                     -- nota a mano: "tras bajar place_transit"
  config        jsonb not null default '{}'::jsonb,
  n_episodes    int  not null default 0   -- los que se PIDIERON; los reales se cuentan
);

comment on column runs.label is
  'Nota libre del que lanzó el benchmark. Es lo que convierte una lista de SHAs en una historia.';
comment on column runs.oracle is
  'Percepción sustituida por poses reales. Un run con oracle NO es comparable con uno sin él.';

create table if not exists episodes (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references runs(id) on delete cascade,
  seed          int  not null,
  task          text not null check (task in ('induction', 'palletizing')),
  level         int  not null,
  status        text not null default 'running'
                  check (status in ('running', 'success', 'failure')),
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  duration_s    real,
  n_objects     int  not null default 0,
  n_placed      int  not null default 0,
  score         real,
  failure       text,                      -- CHECK aparte, más abajo: ver nota
  metrics       jsonb not null default '{}'::jsonb,
  unique (run_id, seed)
);

-- El CHECK de `failure` va fuera del CREATE TABLE y se recrea en cada pasada, para
-- que ampliar el vocabulario sea volver a pegar este fichero y no una migración.
--
-- Ojo a la distinción, que no es cosmética: este CHECK dice qué se puede ALMACENAR
-- e incluye el histórico; `FAILURES` en src/metrics.py dice qué se puede PRODUCIR e
-- incluye solo lo vivo. Por eso hay valores aquí que el código de hoy no emite: los
-- midió una versión anterior y tirarlos sería falsear la curva de mejora.
alter table episodes drop constraint if exists episodes_failure_check;
alter table episodes add  constraint episodes_failure_check check (failure in (
  -- vigentes (= src/metrics.py:FAILURES)
  'no_detection', 'ik_unreachable', 'collision', 'grasp_slip',
  'wrong_placement', 'timeout', 'stack_collapse', 'overhang_violation',
  -- histórico: ya no se emite. 60 episodios de la rama de ordenación, donde
  -- separaba "lo dejó en su hueco pero impreciso" de "lo dejó donde no era".
  'place_inaccurate'
));

comment on column episodes.metrics is
  'Métricas específicas de la tarea: n_misrouted en inducción; cog_offset_xy, fill_ratio, settle_drift... en paletizado. Ver el diccionario del briefing §5.';
comment on column episodes.failure is
  'Vocabulario cerrado. La interfaz NUNCA muestra este identificador crudo: lo traduce.';

-- Un paquete depositado (o intentado). Nace para paletizado, pero la tabla es
-- genérica: en inducción un "placement" es un bulto metido en su caja.
create table if not exists placements (
  id             uuid primary key default gen_random_uuid(),
  episode_id     uuid not null references episodes(id) on delete cascade,
  seq            int  not null,            -- orden de colocación dentro del episodio
  package_id     text not null,
  package_type   text not null,
  mass_kg        real,
  dims_m         real[],
  layer          int,
  planned_pose   jsonb,                    -- {x, y, z, yaw} en metros y radianes
  actual_pose    jsonb,
  error_xy_m     real,
  error_yaw_rad  real,
  support_ratio  real,                     -- 0-1, fracción de base apoyada
  overhang_m     real,
  placed         bool not null default false,
  unique (episode_id, seq)
);

-- Una fila por paquete depositado: esto ES la traza del centro de gravedad.
-- El gráfico que deja ver venir un derrumbe varias colocaciones antes sale de aquí.
create table if not exists pallet_states (
  id                  uuid primary key default gen_random_uuid(),
  episode_id          uuid not null references episodes(id) on delete cascade,
  after_seq           int  not null,       -- estado TRAS colocar este paquete
  mass_kg             real not null,
  cog_x               real not null,       -- metros, frame del palé
  cog_y               real not null,
  cog_z               real not null,
  stability_margin_m  real,
  fill_ratio          real,
  unique (episode_id, after_seq)
);

comment on column pallet_states.stability_margin_m is
  'Distancia del CoG al borde más cercano del polígono de soporte. Negativo = vuelca.';

create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid not null references episodes(id) on delete cascade,
  ts          real not null,               -- segundos desde el inicio del episodio
  seq         int  not null,
  kind        text not null check (kind in
                ('perceive', 'plan', 'pick', 'place', 'settle', 'fail')),
  package_id  text,
  payload     jsonb not null default '{}'::jsonb,
  unique (episode_id, seq)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Índices: los que sostienen las consultas reales de la interfaz, no todos los
-- que se podrían poner.
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists idx_runs_started       on runs (started_at desc);
create index if not exists idx_runs_filter        on runs (task, level, oracle);
create index if not exists idx_episodes_run       on episodes (run_id, seed);
create index if not exists idx_episodes_failure   on episodes (failure) where failure is not null;
create index if not exists idx_placements_episode on placements (episode_id, seq);
create index if not exists idx_pallet_episode     on pallet_states (episode_id, after_seq);
create index if not exists idx_events_episode     on events (episode_id, seq);
-- Live pregunta "¿hay algo corriendo?" en cada recarga (API.md §2.2). Parcial porque
-- lo normal es que no haya ninguno: ocupa casi nada y la consulta deja de barrer la
-- tabla entera de episodios.
create index if not exists idx_episodes_running   on episodes (started_at desc) where status = 'running';

-- Las vistas de resumen NO se definen aquí, sino en 002_design.sql.
--
-- Estuvieron en este fichero y se quitaron: 002 las tira con `drop ... cascade` y las
-- rehace con más columnas, así que definirlas aquí solo servía para que 002 las
-- borrase. Peor aún, volver a pegar 001 DESPUÉS de 002 fallaba con "cannot drop
-- columns from view", porque `create or replace view` no puede quitar columnas. Los
-- dos ficheros prometen en su cabecera que se pueden repegar: ahora es verdad en
-- cualquier orden.

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS. La clave `anon` viaja al navegador: sin políticas esto sería un DELETE
-- abierto a internet. Lectura pública, escritura solo con `service_role` (que se
-- salta RLS por definición y vive únicamente en el .env del lado Python).
-- ─────────────────────────────────────────────────────────────────────────────

alter table runs          enable row level security;
alter table episodes      enable row level security;
alter table placements    enable row level security;
alter table pallet_states enable row level security;
alter table events        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['runs', 'episodes', 'placements', 'pallet_states', 'events']
  loop
    execute format('drop policy if exists lectura_publica on %I', t);
    execute format(
      'create policy lectura_publica on %I for select to anon, authenticated using (true)', t);
  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime. La vista Live se alimenta de estas suscripciones y de nada más.
-- `episodes` entra para que la cabecera sepa cuándo arranca y cuándo acaba uno.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  -- `add table` falla si la tabla ya está en la publicación: se ignora, porque
  -- este fichero tiene que poder pegarse dos veces seguidas sin dar error.
  begin alter publication supabase_realtime add table events;        exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table pallet_states; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table episodes;      exception when duplicate_object then null; end;
end $$;
