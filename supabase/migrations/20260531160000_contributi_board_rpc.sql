-- FASE 4 BIS — Wave 4: board contributi INPS.
-- Sostituisce i 3 table-query del caricamento board:
--  - contributi del trimestre (data_ora_creazione OR creato_il OR aggiornato_il nel range)
--  - mesi_calendario (tabella di riferimento, full read)
--  - rapporti_lavorativi (enrichment map, full read)
create or replace function public.contributi_inps_by_period(
  p_start timestamptz,
  p_end timestamptz
)
returns setof public.contributi_inps
language sql stable security definer set search_path = public
as $$
  select *
  from public.contributi_inps
  where (data_ora_creazione between p_start and p_end)
     or (creato_il between p_start and p_end)
     or (aggiornato_il between p_start and p_end)
  order by aggiornato_il desc nulls last;
$$;

create or replace function public.mesi_calendario_all(p_limit integer default 500)
returns setof public.mesi_calendario
language sql stable security definer set search_path = public
as $$
  select * from public.mesi_calendario order by data_inizio desc nulls last limit p_limit;
$$;

create or replace function public.rapporti_lavorativi_all(p_limit integer default 3000)
returns setof public.rapporti_lavorativi
language sql stable security definer set search_path = public
as $$
  select * from public.rapporti_lavorativi order by aggiornato_il desc nulls last limit p_limit;
$$;

grant execute on function public.contributi_inps_by_period(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.mesi_calendario_all(integer) to anon, authenticated;
grant execute on function public.rapporti_lavorativi_all(integer) to anon, authenticated;
