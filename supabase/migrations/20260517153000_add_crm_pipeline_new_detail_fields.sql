alter table public.processi_matching
  add column if not exists nazionalita_escluse text[],
  add column if not exists nazionalita_obbligatorie text[],
  add column if not exists famiglia_molto_esigente boolean,
  add column if not exists richiesta_autonomia boolean,
  add column if not exists datore_spesso_presente boolean,
  add column if not exists richiesta_discrezione boolean,
  add column if not exists comunicare_bene_italiano boolean,
  add column if not exists comunicare_bene_inglese boolean,
  add column if not exists presenza_neonati boolean,
  add column if not exists piu_bambini boolean,
  add column if not exists famiglia_4_persone boolean,
  add column if not exists cani_piccoli boolean,
  add column if not exists cani_grandi boolean,
  add column if not exists gatti boolean,
  add column if not exists pulire_ripiani_alti boolean,
  add column if not exists stirare boolean,
  add column if not exists stirare_abiti_difficili boolean,
  add column if not exists cucinare boolean,
  add column if not exists cucinare_elaborato boolean,
  add column if not exists cura_piante boolean;

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
    select pm.*
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

grant execute on function public.crm_pipeline_famiglia_detail(uuid) to anon, authenticated;
