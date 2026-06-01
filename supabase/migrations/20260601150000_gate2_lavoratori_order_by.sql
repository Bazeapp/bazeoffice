-- FASE 4 BIS — gate2_lavoratori: ordinamento whitelisted via p_order_by/p_order_dir.
DROP FUNCTION IF EXISTS public.gate2_lavoratori(integer, integer, text, jsonb);

CREATE OR REPLACE FUNCTION public.gate2_lavoratori(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL::text,
  p_filters jsonb DEFAULT '[]'::jsonb,
  p_order_by text DEFAULT NULL::text,
  p_order_dir text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with params as (
    select
      greatest(1, least(coalesce(p_limit, 50), 500)) as limit_value,
      greatest(0, coalesce(p_offset, 0)) as offset_value,
      lower(trim(coalesce(p_search, ''))) as search_value,
      coalesce(p_filters, '[]'::jsonb) as filters_value
  ),
  eligible as (
    select
      l.id, l.nome, l.cognome, l.email, l.telefono, l.permalink_foto,
      case
        when l.foto is null then null::jsonb
        when jsonb_typeof(l.foto) = 'array' and jsonb_array_length(l.foto) > 0 then jsonb_build_array(
          jsonb_strip_nulls(jsonb_build_object(
            'path', l.foto->0->>'path','url', l.foto->0->>'url',
            'public_url', l.foto->0->>'public_url','download_url', l.foto->0->>'download_url',
            'src', l.foto->0->>'src'))
        )
        when jsonb_typeof(l.foto) = 'object' then jsonb_strip_nulls(jsonb_build_object(
          'path', l.foto->>'path','url', l.foto->>'url',
          'public_url', l.foto->>'public_url','download_url', l.foto->>'download_url',
          'src', l.foto->>'src'))
        else null::jsonb
      end as foto,
      l.check_blacklist, l.stato_lavoratore, l.disponibilita, l.data_ritorno_disponibilita,
      l.tipo_lavoro_domestico, l.tipo_rapporto_lavorativo, l.data_di_nascita,
      l.anni_esperienza_colf, l.anni_esperienza_babysitter,
      coalesce(nullif(address_row.provincia, ''), nullif(l.provincia, '')) as provincia,
      nullif(address_row.provincia_sigla, '') as provincia_sigla,
      address_row.cap as cap,
      coalesce(nullif(address_row.indirizzo_formattato, ''), nullif(l.indirizzo_residenza_completo, '')) as indirizzo_residenza_completo,
      l.followup_chiamata_idoneita, l.data_ora_di_creazione, l.data_ora_ultima_modifica, l.creato_il, l.aggiornato_il
    from public.lavoratori l
    left join lateral (
      select i.cap, i.provincia, i.provincia_sigla, i.indirizzo_formattato
      from public.indirizzi i
      where i.entita_tabella = 'lavoratori' and i.entita_id = l.id::text
      order by case when i.tipo_indirizzo = 'residenza' then 0 else 1 end,
        i.aggiornato_il desc nulls last, i.creato_il desc nulls last
      limit 1
    ) address_row on true
    cross join params p
    where l.stato_lavoratore in ('Qualificato', 'Idoneo')
      and (p.search_value = '' or public.lavoratore_matches_search(l.nome, l.cognome, l.email, l.telefono, p.search_value))
      and public.lavoratore_matches_any(
        to_jsonb(l) || jsonb_build_object(
          'provincia', coalesce(nullif(address_row.provincia, ''), nullif(l.provincia, '')),
          'provincia_sigla', nullif(address_row.provincia_sigla, ''),
          'cap', address_row.cap,
          'indirizzo_residenza_completo', coalesce(nullif(address_row.indirizzo_formattato, ''), nullif(l.indirizzo_residenza_completo, ''))
        ),
        p.filters_value
      )
  ),
  total_count as (select count(*)::integer as total from eligible),
  page_rows as (
    select * from eligible
    order by
      case when p_order_by is not null and lower(coalesce(p_order_dir,'asc'))='asc' then public.lavoratore_sort_num(to_jsonb(eligible), p_order_by) end asc nulls last,
      case when p_order_by is not null and lower(coalesce(p_order_dir,'asc'))<>'asc' then public.lavoratore_sort_num(to_jsonb(eligible), p_order_by) end desc nulls last,
      case when p_order_by is not null and lower(coalesce(p_order_dir,'asc'))='asc' then public.lavoratore_sort_text(to_jsonb(eligible), p_order_by) end asc nulls last,
      case when p_order_by is not null and lower(coalesce(p_order_dir,'asc'))<>'asc' then public.lavoratore_sort_text(to_jsonb(eligible), p_order_by) end desc nulls last,
      stato_lavoratore asc, data_ora_ultima_modifica desc nulls last, creato_il desc nulls last
    limit (select limit_value from params) offset (select offset_value from params)
  )
  select jsonb_build_object(
    'rows', coalesce(jsonb_agg(to_jsonb(page_rows) order by
      case when p_order_by is not null and lower(coalesce(p_order_dir,'asc'))='asc' then public.lavoratore_sort_num(to_jsonb(page_rows), p_order_by) end asc nulls last,
      case when p_order_by is not null and lower(coalesce(p_order_dir,'asc'))<>'asc' then public.lavoratore_sort_num(to_jsonb(page_rows), p_order_by) end desc nulls last,
      case when p_order_by is not null and lower(coalesce(p_order_dir,'asc'))='asc' then public.lavoratore_sort_text(to_jsonb(page_rows), p_order_by) end asc nulls last,
      case when p_order_by is not null and lower(coalesce(p_order_dir,'asc'))<>'asc' then public.lavoratore_sort_text(to_jsonb(page_rows), p_order_by) end desc nulls last,
      page_rows.stato_lavoratore asc, page_rows.data_ora_ultima_modifica desc nulls last, page_rows.creato_il desc nulls last), '[]'::jsonb),
    'total', (select total from total_count),
    'limit', (select limit_value from params),
    'offset', (select offset_value from params),
    'columns', '[]'::jsonb,
    'groups', '[]'::jsonb
  )
  from page_rows;
$function$;
