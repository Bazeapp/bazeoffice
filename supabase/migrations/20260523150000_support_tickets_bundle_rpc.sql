-- Support tickets (Customer + Payroll) bundle RPC.
-- Replaces the 13-call client cascade in use-support-tickets-board.ts with a
-- single call that returns all raw arrays. The intricate client-side assembly
-- (rapporto resolution, linked-record cards, optimistic patch/create) is left
-- untouched and simply sourced from this bundle.
--
-- p_tipo: 'Customer' or 'Payroll' (matches normalizeTicketType on the client).
-- Read-only, SECURITY DEFINER, granted to anon + authenticated.

create index if not exists idx_ticket_tipo on public.ticket (tipo);
create index if not exists idx_chiusure_contratti_ticket_id on public.chiusure_contratti (ticket_id);
create index if not exists idx_contributi_inps_ticket_id on public.contributi_inps (ticket_id);
create index if not exists idx_mesi_lavorati_ticket_id on public.mesi_lavorati (ticket_id);
create index if not exists idx_pagamenti_ticket_id on public.pagamenti (ticket_id);
create index if not exists idx_presenze_mensili_ticket_id on public.presenze_mensili (ticket_id);
create index if not exists idx_variazioni_contrattuali_ticket_id on public.variazioni_contrattuali (ticket_id);

drop function if exists public.support_tickets_bundle(text);

create or replace function public.support_tickets_bundle(
  p_tipo text
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with ft as (
    select t.*
    from public.ticket t
    where (
      (p_tipo = 'Customer' and lower(trim(coalesce(t.tipo, ''))) in ('customer', 'customer support'))
      or (p_tipo = 'Payroll' and lower(trim(coalesce(t.tipo, ''))) in ('payroll', 'consulenza lavoro'))
    )
  ),
  rap as (
    select
      rl.id, rl.id_rapporto, rl.ticket_id, rl.famiglia_id, rl.lavoratore_id,
      rl.stato_assunzione, rl.stato_servizio, rl.fine_rapporto_lavorativo_id,
      rl.assunzione_datore_id, rl.assunzione_lavoratore_id, rl.tipo_rapporto,
      rl.tipo_contratto, rl.data_inizio_rapporto, rl.cognome_nome_datore_proper,
      rl.nome_lavoratore_per_url
    from public.rapporti_lavorativi rl
  ),
  pagamenti as (
    select p.id, p.amount, p.currency, p.customer_email, p.data_ora_di_pagamento,
      p.famiglia_id, p.numero_fattura, p.status, p.ticket_id, p.type_of_payment
    from public.pagamenti p
    where p.ticket_id in (select id from ft)
      or p.id in (select pagamenti_id from ft where pagamenti_id is not null)
  )
  select jsonb_build_object(
    'tickets', (select coalesce(jsonb_agg(to_jsonb(ft) order by ft.data_apertura desc nulls last), '[]'::jsonb) from ft),
    'rapporti', (select coalesce(jsonb_agg(to_jsonb(rap)), '[]'::jsonb) from rap),
    'pagamenti', (select coalesce(jsonb_agg(to_jsonb(pagamenti)), '[]'::jsonb) from pagamenti),
    'chiusure', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id, 'ticket_id', c.ticket_id, 'stato', c.stato, 'nome', c.nome, 'cognome', c.cognome,
        'creato_il', c.creato_il, 'data_fine_rapporto', c.data_fine_rapporto, 'email', c.email,
        'informazioni_aggiuntive', c.informazioni_aggiuntive, 'motivazione_cessazione_rapporto', c.motivazione_cessazione_rapporto,
        'presenze_ultimo_mese', c.presenze_ultimo_mese, 'tipo_licenziamento', c.tipo_licenziamento, 'tipo_decesso', c.tipo_decesso
      )), '[]'::jsonb)
      from public.chiusure_contratti c
      where c.ticket_id in (select id from ft) or c.id in (select chiusura_id from ft where chiusura_id is not null)
    ),
    'assunzioni', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', a.id, 'info_anagrafiche_nome', a.info_anagrafiche_nome, 'info_anagrafiche_cognome', a.info_anagrafiche_cognome,
        'info_anagrafiche_email', a.info_anagrafiche_email, 'type_of_compilazione_form', a.type_of_compilazione_form
      )), '[]'::jsonb)
      from public.assunzioni a
      where a.id in (select assunzione_id from ft where assunzione_id is not null)
    ),
    'contributi', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ci.id, 'data_invio_famiglia', ci.data_invio_famiglia, 'data_ora_creazione', ci.data_ora_creazione,
        'importo_contributi_inps', ci.importo_contributi_inps, 'rapporto_lavorativo_id', ci.rapporto_lavorativo_id,
        'stato_contributi_inps', ci.stato_contributi_inps, 'ticket_id', ci.ticket_id, 'trimestre_id', ci.trimestre_id
      )), '[]'::jsonb)
      from public.contributi_inps ci
      where ci.ticket_id in (select id from ft) or ci.id in (select contributi_id from ft where contributi_id is not null)
    ),
    'cedolini', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id, 'caso_particolare', m.caso_particolare, 'data_invio_famiglia', m.data_invio_famiglia,
        'data_ora_creazione', m.data_ora_creazione, 'importo_busta_estratto', m.importo_busta_estratto,
        'mese_id', m.mese_id, 'rapporto_lavorativo_id', m.rapporto_lavorativo_id,
        'stato_mese_lavorativo', m.stato_mese_lavorativo, 'ticket_id', m.ticket_id
      )), '[]'::jsonb)
      from public.mesi_lavorati m
      where m.ticket_id in (select id from ft) or m.id in (select cedolino_id from ft where cedolino_id is not null)
    ),
    'presenze', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', pm.id, 'presenze_mensili', pm.presenze_mensili, 'data_ora_creazione', pm.data_ora_creazione,
        'note_interne', pm.note_interne, 'ticket_id', pm.ticket_id
      )), '[]'::jsonb)
      from public.presenze_mensili pm
      where pm.ticket_id in (select id from ft) or pm.id in (select presenze_id from ft where presenze_id is not null)
    ),
    'variazioni', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', v.id, 'data_variazione', v.data_variazione, 'rapporto_lavorativo_id', v.rapporto_lavorativo_id,
        'stato', v.stato, 'ticket_id', v.ticket_id, 'variazione_da_applicare', v.variazione_da_applicare
      )), '[]'::jsonb)
      from public.variazioni_contrattuali v
      where v.ticket_id in (select id from ft) or v.id in (select variazione_id from ft where variazione_id is not null)
    ),
    'famiglie', (
      select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'nome', f.nome, 'cognome', f.cognome)), '[]'::jsonb)
      from public.famiglie f
      where f.id in (
        select famiglia_id from rap where famiglia_id is not null
        union
        select famiglia_id from pagamenti where famiglia_id is not null
      )
    ),
    'lavoratori', (
      select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'nome', l.nome, 'cognome', l.cognome)), '[]'::jsonb)
      from public.lavoratori l
      where l.id in (select lavoratore_id from rap where lavoratore_id is not null)
    )
  );
$$;

grant execute on function public.support_tickets_bundle(text) to anon, authenticated;
