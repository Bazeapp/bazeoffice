-- FASE 4 BIS — Wave 2: RPC indirizzi
--
-- Sostituisce i fetchIndirizzi table-query (entita_tabella + entita_id IN, e
-- la discovery geografica della mappa). entita_id/entita_tabella/tipo_indirizzo
-- sono TEXT; latitudine/longitudine numeric. setof indirizzi = riga piena
-- (incl. provincia_sigla, lat/lng). <entita>_<scopo>, STABLE, SECURITY DEFINER.

-- indirizzi per entità: entita_tabella + entita_id IN (...), tipo opzionale.
create or replace function public.indirizzi_by_entity(
  p_entita_tabella text,
  p_entita_ids text[],
  p_tipi text[] default null
)
returns setof public.indirizzi
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.indirizzi
  where entita_tabella = p_entita_tabella
    and entita_id = any (p_entita_ids)
    and (p_tipi is null or tipo_indirizzo = any (p_tipi));
$$;

-- indirizzi in bounding box (discovery mappa ricerca).
create or replace function public.indirizzi_in_bbox(
  p_min_lat numeric,
  p_max_lat numeric,
  p_min_lng numeric,
  p_max_lng numeric,
  p_entita_tabella text default 'lavoratori',
  p_limit integer default 1000,
  p_offset integer default 0
)
returns setof public.indirizzi
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.indirizzi
  where entita_tabella = p_entita_tabella
    and latitudine between p_min_lat and p_max_lat
    and longitudine between p_min_lng and p_max_lng
  order by aggiornato_il desc nulls last
  limit p_limit offset p_offset;
$$;

grant execute on function public.indirizzi_by_entity(text, text[], text[]) to anon, authenticated;
grant execute on function public.indirizzi_in_bbox(numeric, numeric, numeric, numeric, text, integer, integer) to anon, authenticated;
