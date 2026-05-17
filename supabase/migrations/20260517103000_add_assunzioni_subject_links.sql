alter table public.assunzioni
  add column if not exists lavoratore_id uuid,
  add column if not exists famiglia_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_assunzioni_lavoratore_id'
      and conrelid = 'public.assunzioni'::regclass
  ) then
    alter table public.assunzioni
      add constraint fk_assunzioni_lavoratore_id
      foreign key (lavoratore_id)
      references public.lavoratori(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_assunzioni_famiglia_id'
      and conrelid = 'public.assunzioni'::regclass
  ) then
    alter table public.assunzioni
      add constraint fk_assunzioni_famiglia_id
      foreign key (famiglia_id)
      references public.famiglie(id)
      on delete set null;
  end if;
end $$;

update public.assunzioni a
set lavoratore_id = rl.lavoratore_id
from public.rapporti_lavorativi rl
where a.rapporto_lavorativo_lavoratore_id = rl.id
  and a.lavoratore_id is null
  and rl.lavoratore_id is not null;

update public.assunzioni a
set famiglia_id = rl.famiglia_id
from public.rapporti_lavorativi rl
where a.rapporto_lavorativo_datore_lavoro_id = rl.id
  and a.famiglia_id is null
  and rl.famiglia_id is not null;

create index if not exists idx_assunzioni_lavoratore_id
  on public.assunzioni (lavoratore_id);

create index if not exists idx_assunzioni_famiglia_id
  on public.assunzioni (famiglia_id);

