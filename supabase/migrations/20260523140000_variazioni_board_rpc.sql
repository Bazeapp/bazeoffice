-- Variazioni (Gestione contrattuale) board RPC.
-- Replaces the client-side cascade in use-variazioni-board.ts. Returns both the
-- variazione cards (with resolved rapporto/famiglia/lavoratore + worker address)
-- and the full rapporti list used to populate the "collega rapporto" dropdown.
-- Stage resolution stays client-side via lookup_values.
-- Read-only, SECURITY DEFINER, granted to anon + authenticated.

create index if not exists idx_variazioni_contrattuali_rapporto_lavorativo_id
  on public.variazioni_contrattuali (rapporto_lavorativo_id);

create index if not exists idx_indirizzi_entita
  on public.indirizzi (entita_tabella, entita_id);

drop function if exists public.variazioni_board();

create or replace function public.variazioni_board()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with rap as (
    select
      rl.id, rl.stato_assunzione, rl.stato_servizio, rl.fine_rapporto_lavorativo_id,
      rl.tipo_rapporto, rl.tipo_contratto, rl.ore_a_settimana, rl.paga_oraria_lorda,
      rl.data_inizio_rapporto, rl.cognome_nome_datore_proper, rl.famiglia_id,
      rl.lavoratore_id, rl.nome_lavoratore_per_url, rl.aggiornato_il
    from public.rapporti_lavorativi rl
  )
  select jsonb_build_object(
    'cards',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'record', jsonb_build_object(
                'id', v.id,
                'accordo_variazione_contrattuale', v.accordo_variazione_contrattuale,
                'rapporto_lavorativo_id', v.rapporto_lavorativo_id,
                'ricevuta_inps_variazione_rapporto', v.ricevuta_inps_variazione_rapporto,
                'stato', v.stato,
                'data_variazione', v.data_variazione,
                'variazione_da_applicare', v.variazione_da_applicare
              ),
              'rapporto', case when r.id is null then null else to_jsonb(r) end,
              'famiglia', case when f.id is null then null else jsonb_build_object(
                'id', f.id, 'nome', f.nome, 'cognome', f.cognome, 'email', f.email,
                'customer_email', f.customer_email, 'secondary_email', f.secondary_email,
                'telefono', f.telefono, 'whatsapp', f.whatsapp
              ) end,
              'lavoratore', case when l.id is null then null else jsonb_build_object(
                'id', l.id, 'nome', l.nome, 'cognome', l.cognome, 'email', l.email,
                'telefono', l.telefono, 'iban', l.iban, 'provincia', l.provincia,
                'documenti_in_regola', l.documenti_in_regola,
                'docs_scadenza_permesso_di_soggiorno', l.docs_scadenza_permesso_di_soggiorno
              ) end,
              'lavoratoreAddress', case when addr.entita_id is null then null else jsonb_build_object(
                'tipo_indirizzo', addr.tipo_indirizzo, 'via', addr.via, 'civico', addr.civico,
                'cap', addr.cap, 'citta', addr.citta, 'provincia', addr.provincia,
                'indirizzo_formattato', addr.indirizzo_formattato, 'note', addr.note
              ) end
            )
            order by v.aggiornato_il desc nulls last
          )
          from public.variazioni_contrattuali v
          left join rap r on r.id = v.rapporto_lavorativo_id
          left join public.famiglie f on f.id = r.famiglia_id
          left join public.lavoratori l on l.id = r.lavoratore_id
          left join lateral (
            select i.*
            from public.indirizzi i
            where i.entita_tabella = 'lavoratori' and i.entita_id = l.id::text
            order by
              case lower(coalesce(i.tipo_indirizzo, ''))
                when 'residenza' then 0 when 'domicilio' then 1 else 2 end,
              i.aggiornato_il desc nulls last
            limit 1
          ) addr on true
        ),
        '[]'::jsonb
      ),
    'rapporti',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'rapporto', to_jsonb(r),
              'famiglia', case when f.id is null then null else jsonb_build_object('id', f.id, 'nome', f.nome, 'cognome', f.cognome) end,
              'lavoratore', case when l.id is null then null else jsonb_build_object('id', l.id, 'nome', l.nome, 'cognome', l.cognome) end
            )
          )
          from rap r
          left join public.famiglie f on f.id = r.famiglia_id
          left join public.lavoratori l on l.id = r.lavoratore_id
        ),
        '[]'::jsonb
      )
  );
$$;

grant execute on function public.variazioni_board() to anon, authenticated;
