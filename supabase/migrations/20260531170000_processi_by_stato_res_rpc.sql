-- FASE 4 BIS — Wave 4: CRM assegnazione board.
-- Processi per stato_res (da assegnare / fare ricerca).
create or replace function public.processi_matching_by_stato_res(p_stati text[])
returns setof public.processi_matching
language sql stable security definer set search_path = public
as $$
  select * from public.processi_matching
  where stato_res = any (p_stati)
  order by aggiornato_il desc nulls last;
$$;

grant execute on function public.processi_matching_by_stato_res(text[]) to anon, authenticated;
