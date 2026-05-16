drop function if exists public.crm_pipeline_famiglie_board(integer, integer);
drop function if exists public.crm_pipeline_famiglie_board(integer, integer, text[]);
drop function if exists public.crm_pipeline_famiglia_detail(uuid);

create or replace function public.crm_pipeline_famiglie_board(
  p_limit integer default 5000,
  p_offset integer default 0,
  p_stage_filter text[] default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with requested_processes as (
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
    where coalesce(cardinality(p_stage_filter), 0) = 0
      or pm.stato_sales::text = any(p_stage_filter)
    order by pm.aggiornato_il desc nulls last
    limit least(greatest(coalesce(p_limit, 5000), 0), 5000)
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

create or replace function public.crm_pipeline_famiglia_detail(
  p_process_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with requested_process as (
    select
      pm.id,
      pm.famiglia_id,
      pm.numero_ricerca_attivata,
      pm.stato_sales,
      pm.tipo_lavoro,
      pm.tipo_rapporto,
      pm.stato_res,
      pm.qualificazione_lead,
      pm.motivo_no_match,
      pm.modello_smartmatching,
      pm.ore_settimanale,
      pm.numero_giorni_settimanali,
      pm.frequenza_rapporto,
      pm.preferenza_giorno,
      pm.sales_cold_call_followup,
      pm.sales_no_show_followup,
      pm.motivazione_lost,
      pm.motivazione_oot,
      pm.appunti_chiamata_sales,
      pm.data_per_ricerca_futura,
      pm.preventivo_firmato,
      pm.source_url,
      pm.offerta,
      pm.orario_di_lavoro,
      pm.nucleo_famigliare,
      pm.descrizione_casa,
      pm.metratura_casa,
      pm.descrizione_animali_in_casa,
      pm.mansioni_richieste,
      pm.informazioni_extra_riservate,
      pm.eta_minima,
      pm.eta_massima,
      pm.indirizzo_prova_provincia,
      pm.indirizzo_prova_cap,
      pm.indirizzo_prova_note,
      pm.indirizzo_prova_via,
      pm.indirizzo_prova_civico,
      pm.indirizzo_prova_comune,
      pm.indirizzo_prova_citofono,
      pm.src_embed_maps_annucio,
      pm.deadline_mobile,
      pm.disponibilita_colloqui_in_presenza,
      pm.family_availability_json,
      pm.tipo_incontro_famiglia_lavoratore,
      pm.richiesta_patente,
      pm.richiesta_trasferte,
      pm.richiesta_ferie,
      pm.descrizione_richiesta_trasferte,
      pm.descrizione_richiesta_ferie,
      pm.patente,
      pm.sesso,
      pm.testo_annuncio_whatsapp
    from public.processi_matching pm
    where pm.id = p_process_id
    limit 1
  ),
  process_address as (
    select distinct on (i.entita_id)
      i.entita_id,
      i.tipo_indirizzo,
      i.via,
      i.civico,
      i.cap,
      i.citta,
      i.provincia,
      i.indirizzo_formattato,
      i.note
    from public.indirizzi i
    join requested_process rp on rp.id::text = i.entita_id
    where i.entita_tabella = 'processi_matching'
      and i.tipo_indirizzo in ('luogo', 'prova')
    order by
      i.entita_id,
      case when lower(coalesce(i.tipo_indirizzo, '')) = 'luogo' then 0 else 1 end,
      i.aggiornato_il desc nulls last
  )
  select coalesce(
    (
      select jsonb_build_object(
        'process', to_jsonb(rp),
        'family',
          case
            when f.id is null then null
            else jsonb_build_object(
              'id', f.id,
              'nome', f.nome,
              'cognome', f.cognome,
              'email', f.email,
              'telefono', f.telefono,
              'creato_il', f.creato_il,
              'data_call_prenotata', f.data_call_prenotata,
              'aggiornato_il', f.aggiornato_il
            )
          end,
        'address',
          case
            when address_row.entita_id is null then null
            else jsonb_build_object(
              'entita_id', address_row.entita_id,
              'tipo_indirizzo', address_row.tipo_indirizzo,
              'via', address_row.via,
              'civico', address_row.civico,
              'cap', address_row.cap,
              'citta', address_row.citta,
              'provincia', address_row.provincia,
              'indirizzo_formattato', address_row.indirizzo_formattato,
              'note', address_row.note
            )
          end,
        'richiesta_attivazione',
          case
            when ra.id is null then null
            else jsonb_build_object(
              'id', ra.id,
              'email', ra.email,
              'fee_concordata', ra.fee_concordata,
              'firmatario', ra.firmatario,
              'processo_res_id', ra.processo_res_id,
              'signed_document_title', ra.signed_document_title,
              'signed_document_url', ra.signed_document_url,
              'aggiornato_il', ra.aggiornato_il
            )
          end
      )
      from requested_process rp
      left join public.famiglie f on f.id = rp.famiglia_id
      left join process_address address_row on address_row.entita_id = rp.id::text
      left join lateral (
        select
          r.id,
          r.email,
          r.fee_concordata,
          r.firmatario,
          r.processo_res_id,
          r.signed_document_title,
          r.signed_document_url,
          r.aggiornato_il
        from public.richieste_attivazione r
        where r.processo_res_id = rp.id
        order by r.aggiornato_il desc nulls last
        limit 1
      ) ra on true
    ),
    '{}'::jsonb
  );
$$;

grant execute on function public.crm_pipeline_famiglie_board(integer, integer, text[]) to anon, authenticated;
grant execute on function public.crm_pipeline_famiglia_detail(uuid) to anon, authenticated;
