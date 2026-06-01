-- FASE 4 BIS — Wave 4: opzioni nazionalità (groupBy distinct) per il filtro.
create or replace function public.lavoratori_nazionalita_options()
returns table(nazionalita text)
language sql stable security definer set search_path = public
as $$
  select distinct l.nazionalita
  from public.lavoratori l
  where l.nazionalita is not null and btrim(l.nazionalita) <> ''
  order by l.nazionalita;
$$;

grant execute on function public.lavoratori_nazionalita_options() to anon, authenticated;
