-- FASE 4 BIS — Wave 4: ricerca testuale per le dialog "aggiungi" (dropdown).
-- ILIKE %query% sui campi cercabili, OR. setof <table>.
create or replace function public.famiglie_search(p_query text, p_limit integer default 10)
returns setof public.famiglie
language sql stable security definer set search_path = public
as $$
  select * from public.famiglie
  where email ilike '%' || p_query || '%'
     or customer_email ilike '%' || p_query || '%'
     or secondary_email ilike '%' || p_query || '%'
     or nome ilike '%' || p_query || '%'
     or cognome ilike '%' || p_query || '%'
     or telefono ilike '%' || p_query || '%'
  order by aggiornato_il desc nulls last
  limit p_limit;
$$;

create or replace function public.processi_matching_search(p_query text, p_limit integer default 12)
returns setof public.processi_matching
language sql stable security definer set search_path = public
as $$
  select * from public.processi_matching
  where id::text ilike '%' || p_query || '%'
     or stato_res ilike '%' || p_query || '%'
     or orario_di_lavoro ilike '%' || p_query || '%'
  order by aggiornato_il desc nulls last
  limit p_limit;
$$;

create or replace function public.lavoratori_search(p_query text, p_limit integer default 25)
returns setof public.lavoratori
language sql stable security definer set search_path = public
as $$
  select * from public.lavoratori
  where nome ilike '%' || p_query || '%'
     or cognome ilike '%' || p_query || '%'
     or email ilike '%' || p_query || '%'
  order by aggiornato_il desc nulls last
  limit p_limit;
$$;

grant execute on function public.famiglie_search(text, integer) to anon, authenticated;
grant execute on function public.processi_matching_search(text, integer) to anon, authenticated;
grant execute on function public.lavoratori_search(text, integer) to anon, authenticated;
