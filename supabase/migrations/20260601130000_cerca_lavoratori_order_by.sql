-- FASE 4 BIS — cerca_lavoratori: ordinamento whitelisted via p_order_by/p_order_dir.
-- DROP necessario per estendere la signature (4 -> 6 argomenti).
DROP FUNCTION IF EXISTS public.cerca_lavoratori(integer, integer, text, jsonb);

CREATE OR REPLACE FUNCTION public.cerca_lavoratori(
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
  filter_items as (
    select
      lower(trim(item->>'field')) as field_name,
      lower(trim(item->>'operator')) as operator_name,
      nullif(trim(item->>'value'), '') as filter_value
    from params p
    cross join lateral jsonb_array_elements(p.filters_value) item
    where jsonb_typeof(p.filters_value) = 'array'
  ),
  filter_sets as (
    select
      array_remove(array_agg(lower(filter_value)) filter (where field_name = 'provincia' and operator_name in ('is', 'has')), null) as provincia_include,
      array_remove(array_agg(lower(filter_value)) filter (where field_name = 'provincia' and operator_name in ('is_not', 'not_has')), null) as provincia_exclude,
      array_remove(array_agg(lower(filter_value)) filter (where field_name = 'stato_lavoratore' and operator_name in ('is', 'has')), null) as stato_include,
      array_remove(array_agg(lower(filter_value)) filter (where field_name = 'stato_lavoratore' and operator_name in ('is_not', 'not_has')), null) as stato_exclude,
      array_remove(array_agg(lower(filter_value)) filter (where field_name = 'disponibilita' and operator_name in ('is', 'has')), null) as disponibilita_include,
      array_remove(array_agg(lower(filter_value)) filter (where field_name = 'disponibilita' and operator_name in ('is_not', 'not_has')), null) as disponibilita_exclude,
      array_remove(array_agg(filter_value) filter (where field_name = 'come_ti_sposti' and operator_name = 'has'), null) as come_ti_sposti_include,
      array_remove(array_agg(filter_value) filter (where field_name = 'come_ti_sposti' and operator_name = 'not_has'), null) as come_ti_sposti_exclude,
      array_remove(array_agg(filter_value) filter (where field_name = 'tipo_lavoro_domestico' and operator_name = 'has'), null) as tipo_lavoro_domestico_include,
      array_remove(array_agg(filter_value) filter (where field_name = 'tipo_lavoro_domestico' and operator_name = 'not_has'), null) as tipo_lavoro_domestico_exclude,
      array_remove(array_agg(filter_value) filter (where field_name = 'tipo_rapporto_lavorativo' and operator_name = 'has'), null) as tipo_rapporto_lavorativo_include,
      array_remove(array_agg(filter_value) filter (where field_name = 'tipo_rapporto_lavorativo' and operator_name = 'not_has'), null) as tipo_rapporto_lavorativo_exclude,
      exists (
        select 1 from filter_items fi
        where not (
          (fi.field_name in ('provincia', 'stato_lavoratore', 'disponibilita') and fi.operator_name in ('is', 'has', 'is_not', 'not_has'))
          or (fi.field_name in ('come_ti_sposti', 'tipo_lavoro_domestico', 'tipo_rapporto_lavorativo') and fi.operator_name in ('has', 'not_has'))
        )
      ) as has_unhandled_filters
    from filter_items
  ),
  normalized_filter_sets as (
    select
      coalesce(provincia_include, '{}'::text[]) as provincia_include,
      coalesce(provincia_exclude, '{}'::text[]) as provincia_exclude,
      coalesce(stato_include, '{}'::text[]) as stato_include,
      coalesce(stato_exclude, '{}'::text[]) as stato_exclude,
      coalesce(disponibilita_include, '{}'::text[]) as disponibilita_include,
      coalesce(disponibilita_exclude, '{}'::text[]) as disponibilita_exclude,
      coalesce(come_ti_sposti_include, '{}'::text[]) as come_ti_sposti_include,
      coalesce(come_ti_sposti_exclude, '{}'::text[]) as come_ti_sposti_exclude,
      coalesce(tipo_lavoro_domestico_include, '{}'::text[]) as tipo_lavoro_domestico_include,
      coalesce(tipo_lavoro_domestico_exclude, '{}'::text[]) as tipo_lavoro_domestico_exclude,
      coalesce(tipo_rapporto_lavorativo_include, '{}'::text[]) as tipo_rapporto_lavorativo_include,
      coalesce(tipo_rapporto_lavorativo_exclude, '{}'::text[]) as tipo_rapporto_lavorativo_exclude,
      coalesce(has_unhandled_filters, false) as has_unhandled_filters
    from filter_sets
    union all
    select
      '{}'::text[], '{}'::text[], '{}'::text[], '{}'::text[], '{}'::text[], '{}'::text[],
      '{}'::text[], '{}'::text[], '{}'::text[], '{}'::text[], '{}'::text[], '{}'::text[], false
    where not exists (select 1 from filter_sets)
  ),
  eligible as (
    select
      l.id, l.nome, l.cognome, l.email, l.telefono, l.permalink_foto,
      case
        when l.foto is null then null::jsonb
        when jsonb_typeof(l.foto) = 'array' and jsonb_array_length(l.foto) > 0 then jsonb_build_array(
          jsonb_strip_nulls(jsonb_build_object('path', l.foto->0->>'path','url', l.foto->0->>'url','public_url', l.foto->0->>'public_url','download_url', l.foto->0->>'download_url','src', l.foto->0->>'src'))
        )
        when jsonb_typeof(l.foto) = 'object' then jsonb_strip_nulls(
          jsonb_build_object('path', l.foto->>'path','url', l.foto->>'url','public_url', l.foto->>'public_url','download_url', l.foto->>'download_url','src', l.foto->>'src')
        )
        else null::jsonb
      end as foto,
      l.check_blacklist, l.stato_lavoratore, l.disponibilita, l.data_ritorno_disponibilita,
      l.tipo_lavoro_domestico, l.tipo_rapporto_lavorativo, l.data_di_nascita,
      l.anni_esperienza_colf, l.anni_esperienza_babysitter, l.provincia,
      null::text as cap, l.indirizzo_residenza_completo, l.followup_chiamata_idoneita,
      l.data_ora_di_creazione, l.data_ora_ultima_modifica, l.creato_il, l.aggiornato_il
    from public.lavoratori l
    cross join params p
    cross join normalized_filter_sets fs
    where (public.lavoratore_matches_search(l.nome, l.cognome, l.email, l.telefono, p.search_value))
      and (cardinality(fs.provincia_include) = 0 or lower(coalesce(l.provincia, '')) = any (fs.provincia_include))
      and (cardinality(fs.provincia_exclude) = 0 or not (lower(coalesce(l.provincia, '')) = any (fs.provincia_exclude)))
      and (cardinality(fs.stato_include) = 0 or lower(coalesce(l.stato_lavoratore, '')) = any (fs.stato_include))
      and (cardinality(fs.stato_exclude) = 0 or not (lower(coalesce(l.stato_lavoratore, '')) = any (fs.stato_exclude)))
      and (cardinality(fs.disponibilita_include) = 0 or lower(coalesce(l.disponibilita, '')) = any (fs.disponibilita_include))
      and (cardinality(fs.disponibilita_exclude) = 0 or not (lower(coalesce(l.disponibilita, '')) = any (fs.disponibilita_exclude)))
      and (cardinality(fs.come_ti_sposti_include) = 0 or coalesce(l.come_ti_sposti, '{}'::text[]) && fs.come_ti_sposti_include)
      and (cardinality(fs.come_ti_sposti_exclude) = 0 or not (coalesce(l.come_ti_sposti, '{}'::text[]) && fs.come_ti_sposti_exclude))
      and (cardinality(fs.tipo_lavoro_domestico_include) = 0 or coalesce(l.tipo_lavoro_domestico, '{}'::text[]) && fs.tipo_lavoro_domestico_include)
      and (cardinality(fs.tipo_lavoro_domestico_exclude) = 0 or not (coalesce(l.tipo_lavoro_domestico, '{}'::text[]) && fs.tipo_lavoro_domestico_exclude))
      and (cardinality(fs.tipo_rapporto_lavorativo_include) = 0 or coalesce(l.tipo_rapporto_lavorativo, '{}'::text[]) && fs.tipo_rapporto_lavorativo_include)
      and (cardinality(fs.tipo_rapporto_lavorativo_exclude) = 0 or not (coalesce(l.tipo_rapporto_lavorativo, '{}'::text[]) && fs.tipo_rapporto_lavorativo_exclude))
      and (not fs.has_unhandled_filters or public.lavoratore_matches_filters(to_jsonb(l), p.filters_value))
      and (jsonb_typeof(p.filters_value) <> 'object' or public.lavoratore_matches_filter_group(to_jsonb(l), p.filters_value))
  ),
  total_count as (select count(*)::integer as total from eligible),
  page_rows as (
    select * from eligible
    order by
      case when lower(coalesce(p_order_dir,'asc'))='asc' then public.lavoratore_sort_num(to_jsonb(eligible), p_order_by) end asc nulls last,
      case when lower(coalesce(p_order_dir,'asc'))<>'asc' then public.lavoratore_sort_num(to_jsonb(eligible), p_order_by) end desc nulls last,
      case when lower(coalesce(p_order_dir,'asc'))='asc' then public.lavoratore_sort_text(to_jsonb(eligible), p_order_by) end asc nulls last,
      case when lower(coalesce(p_order_dir,'asc'))<>'asc' then public.lavoratore_sort_text(to_jsonb(eligible), p_order_by) end desc nulls last,
      stato_lavoratore asc, data_ora_ultima_modifica desc nulls last, creato_il desc nulls last
    limit (select limit_value from params) offset (select offset_value from params)
  )
  select jsonb_build_object(
    'rows', coalesce(jsonb_agg(to_jsonb(page_rows) order by
      case when lower(coalesce(p_order_dir,'asc'))='asc' then public.lavoratore_sort_num(to_jsonb(page_rows), p_order_by) end asc nulls last,
      case when lower(coalesce(p_order_dir,'asc'))<>'asc' then public.lavoratore_sort_num(to_jsonb(page_rows), p_order_by) end desc nulls last,
      case when lower(coalesce(p_order_dir,'asc'))='asc' then public.lavoratore_sort_text(to_jsonb(page_rows), p_order_by) end asc nulls last,
      case when lower(coalesce(p_order_dir,'asc'))<>'asc' then public.lavoratore_sort_text(to_jsonb(page_rows), p_order_by) end desc nulls last,
      page_rows.stato_lavoratore asc, page_rows.data_ora_ultima_modifica desc nulls last, page_rows.creato_il desc nulls last), '[]'::jsonb),
    'total', (select total from total_count),
    'limit', (select limit_value from params),
    'offset', (select offset_value from params),
    'columns', '[]'::jsonb,
    'groups', '[]'::jsonb
  )
  from page_rows;
$function$;
