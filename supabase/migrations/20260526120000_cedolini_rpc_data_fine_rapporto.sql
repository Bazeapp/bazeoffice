-- Expose data_fine_rapporto (from chiusure_contratti) on the cedolino RPCs so
-- the payroll UI can show "Data fine rapporto" alongside the cedolino when the
-- rapporto has a chiusura collegata.
--
-- The column lives on public.chiusure_contratti and is reached via
-- rapporti_lavorativi.fine_rapporto_lavorativo_id. Both cedolini_board and
-- cedolino_detail merge it into the `rapporto` payload.

drop function if exists public.cedolini_board(text);

create or replace function public.cedolini_board(
  p_year_month text
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with params as (
    select
      make_date(
        split_part(p_year_month, '-', 1)::int,
        split_part(p_year_month, '-', 2)::int,
        1
      ) as month_start,
      (
        make_date(
          split_part(p_year_month, '-', 1)::int,
          split_part(p_year_month, '-', 2)::int,
          1
        ) + interval '1 month - 1 day'
      )::date as month_end
  ),
  month_ids as (
    select mc.id
    from public.mesi_calendario mc
    cross join params p
    where mc.data_inizio is not null
      and mc.data_inizio >= p.month_start
      and mc.data_inizio <= p.month_end
  ),
  base as (
    select ml.*
    from public.mesi_lavorati ml
    where ml.mese_id in (select id from month_ids)
  ),
  tx as (
    select distinct on (t.mese_lavorativo_id)
      t.id,
      t.mese_lavorativo_id
    from public.transazioni_finanziarie t
    where t.mese_lavorativo_id in (select id from base)
    order by t.mese_lavorativo_id, t.creato_il desc
  ),
  pay as (
    select distinct on (p.transazione_id)
      p.id,
      p.amount,
      p.charge_id,
      p.data_ora_di_pagamento,
      p.famiglia_id,
      p.fattura_url,
      p.fee,
      p.numero_fattura,
      p.payment_intent_id,
      p.status,
      p.ticket_id,
      p.transazione_id,
      p.type_of_payment
    from public.pagamenti p
    where p.transazione_id in (select id from tx)
    order by p.transazione_id, p.creato_il desc
  )
  select jsonb_build_object(
    'rows',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'record', jsonb_build_object(
                'id', b.id,
                'mese_id', b.mese_id,
                'rapporto_lavorativo_id', b.rapporto_lavorativo_id,
                'presenze_id', b.presenze_id,
                'presenze_regolare_id', b.presenze_regolare_id,
                'stato_mese_lavorativo', b.stato_mese_lavorativo,
                'importo_busta_estratto', b.importo_busta_estratto,
                'data_invio_famiglia', b.data_invio_famiglia,
                'data_ora_creazione', b.data_ora_creazione,
                'caso_particolare', b.caso_particolare,
                'cedolino', b.cedolino,
                'cedolino_url', b.cedolino_url,
                'ore_contratto_mese', b.ore_contratto_mese,
                'ore_lavorate_estratte', b.ore_lavorate_estratte,
                'cedolino_corretto', b.cedolino_corretto,
                'note', b.note,
                'rating_feedback_famiglia', b.rating_feedback_famiglia,
                'testo_feedback_famiglia', b.testo_feedback_famiglia
              ),
              'mese', case when mc.id is null then null else jsonb_build_object(
                'id', mc.id,
                'data_inizio', mc.data_inizio,
                'data_fine', mc.data_fine,
                'mese_lavorativo_copy', mc.mese_lavorativo_copy
              ) end,
              'rapporto', case when rl.id is null then null else jsonb_build_object(
                'id', rl.id,
                'famiglia_id', rl.famiglia_id,
                'lavoratore_id', rl.lavoratore_id,
                'creata', rl.creata,
                'codice_datore_webcolf', rl.codice_datore_webcolf,
                'codice_dipendente_webcolf', rl.codice_dipendente_webcolf,
                'cognome_nome_datore_proper', rl.cognome_nome_datore_proper,
                'nome_lavoratore_per_url', rl.nome_lavoratore_per_url,
                'ore_a_settimana', rl.ore_a_settimana,
                'data_inizio_rapporto', rl.data_inizio_rapporto,
                'data_fine_rapporto', cc.data_fine_rapporto,
                'fine_rapporto_lavorativo_id', rl.fine_rapporto_lavorativo_id,
                'stato_servizio', rl.stato_servizio,
                'tipo_rapporto', rl.tipo_rapporto,
                'tipo_contratto', rl.tipo_contratto
              ) end,
              'famiglia', case when f.id is null then null else jsonb_build_object(
                'id', f.id,
                'nome', f.nome,
                'cognome', f.cognome,
                'email', f.email,
                'customer_email', f.customer_email
              ) end,
              'lavoratore', case when l.id is null then null else jsonb_build_object(
                'id', l.id,
                'nome', l.nome,
                'cognome', l.cognome
              ) end,
              'transazione', case when tx.id is null then null else jsonb_build_object(
                'id', tx.id,
                'mese_lavorativo_id', tx.mese_lavorativo_id
              ) end,
              'pagamento', case when pay.id is null then null else jsonb_build_object(
                'id', pay.id,
                'amount', pay.amount,
                'charge_id', pay.charge_id,
                'data_ora_di_pagamento', pay.data_ora_di_pagamento,
                'famiglia_id', pay.famiglia_id,
                'fattura_url', pay.fattura_url,
                'fee', pay.fee,
                'numero_fattura', pay.numero_fattura,
                'payment_intent_id', pay.payment_intent_id,
                'status', pay.status,
                'ticket_id', pay.ticket_id,
                'transazione_id', pay.transazione_id,
                'type_of_payment', pay.type_of_payment
              ) end
            )
            order by b.creato_il desc
          )
          from base b
          left join public.mesi_calendario mc on mc.id = b.mese_id
          left join public.rapporti_lavorativi rl on rl.id = b.rapporto_lavorativo_id
          left join public.chiusure_contratti cc on cc.id = rl.fine_rapporto_lavorativo_id
          left join public.famiglie f on f.id = rl.famiglia_id
          left join public.lavoratori l on l.id = rl.lavoratore_id
          left join tx on tx.mese_lavorativo_id = b.id
          left join pay on pay.transazione_id = tx.id
        ),
        '[]'::jsonb
      ),
    'total', (select count(*)::integer from base)
  );
$$;

drop function if exists public.cedolino_detail(uuid);

create or replace function public.cedolino_detail(
  p_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when ml.id is null then null else jsonb_build_object(
    'record', to_jsonb(ml),
    'rapporto', (
      select to_jsonb(rl)
        || jsonb_build_object('data_fine_rapporto', cc.data_fine_rapporto)
      from public.rapporti_lavorativi rl
      left join public.chiusure_contratti cc on cc.id = rl.fine_rapporto_lavorativo_id
      where rl.id = ml.rapporto_lavorativo_id
    ),
    'famiglia', (
      select to_jsonb(f)
      from public.famiglie f
      where f.id = (
        select rl.famiglia_id from public.rapporti_lavorativi rl where rl.id = ml.rapporto_lavorativo_id
      )
    ),
    'mese', (select to_jsonb(mc) from public.mesi_calendario mc where mc.id = ml.mese_id),
    'presenze', (select to_jsonb(pm) from public.presenze_mensili pm where pm.id = ml.presenze_id),
    'presenzeRegolari', (select to_jsonb(pm) from public.presenze_mensili pm where pm.id = ml.presenze_regolare_id)
  ) end
  from public.mesi_lavorati ml
  where ml.id = p_id;
$$;

grant execute on function public.cedolini_board(text) to anon, authenticated;
grant execute on function public.cedolino_detail(uuid) to anon, authenticated;
