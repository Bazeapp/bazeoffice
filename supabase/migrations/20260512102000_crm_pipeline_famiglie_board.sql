create or replace function public.crm_pipeline_famiglie_board(
  p_limit integer default 5000,
  p_offset integer default 0
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
      pm.testo_annuncio_whatsapp,
      pm.aggiornato_il
    from public.processi_matching pm
    order by pm.aggiornato_il desc nulls last
    limit least(greatest(coalesce(p_limit, 1000), 0), 1000)
    offset greatest(coalesce(p_offset, 0), 0)
  ),
  process_addresses as (
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
    join requested_processes rp on rp.id::text = i.entita_id
    where i.entita_tabella = 'processi_matching'
      and i.tipo_indirizzo in ('luogo', 'prova')
    order by
      i.entita_id,
      case when lower(coalesce(i.tipo_indirizzo, '')) = 'luogo' then 0 else 1 end,
      i.aggiornato_il desc nulls last
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
        'motivo_no_match', rp.motivo_no_match,
        'modello_smartmatching', rp.modello_smartmatching,
        'ore_settimanale', rp.ore_settimanale,
        'numero_giorni_settimanali', rp.numero_giorni_settimanali,
        'frequenza_rapporto', rp.frequenza_rapporto,
        'preferenza_giorno', rp.preferenza_giorno,
        'sales_cold_call_followup', rp.sales_cold_call_followup,
        'sales_no_show_followup', rp.sales_no_show_followup,
        'motivazione_lost', rp.motivazione_lost,
        'motivazione_oot', rp.motivazione_oot,
        'appunti_chiamata_sales', rp.appunti_chiamata_sales,
        'data_per_ricerca_futura', rp.data_per_ricerca_futura,
        'preventivo_firmato', rp.preventivo_firmato,
        'orario_di_lavoro', rp.orario_di_lavoro,
        'nucleo_famigliare', rp.nucleo_famigliare,
        'descrizione_casa', rp.descrizione_casa,
        'metratura_casa', rp.metratura_casa,
        'descrizione_animali_in_casa', rp.descrizione_animali_in_casa,
        'mansioni_richieste', rp.mansioni_richieste,
        'informazioni_extra_riservate', rp.informazioni_extra_riservate,
        'eta_minima', rp.eta_minima,
        'eta_massima', rp.eta_massima,
        'indirizzo_prova_provincia', rp.indirizzo_prova_provincia,
        'indirizzo_prova_cap', rp.indirizzo_prova_cap,
        'indirizzo_prova_note', rp.indirizzo_prova_note,
        'indirizzo_prova_via', rp.indirizzo_prova_via,
        'indirizzo_prova_civico', rp.indirizzo_prova_civico,
        'indirizzo_prova_comune', rp.indirizzo_prova_comune,
        'indirizzo_prova_citofono', rp.indirizzo_prova_citofono,
        'src_embed_maps_annucio', rp.src_embed_maps_annucio,
        'deadline_mobile', rp.deadline_mobile,
        'disponibilita_colloqui_in_presenza', rp.disponibilita_colloqui_in_presenza,
        'family_availability_json', rp.family_availability_json,
        'tipo_incontro_famiglia_lavoratore', rp.tipo_incontro_famiglia_lavoratore,
        'richiesta_patente', rp.richiesta_patente,
        'richiesta_trasferte', rp.richiesta_trasferte,
        'richiesta_ferie', rp.richiesta_ferie,
        'descrizione_richiesta_trasferte', rp.descrizione_richiesta_trasferte,
        'descrizione_richiesta_ferie', rp.descrizione_richiesta_ferie,
        'patente', rp.patente,
        'sesso', rp.sesso,
        'testo_annuncio_whatsapp', rp.testo_annuncio_whatsapp
      ) || jsonb_build_object(
        'source_url', rp.source_url,
        'offerta', rp.offerta
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
          'data_call_prenotata', f.data_call_prenotata,
          'aggiornato_il', f.aggiornato_il
        )
      end as family_json,
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
      end as address_json
    from requested_processes rp
    left join public.famiglie f on f.id = rp.famiglia_id
    left join process_addresses address_row on address_row.entita_id = rp.id::text
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
              'address', ep.address_json
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

grant execute on function public.crm_pipeline_famiglie_board(integer, integer) to anon, authenticated;
