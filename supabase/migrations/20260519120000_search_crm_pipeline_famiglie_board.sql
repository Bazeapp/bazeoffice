drop function if exists public.crm_pipeline_famiglie_board(integer, integer, text[], text);

create or replace function public.crm_pipeline_famiglie_board(
  p_limit integer default 5000,
  p_offset integer default 0,
  p_stage_filter text[] default null,
  p_search text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with search_input as (
    select nullif(
      regexp_replace(
        translate(
          lower(coalesce(p_search, '')),
          'àáâãäåèéêëìíîïòóôõöùúûüçñ',
          'aaaaaaeeeeiiiiooooouuuucn'
        ),
        '\s+',
        ' ',
        'g'
      ),
      ''
    ) as query
  ),
  search_tokens as (
    select coalesce(array_agg(token), array[]::text[]) as tokens
    from search_input si
    cross join lateral regexp_split_to_table(si.query, '\s+') as token
    where si.query is not null
      and token <> ''
  ),
  requested_processes as (
    select
      pm.id,
      pm.famiglia_id,
      pm.numero_ricerca_attivata,
      pm.stato_sales,
      pm.tipo_lavoro,
      pm.tipo_rapporto,
      pm.stato_res,
      pm.qualificazione_lead,
      pm.ore_settimanale,
      pm.numero_giorni_settimanali,
      pm.frequenza_rapporto,
      pm.sales_cold_call_followup,
      pm.data_per_ricerca_futura,
      pm.preventivo_firmato,
      pm.aggiornato_il
    from public.processi_matching pm
    left join public.famiglie f on f.id = pm.famiglia_id
    cross join search_input si
    cross join search_tokens st
    where (
        coalesce(cardinality(p_stage_filter), 0) = 0
        or pm.stato_sales::text = any(p_stage_filter)
      )
      and (
        si.query is null
        or not exists (
          select 1
          from unnest(st.tokens) as token
          where translate(
            lower(
              concat_ws(
                ' ',
                pm.id::text,
                pm.numero_ricerca_attivata,
                pm.stato_sales::text,
                pm.tipo_lavoro::text,
                pm.tipo_rapporto::text,
                pm.stato_res::text,
                f.nome,
                f.cognome,
                concat_ws(' ', f.nome, f.cognome),
                f.email,
                f.telefono
              )
            ),
            'àáâãäåèéêëìíîïòóôõöùúûüçñ',
            'aaaaaaeeeeiiiiooooouuuucn'
          ) not like '%' || token || '%'
        )
      )
    order by pm.aggiornato_il desc nulls last
    limit least(greatest(coalesce(p_limit, 5000), 0), 50000)
    offset greatest(coalesce(p_offset, 0), 0)
  ),
  enriched_processes as (
    select
      rp.aggiornato_il,
      jsonb_build_object(
        'id', rp.id,
        'famiglia_id', rp.famiglia_id,
        'numero_ricerca_attivata', rp.numero_ricerca_attivata,
        'stato_sales', rp.stato_sales,
        'tipo_lavoro', rp.tipo_lavoro,
        'tipo_rapporto', rp.tipo_rapporto,
        'stato_res', rp.stato_res,
        'qualificazione_lead', rp.qualificazione_lead,
        'ore_settimanale', rp.ore_settimanale,
        'numero_giorni_settimanali', rp.numero_giorni_settimanali,
        'frequenza_rapporto', rp.frequenza_rapporto,
        'sales_cold_call_followup', rp.sales_cold_call_followup,
        'data_per_ricerca_futura', rp.data_per_ricerca_futura,
        'preventivo_firmato', rp.preventivo_firmato
      ) as process_json,
      case
        when f.id is null then null
        else jsonb_build_object(
          'id', f.id,
          'nome', f.nome,
          'cognome', f.cognome,
          'email', f.email,
          'telefono', f.telefono,
          'creato_il', f.creato_il,
          'data_call_prenotata', f.data_call_prenotata
        )
      end as family_json
    from requested_processes rp
    left join public.famiglie f on f.id = rp.famiglia_id
  ),
  stage_counts as (
    select
      coalesce(pm.stato_sales::text, '') as value,
      count(*)::integer as count
    from public.processi_matching pm
    group by pm.stato_sales
  )
  select jsonb_build_object(
    'rows',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'process', ep.process_json,
              'family', ep.family_json,
              'address', null,
              'richiesta_attivazione', null
            )
            order by ep.aggiornato_il desc nulls last
          )
          from enriched_processes ep
        ),
        '[]'::jsonb
      ),
    'stage_counts',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'value', sc.value,
              'count', sc.count
            )
            order by sc.value
          )
          from stage_counts sc
        ),
        '[]'::jsonb
      )
  );
$$;

grant execute on function public.crm_pipeline_famiglie_board(integer, integer, text[], text) to anon, authenticated;
