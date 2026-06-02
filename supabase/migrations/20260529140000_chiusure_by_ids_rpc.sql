-- FASE 4 BIS — Wave 3 (eager): chiusure_by_ids
-- Lookup chiusura per id (fine_rapporto_lavorativo_id) nel dettaglio rapporto.
-- Le altre sezioni eager (famiglia/lavoratore/processi) riusano il trio.
create or replace function public.chiusure_by_ids(p_ids uuid[])
returns setof public.chiusure_contratti
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.chiusure_contratti
  where id = any (p_ids);
$$;

grant execute on function public.chiusure_by_ids(uuid[]) to anon, authenticated;
