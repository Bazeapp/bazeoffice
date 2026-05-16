create extension if not exists pg_trgm;

create index if not exists idx_rapporti_lavorativi_famiglia_id
  on public.rapporti_lavorativi (famiglia_id);

create index if not exists idx_rapporti_lavorativi_lavoratore_id
  on public.rapporti_lavorativi (lavoratore_id);

create index if not exists idx_rapporti_lavorativi_fine_id
  on public.rapporti_lavorativi (fine_rapporto_lavorativo_id);

create index if not exists idx_rapporti_lavorativi_status_dates
  on public.rapporti_lavorativi (stato_assunzione, data_inizio_rapporto desc, aggiornato_il desc);

create index if not exists idx_rapporti_lavorativi_datore_label_trgm
  on public.rapporti_lavorativi using gin (lower(coalesce(cognome_nome_datore_proper, '')) gin_trgm_ops);

create index if not exists idx_rapporti_lavorativi_lavoratore_label_trgm
  on public.rapporti_lavorativi using gin (lower(coalesce(nome_lavoratore_per_url, '')) gin_trgm_ops);

create index if not exists idx_rapporti_lavorativi_id_rapporto_trgm
  on public.rapporti_lavorativi using gin (lower(coalesce(id_rapporto, '')) gin_trgm_ops);

create index if not exists idx_famiglie_cognome_trgm
  on public.famiglie using gin (lower(coalesce(cognome, '')) gin_trgm_ops);

create index if not exists idx_famiglie_nome_trgm
  on public.famiglie using gin (lower(coalesce(nome, '')) gin_trgm_ops);

create index if not exists idx_famiglie_email_trgm
  on public.famiglie using gin (lower(coalesce(email, '')) gin_trgm_ops);

create index if not exists idx_famiglie_customer_email_trgm
  on public.famiglie using gin (lower(coalesce(customer_email, '')) gin_trgm_ops);

create index if not exists idx_famiglie_secondary_email_trgm
  on public.famiglie using gin (lower(coalesce(secondary_email, '')) gin_trgm_ops);

create index if not exists idx_famiglie_telefono_trgm
  on public.famiglie using gin (lower(coalesce(telefono, '')) gin_trgm_ops);

create index if not exists idx_lavoratori_cognome_trgm
  on public.lavoratori using gin (lower(coalesce(cognome, '')) gin_trgm_ops);

create index if not exists idx_lavoratori_nome_trgm
  on public.lavoratori using gin (lower(coalesce(nome, '')) gin_trgm_ops);

create index if not exists idx_lavoratori_email_trgm
  on public.lavoratori using gin (lower(coalesce(email, '')) gin_trgm_ops);

create index if not exists idx_lavoratori_telefono_trgm
  on public.lavoratori using gin (lower(coalesce(telefono, '')) gin_trgm_ops);

create index if not exists idx_ticket_rapporto_id
  on public.ticket (rapporto_id);

create index if not exists idx_contributi_inps_rapporto_id
  on public.contributi_inps (rapporto_lavorativo_id);

create index if not exists idx_mesi_lavorati_rapporto_id
  on public.mesi_lavorati (rapporto_lavorativo_id);

create index if not exists idx_variazioni_contrattuali_rapporto_id
  on public.variazioni_contrattuali (rapporto_lavorativo_id);

create index if not exists idx_pagamenti_ticket_id
  on public.pagamenti (ticket_id);

create index if not exists idx_richieste_attivazione_processo_res_id
  on public.richieste_attivazione (processo_res_id);

drop function if exists public.rapporti_lavorativi_board(integer, integer, text, text);

create or replace function public.rapporti_lavorativi_board(
  p_limit integer default 50,
  p_offset integer default 0,
  p_search text default null,
  p_status_filter text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with params as (
    select
      nullif(trim(p_search), '') as search_value,
      '%' || lower(nullif(trim(p_search), '')) || '%' as search_pattern,
      nullif(trim(p_status_filter), '') as status_filter,
      least(greatest(coalesce(p_limit, 50), 0), 100) as limit_value,
      greatest(coalesce(p_offset, 0), 0) as offset_value
  ),
  enriched as (
    select
      rl as rapporto,
      coalesce(nullif(trim(concat_ws(' ', f.cognome, f.nome)), ''), rl.cognome_nome_datore_proper) as famiglia_label,
      coalesce(nullif(trim(concat_ws(' ', l.cognome, l.nome)), ''), rl.nome_lavoratore_per_url) as lavoratore_label,
      lower(concat_ws(
        ' ',
        f.email,
        f.customer_email,
        f.secondary_email,
        f.telefono,
        f.whatsapp,
        l.email,
        l.telefono
      )) as related_search_text,
      c.data_fine_rapporto,
      case
        when lower(coalesce(rl.stato_assunzione, '')) in (
          'assunzione fatta',
          'documenti assunzione inviati',
          'contratto firmato'
        ) then
          case
            when c.data_fine_rapporto is not null
              and c.data_fine_rapporto::date < current_date
              then 'Terminato'
            else 'Attivo'
          end
        when lower(coalesce(rl.stato_assunzione, '')) in (
          'avviare pratica',
          'inviata richiesta dati',
          'in attesa di dati famiglia',
          'in attesa di dati lavoratore',
          'dati pronti per assunzione'
        ) then 'In attivazione'
        when lower(coalesce(rl.stato_assunzione, '')) = 'non assume con baze' then 'Sconosciuto'
        else 'Errore'
      end as stato_rapporto_resolved,
      rl.data_inizio_rapporto,
      rl.ultimo_aggiornamento,
      rl.aggiornato_il,
      rl.id
    from public.rapporti_lavorativi rl
    left join public.famiglie f on f.id = rl.famiglia_id
    left join public.lavoratori l on l.id = rl.lavoratore_id
    left join public.chiusure_contratti c on c.id = rl.fine_rapporto_lavorativo_id
  ),
  filtered as (
    select e.*
    from enriched e
    cross join params p
    where (p.status_filter is null or e.stato_rapporto_resolved = p.status_filter)
      and (
        p.search_value is null
        or lower((e.rapporto).id::text) like p.search_pattern
        or lower(coalesce((e.rapporto).id_rapporto, '')) like p.search_pattern
        or lower(coalesce((e.rapporto).cognome_nome_datore_proper, '')) like p.search_pattern
        or lower(coalesce((e.rapporto).nome_lavoratore_per_url, '')) like p.search_pattern
        or lower(coalesce((e.rapporto).codice_datore_webcolf::text, '')) like p.search_pattern
        or lower(coalesce((e.rapporto).codice_dipendente_webcolf::text, '')) like p.search_pattern
        or lower(coalesce(e.famiglia_label, '')) like p.search_pattern
        or lower(coalesce(e.lavoratore_label, '')) like p.search_pattern
        or e.related_search_text like p.search_pattern
        or lower(coalesce((e.rapporto).tipo_contratto, '')) like p.search_pattern
        or lower(coalesce((e.rapporto).tipo_rapporto, '')) like p.search_pattern
        or lower(coalesce((e.rapporto).stato_assunzione, '')) like p.search_pattern
      )
  ),
  counted as (
    select count(*)::integer as total
    from filtered
  ),
  paged as (
    select f.*
    from filtered f
    order by
      case f.stato_rapporto_resolved
        when 'In attivazione' then 0
        when 'Attivo' then 1
        when 'Terminato' then 2
        when 'Sconosciuto' then 3
        else 4
      end,
      f.data_inizio_rapporto desc nulls last,
      f.ultimo_aggiornamento desc nulls last,
      f.aggiornato_il desc nulls last,
      f.id
    limit (select limit_value from params)
    offset (select offset_value from params)
  )
  select jsonb_build_object(
    'rows',
      coalesce(
        (
          select jsonb_agg(
            to_jsonb(p.rapporto)
              || jsonb_build_object(
                'cognome_nome_datore_proper', p.famiglia_label,
                'nome_lavoratore_per_url', p.lavoratore_label,
                'data_fine_rapporto', p.data_fine_rapporto,
                'stato_rapporto', p.stato_rapporto_resolved
              )
            order by
              case p.stato_rapporto_resolved
                when 'In attivazione' then 0
                when 'Attivo' then 1
                when 'Terminato' then 2
                when 'Sconosciuto' then 3
                else 4
              end,
              p.data_inizio_rapporto desc nulls last,
              p.ultimo_aggiornamento desc nulls last,
              p.aggiornato_il desc nulls last,
              p.id
          )
          from paged p
        ),
        '[]'::jsonb
      ),
    'total', (select total from counted)
  );
$$;
