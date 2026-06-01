-- FASE 4 BIS — fix "lean" su cerca/gate1/gate2_lavoratori.
-- 1) `foto` (CASE di parsing JSON) NON viene più materializzata su tutte le
--    righe eleggibili: la CTE `eligible` porta solo `l.foto` grezzo (foto_raw),
--    e il CASE viene costruito SOLO sulle ~50 righe della pagina, via
--    (to_jsonb(page_rows) - 'foto_raw') || jsonb_build_object('foto', <CASE>).
-- 2) gate1/gate2: la chiamata lavoratore_matches_any(to_jsonb(l) || …) è ora
--    guardata da `p.filters_value = '[]'::jsonb or …`, così con board senza
--    filtri non si costruisce to_jsonb(l) per ogni riga (era il collo di
--    bottiglia: gate2 1029ms -> 122ms). Output JSON invariato.
-- NB: definizioni allineate allo stato applicato in produzione.

-- cerca_lavoratori
CREATE OR REPLACE FUNCTION public.cerca_lavoratori(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_search text DEFAULT NULL::text, p_filters jsonb DEFAULT '[]'::jsonb, p_order_by text DEFAULT NULL::text, p_order_dir text DEFAULT NULL::text)
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
      l.foto as foto_raw,
      l.check_blacklist, l.stato_lavoratore, l.disponibilita, l.data_ritorno_disponibilita,
      l.tipo_lavoro_domestico, l.tipo_rapporto_lavorativo, l.data_di_nascita,
      l.anni_esperienza_colf, l.anni_esperienza_babysitter, l.provincia,
      null::text as cap, l.indirizzo_residenza_completo, l.followup_chiamata_idoneita,
      l.data_ora_di_creazione, l.data_ora_ultima_modifica, l.creato_il, l.aggiornato_il
    from public.lavoratori l
    cross join params p
    cross join normalized_filter_sets fs
    where (p.search_value = '' or public.lavoratore_matches_search(l.nome, l.cognome, l.email, l.telefono, p.search_value))
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
      case when p_order_by is not null and lower(coalesce(p_order_dir,'asc'))='asc' then public.lavoratore_sort_num(to_jsonb(eligible), p_order_by) end asc nulls last,
      case when p_order_by is not null and lower(coalesce(p_order_dir,'asc'))<>'asc' then public.lavoratore_sort_num(to_jsonb(eligible), p_order_by) end desc nulls last,
      case when p_order_by is not null and lower(coalesce(p_order_dir,'asc'))='asc' then public.lavoratore_sort_text(to_jsonb(eligible), p_order_by) end asc nulls last,
      case when p_order_by is not null and lower(coalesce(p_order_dir,'asc'))<>'asc' then public.lavoratore_sort_text(to_jsonb(eligible), p_order_by) end desc nulls last,
      stato_lavoratore asc, data_ora_ultima_modifica desc nulls last, creato_il desc nulls last
    limit (select limit_value from params) offset (select offset_value from params)
  )
  select jsonb_build_object(
    'rows', coalesce(jsonb_agg(
      (to_jsonb(page_rows) - 'foto_raw') || jsonb_build_object('foto',
        case
          when page_rows.foto_raw is null then null::jsonb
          when jsonb_typeof(page_rows.foto_raw) = 'array' and jsonb_array_length(page_rows.foto_raw) > 0 then jsonb_build_array(
            jsonb_strip_nulls(jsonb_build_object('path', page_rows.foto_raw->0->>'path','url', page_rows.foto_raw->0->>'url','public_url', page_rows.foto_raw->0->>'public_url','download_url', page_rows.foto_raw->0->>'download_url','src', page_rows.foto_raw->0->>'src'))
          )
          when jsonb_typeof(page_rows.foto_raw) = 'object' then jsonb_strip_nulls(
            jsonb_build_object('path', page_rows.foto_raw->>'path','url', page_rows.foto_raw->>'url','public_url', page_rows.foto_raw->>'public_url','download_url', page_rows.foto_raw->>'download_url','src', page_rows.foto_raw->>'src')
          )
          else null::jsonb
        end)
      order by
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

-- gate1_lavoratori (lean foto + guard to_jsonb)
CREATE OR REPLACE FUNCTION public.gate1_lavoratori(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_search text DEFAULT NULL::text, p_filters jsonb DEFAULT '[]'::jsonb, p_order_by text DEFAULT NULL::text, p_order_dir text DEFAULT NULL::text)
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
      l.foto as foto_raw,
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
    where l.stato_lavoratore = 'Qualificato'
      and (l.disponibilita is distinct from 'Non disponibile'
        or (l.disponibilita = 'Non disponibile' and l.data_ritorno_disponibilita <= current_date + 14))
      and (p.search_value = '' or public.lavoratore_matches_search(l.nome, l.cognome, l.email, l.telefono, p.search_value))
      and (p.filters_value = '[]'::jsonb or public.lavoratore_matches_any(
        to_jsonb(l) || jsonb_build_object(
          'provincia', coalesce(nullif(address_row.provincia, ''), nullif(l.provincia, '')),
          'provincia_sigla', nullif(address_row.provincia_sigla, ''),
          'cap', address_row.cap,
          'indirizzo_residenza_completo', coalesce(nullif(address_row.indirizzo_formattato, ''), nullif(l.indirizzo_residenza_completo, ''))
        ),
        p.filters_value
      ))
      and not exists (
        select 1 from public.selezioni_lavoratori s
        where s.lavoratore_id = l.id
          and lower(trim(replace(coalesce(s.stato_selezione, ''), '_', ' '))) = any (array[
            'selezionato','inviato al cliente','colloquio schedulato','colloquio rimandato',
            'colloquio fatto','prova schedulata','prova rimandata'])
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
      case
        when nullif(followup_chiamata_idoneita, '') is null then 0
        when followup_chiamata_idoneita = '1° chiamata senza risposta' then 1
        when followup_chiamata_idoneita = '2° chiamata senza risposta' then 2
        when followup_chiamata_idoneita = '3° chiamata senza risposta' then 3
        else 99
      end asc,
      creato_il desc nulls last, data_ora_ultima_modifica desc nulls last, id asc
    limit (select limit_value from params) offset (select offset_value from params)
  )
  select jsonb_build_object(
    'rows', coalesce(jsonb_agg(
      (to_jsonb(page_rows) - 'foto_raw') || jsonb_build_object('foto',
        case
          when page_rows.foto_raw is null then null::jsonb
          when jsonb_typeof(page_rows.foto_raw) = 'array' and jsonb_array_length(page_rows.foto_raw) > 0 then jsonb_build_array(
            jsonb_strip_nulls(jsonb_build_object(
              'path', page_rows.foto_raw->0->>'path','url', page_rows.foto_raw->0->>'url',
              'public_url', page_rows.foto_raw->0->>'public_url','download_url', page_rows.foto_raw->0->>'download_url',
              'src', page_rows.foto_raw->0->>'src'))
          )
          when jsonb_typeof(page_rows.foto_raw) = 'object' then jsonb_strip_nulls(jsonb_build_object(
            'path', page_rows.foto_raw->>'path','url', page_rows.foto_raw->>'url',
            'public_url', page_rows.foto_raw->>'public_url','download_url', page_rows.foto_raw->>'download_url',
            'src', page_rows.foto_raw->>'src'))
          else null::jsonb
        end)
      order by
      case when p_order_by is not null and lower(coalesce(p_order_dir,'asc'))='asc' then public.lavoratore_sort_num(to_jsonb(page_rows), p_order_by) end asc nulls last,
      case when p_order_by is not null and lower(coalesce(p_order_dir,'asc'))<>'asc' then public.lavoratore_sort_num(to_jsonb(page_rows), p_order_by) end desc nulls last,
      case when p_order_by is not null and lower(coalesce(p_order_dir,'asc'))='asc' then public.lavoratore_sort_text(to_jsonb(page_rows), p_order_by) end asc nulls last,
      case when p_order_by is not null and lower(coalesce(p_order_dir,'asc'))<>'asc' then public.lavoratore_sort_text(to_jsonb(page_rows), p_order_by) end desc nulls last,
      case
        when nullif(page_rows.followup_chiamata_idoneita, '') is null then 0
        when page_rows.followup_chiamata_idoneita = '1° chiamata senza risposta' then 1
        when page_rows.followup_chiamata_idoneita = '2° chiamata senza risposta' then 2
        when page_rows.followup_chiamata_idoneita = '3° chiamata senza risposta' then 3
        else 99
      end asc,
      page_rows.creato_il desc nulls last, page_rows.data_ora_ultima_modifica desc nulls last, page_rows.id asc
    ), '[]'::jsonb),
    'total', (select total from total_count),
    'limit', (select limit_value from params),
    'offset', (select offset_value from params),
    'columns', '[]'::jsonb,
    'groups', '[]'::jsonb
  )
  from page_rows;
$function$;

-- gate2_lavoratori (lean foto + guard to_jsonb)
CREATE OR REPLACE FUNCTION public.gate2_lavoratori(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_search text DEFAULT NULL::text, p_filters jsonb DEFAULT '[]'::jsonb, p_order_by text DEFAULT NULL::text, p_order_dir text DEFAULT NULL::text)
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
      l.foto as foto_raw,
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
      and (p.filters_value = '[]'::jsonb or public.lavoratore_matches_any(
        to_jsonb(l) || jsonb_build_object(
          'provincia', coalesce(nullif(address_row.provincia, ''), nullif(l.provincia, '')),
          'provincia_sigla', nullif(address_row.provincia_sigla, ''),
          'cap', address_row.cap,
          'indirizzo_residenza_completo', coalesce(nullif(address_row.indirizzo_formattato, ''), nullif(l.indirizzo_residenza_completo, ''))
        ),
        p.filters_value
      ))
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
    'rows', coalesce(jsonb_agg(
      (to_jsonb(page_rows) - 'foto_raw') || jsonb_build_object('foto',
        case
          when page_rows.foto_raw is null then null::jsonb
          when jsonb_typeof(page_rows.foto_raw) = 'array' and jsonb_array_length(page_rows.foto_raw) > 0 then jsonb_build_array(
            jsonb_strip_nulls(jsonb_build_object(
              'path', page_rows.foto_raw->0->>'path','url', page_rows.foto_raw->0->>'url',
              'public_url', page_rows.foto_raw->0->>'public_url','download_url', page_rows.foto_raw->0->>'download_url',
              'src', page_rows.foto_raw->0->>'src'))
          )
          when jsonb_typeof(page_rows.foto_raw) = 'object' then jsonb_strip_nulls(jsonb_build_object(
            'path', page_rows.foto_raw->>'path','url', page_rows.foto_raw->>'url',
            'public_url', page_rows.foto_raw->>'public_url','download_url', page_rows.foto_raw->>'download_url',
            'src', page_rows.foto_raw->>'src'))
          else null::jsonb
        end)
      order by
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
