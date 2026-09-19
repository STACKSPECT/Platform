-- Imágenes del palé: una foto por paquete depositado.
--
-- Se aplica después de 002, en el SQL editor de Supabase. Idempotente.
--
-- La traza numérica del CoG ya cuenta qué pasó, pero un derrumbe se ENTIENDE viéndolo.
-- Esto es lo que permite revisar el episodio después, y que el scrubber enseñe el palé
-- en el instante `t` sin volver a simular nada.
--
-- Solo se guarda la URL: los PNG viven en Storage, no en la base. Meter binarios en
-- Postgres es la vía rápida a una base que no se puede ni copiar.

create table if not exists snapshots (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid not null references episodes(id) on delete cascade,
  -- Tras qué colocación se tomó. Casa con pallet_states.after_seq, así que la foto y
  -- el punto de la traza de CoG son el mismo instante.
  after_seq   int  not null,
  view        text not null check (view in ('top', 'side', 'iso', 'camera')),
  url         text not null,
  width       int,
  height      int,
  created_at  timestamptz not null default now(),
  unique (episode_id, after_seq, view)
);

comment on column snapshots.after_seq is
  'Casa con pallet_states.after_seq: la foto y el punto de la traza son el mismo instante.';
comment on column snapshots.view is
  'Qué se ve: cenital, alzado, isométrica o la cámara que alimenta la percepción.';

create index if not exists idx_snapshots_episode on snapshots (episode_id, after_seq);

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage. El bucket es público: las imágenes se sirven al navegador con la clave
-- anon, igual que el resto de la lectura.
--
-- Guardado con to_regclass porque `storage.buckets` lo crea Supabase y NO existe en un
-- Postgres pelado. Sin esto el fichero revienta en CI, donde el esquema se aplica
-- contra un postgres:16 de serie.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
         values ('snapshots', 'snapshots', true)
    on conflict (id) do update set public = true;
  else
    raise notice 'sin esquema storage: se salta el bucket (normal fuera de Supabase)';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS y realtime, igual que el resto: lectura pública, escritura solo service_role.
-- ─────────────────────────────────────────────────────────────────────────────

alter table snapshots enable row level security;

drop policy if exists lectura_publica on snapshots;
create policy lectura_publica on snapshots
  for select to anon, authenticated using (true);

grant select on snapshots to anon, authenticated;

-- Live las quiere según llegan, como los eventos.
do $$
begin
  begin alter publication supabase_realtime add table snapshots; exception when duplicate_object then null; end;
end $$;
