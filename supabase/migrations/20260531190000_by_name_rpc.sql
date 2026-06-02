-- FASE 4 BIS — Wave 4: heuristica nome (fallback dettaglio rapporto).
-- Match esatto nome/cognome in entrambi gli ordini; per lavoratore anche
-- nome = full label. Replica buildNamePartsFilter del FE.
create or replace function public.famiglie_by_name(p_first text, p_rest text)
returns setof public.famiglie
language sql stable security definer set search_path = public
as $$
  select * from public.famiglie
  where p_first is not null and p_rest is not null
    and ((cognome = p_first and nome = p_rest)
      or (nome = p_first and cognome = p_rest))
  limit 2;
$$;

create or replace function public.lavoratori_by_name(p_first text, p_rest text, p_full text)
returns setof public.lavoratori
language sql stable security definer set search_path = public
as $$
  select * from public.lavoratori
  where (p_first is not null and p_rest is not null
         and ((cognome = p_first and nome = p_rest)
           or (nome = p_first and cognome = p_rest)))
     or (p_full is not null and nome = p_full)
  limit 2;
$$;

grant execute on function public.famiglie_by_name(text, text) to anon, authenticated;
grant execute on function public.lavoratori_by_name(text, text, text) to anon, authenticated;
