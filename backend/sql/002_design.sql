-- Lo que pide el diseño (docs/design/) y 001_schema.sql no tiene.
--
-- Se aplica después de 001, en el SQL editor de Supabase. Idempotente: se puede
-- volver a pegar entero.
--
-- Todo lo que se pueda derivar se deriva en una vista en vez de guardarse en una
-- columna. Un número almacenado que también se puede calcular es un número que algún
-- día dirá algo distinto al que se calcula, y entonces no se sabe cuál miente.

-- ─────────────────────────────────────────────────────────────────────────────
-- Columnas nuevas
-- ─────────────────────────────────────────────────────────────────────────────

-- La pantalla Run enseña dos cosas distintas: la etiqueta corta ("recentrado-v2") y
-- una frase que explica qué se cambió ("planificador de capas con recentrado de CoG").
alter table runs add column if not exists description text;

-- Datos sembrados, para poder ver la interfaz antes de que exista el pipeline de
-- paletizado. El diseño ya exige que los números que no son de verdad molesten a la
-- vista (el distintivo de oracle); éstos llevan el mismo trato. Sin esta columna, la
-- primera vez que alguien lea una tasa de éxito sembrada como medida, la hemos liado.
alter table runs add column if not exists synthetic boolean not null default false;

comment on column runs.synthetic is
  'Datos generados, no medidos. La interfaz DEBE distinguirlos: nunca entran en una comparación junto a datos reales.';

-- "ALZADO · 4 capas · deriva de asentamiento 41 mm"
alter table pallet_states add column if not exists settle_drift_m real;

comment on column pallet_states.settle_drift_m is
  'Cuánto se movió el montón entre soltar el paquete y estabilizarse. La deriva es el aviso previo al derrumbe.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Vistas. Se tiran y se rehacen: `create or replace view` no deja añadir columnas
-- en medio ni reordenarlas, y fallaría con "cannot change name of view column".
-- ─────────────────────────────────────────────────────────────────────────────

drop view if exists v_run_summary cascade;
drop view if exists v_episode_summary cascade;
drop view if exists v_failure_breakdown cascade;

create view v_episode_summary as
select
  e.id,
  e.run_id,
  e.seed,
  e.task,
  e.level,
  e.status,
  -- Live ordena por started_at para quedarse con el último episodio cuando no hay
  -- ninguno en curso (API.md §2.2). Sin proyectarlas aquí esa consulta devuelve
  -- `400 42703` y la pantalla cae a "todavía no hay episodios" delante del jurado.
  e.started_at,
  e.ended_at,
  e.duration_s,
  e.n_objects,
  e.n_placed,
  e.score,
  e.failure,
  e.metrics,
  r.git_sha,
  r.oracle,
  r.synthetic,
  r.motion_speed,
  -- Tiempo de ciclo: el número que entiende una planta. Null si no colocó nada, que
  -- es más honesto que un cero, el cual parecería infinitamente rápido.
  round((e.duration_s / nullif(e.n_placed, 0))::numeric, 3)   as cycle_time_s,
  -- Con qué margen de estabilidad acabó el montón: el último estado del palé.
  (select ps.stability_margin_m
     from pallet_states ps
    where ps.episode_id = e.id
    order by ps.after_seq desc limit 1)                        as final_stability_m,
  (select ps.fill_ratio
     from pallet_states ps
    where ps.episode_id = e.id
    order by ps.after_seq desc limit 1)                        as final_fill_ratio,
  (select ps.settle_drift_m
     from pallet_states ps
    where ps.episode_id = e.id
    order by ps.after_seq desc limit 1)                        as final_settle_drift_m,
  (select round(avg(p.error_xy_m)::numeric, 5)
     from placements p
    where p.episode_id = e.id and p.placed)                    as mean_error_xy_m,
  -- "4 de 5 capas · 400 mm de carga"
  (select max(p.layer) from placements p where p.episode_id = e.id)
                                                               as n_layers,
  -- `dims_m` es real[], así que el numeric del JSON y el real del array se promocionan
  -- a double precision, y round(double precision, int) no existe en Postgres. Se
  -- castea la expresión entera a numeric antes de redondear.
  (select round(max((p.actual_pose->>'z')::numeric
                    + coalesce(p.dims_m[3], 0)::numeric / 2.0)::numeric, 4)
     from placements p
    where p.episode_id = e.id and p.placed and p.actual_pose ? 'z')
                                                               as load_height_m
from episodes e
join runs r on r.id = e.run_id;

create view v_run_summary as
select
  r.id,
  r.started_at,
  r.ended_at,
  r.task,
  r.level,
  r.git_sha,
  r.oracle,
  r.synthetic,
  r.motion_speed,
  r.label,
  r.description,
  count(e.id)                                                  as episodes,
  count(*) filter (where e.status = 'success')                 as successes,
  round((count(*) filter (where e.status = 'success'))::numeric
        / nullif(count(e.id), 0), 4)                           as success_rate,
  sum(e.n_placed)                                              as objects_placed,
  sum(e.n_objects)                                             as objects_total,
  round(sum(e.n_placed)::numeric
        / nullif(sum(e.n_objects), 0), 4)                      as placement_rate,
  -- El rango de semillas decide si dos ejecuciones son comparables, así que no puede
  -- estar guardado a mano en `runs`: se lee de los episodios que de verdad corrieron.
  min(e.seed)                                                  as seed_min,
  max(e.seed)                                                  as seed_max,
  -- Medianas, no medias: un episodio que se derrumbó a los 3 s arrastra la media del
  -- tiempo de ciclo y hace parecer rápido a un run que va mal.
  round(percentile_cont(0.5) within group (order by e.cycle_time_s)::numeric, 3)
                                                               as median_cycle_s,
  round(percentile_cont(0.5) within group (order by e.final_stability_m)::numeric, 4)
                                                               as median_stability_m,
  round(percentile_cont(0.5) within group (order by e.mean_error_xy_m)::numeric, 5)
                                                               as median_error_xy_m,
  round(avg(e.duration_s)::numeric, 3)                         as mean_duration_s,
  round(avg(e.score)::numeric, 4)                              as mean_score,
  -- La causa que más veces tumbó un episodio. El filtro deja fuera los nulos, así que
  -- un run sin fallos devuelve null y no un "ninguno" inventado.
  mode() within group (order by e.failure)
    filter (where e.failure is not null)                       as dominant_failure,
  -- Una entrada por semilla, en orden. De aquí salen a la vez la sparkline "éxito por
  -- episodio" de la tabla de ejecuciones y la rejilla de celdas de la pantalla Run:
  -- un solo campo en vez de dos consultas que podrían discrepar.
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'seed',      e.seed,
        'status',    e.status,
        'failure',   e.failure,
        'placed',    e.n_placed,
        'objects',   e.n_objects,
        'cycle_s',   e.cycle_time_s,
        'stability', e.final_stability_m
      ) order by e.seed
    ) filter (where e.id is not null),
    '[]'::jsonb)                                               as seed_series
from runs r
left join v_episode_summary e on e.run_id = r.id
group by r.id;

create view v_failure_breakdown as
select run_id, failure, count(*) as n
from episodes
where failure is not null
group by run_id, failure;

-- Las vistas ejecutan con los permisos de quien consulta, así que heredan el RLS de
-- sus tablas base y no necesitan política propia.
alter view v_run_summary       set (security_invoker = on);
alter view v_episode_summary   set (security_invoker = on);
alter view v_failure_breakdown set (security_invoker = on);

grant select on v_run_summary, v_episode_summary, v_failure_breakdown
  to anon, authenticated;
