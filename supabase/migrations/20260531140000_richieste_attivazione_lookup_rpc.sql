-- FASE 4 BIS — Wave 4: richieste_attivazione_lookup
-- Lookup richieste_attivazione per id OPPURE per processo_res_id (AND quando
-- entrambi forniti). Sostituisce i 2 table-query batch in
-- src/features/richieste-attivazione/api.ts. id e processo_res_id sono uuid.
create or replace function public.richieste_attivazione_lookup(
  p_ids uuid[] default null,
  p_processo_res_ids uuid[] default null
)
returns setof public.richieste_attivazione
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.richieste_attivazione
  where (p_ids is null or id = any (p_ids))
    and (p_processo_res_ids is null or processo_res_id = any (p_processo_res_ids));
$$;

grant execute on function public.richieste_attivazione_lookup(uuid[], uuid[]) to anon, authenticated;
