-- Chiusure (Gestione contrattuale) board RPC.
-- Replaces the cascade in use-chiusure-board.ts. Returns cards (per chiusura
-- with resolved rapporto + family/worker names) + rapporti list (for the
-- "collega rapporto" dropdown). Stage and tipo metadata resolved client-side.
-- Read-only, SECURITY DEFINER, granted to anon + authenticated.

create index if not exists idx_rapporti_lavorativi_fine_rapporto_lavorativo_id
  on public.rapporti_lavorativi (fine_rapporto_lavorativo_id);

create index if not exists idx_rapporti_lavorativi_ticket_id
  on public.rapporti_lavorativi (ticket_id);

drop function if exists public.chiusure_board();

create or replace function public.chiusure_board()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with rap as (
    select
      rl.id, rl.ticket_id, rl.stato_assunzione, rl.stato_servizio,
      rl.fine_rapporto_lavorativo_id, rl.tipo_rapporto, rl.tipo_contratto,
      rl.ore_a_settimana, rl.data_inizio_rapporto, rl.cognome_nome_datore_proper,
      rl.nome_lavoratore_per_url, rl.famiglia_id, rl.lavoratore_id,
      rl.assunzione_datore_id, rl.assunzione_lavoratore_id, rl.aggiornato_il
    from public.rapporti_lavorativi rl
  )
  select jsonb_build_object(
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'record', jsonb_build_object(
          'id', c.id, 'ticket_id', c.ticket_id, 'stato', c.stato, 'nome', c.nome,
          'cognome', c.cognome, 'allegato_compilato', c.allegato_compilato,
          'check_8_giorni_di_lavoro_svolti', c.check_8_giorni_di_lavoro_svolti,
          'check_chiusura_istantanea', c.check_chiusura_istantanea,
          'creato_il', c.creato_il, 'email', c.email,
          'informazioni_aggiuntive', c.informazioni_aggiuntive,
          'motivazione_cessazione_rapporto', c.motivazione_cessazione_rapporto,
          'data_fine_rapporto', c.data_fine_rapporto,
          'documenti_chiusura_rapporto', c.documenti_chiusura_rapporto,
          'presenze_ultimo_mese', c.presenze_ultimo_mese,
          'tipo_licenziamento', c.tipo_licenziamento, 'tipo_decesso', c.tipo_decesso
        ),
        'rapporto', case when r.id is null then null else to_jsonb(r) end,
        'famiglia', case when f.id is null then null else jsonb_build_object('id', f.id, 'nome', f.nome, 'cognome', f.cognome) end,
        'lavoratore', case when l.id is null then null else jsonb_build_object('id', l.id, 'nome', l.nome, 'cognome', l.cognome) end
      ) order by c.aggiornato_il desc nulls last)
      from public.chiusure_contratti c
      left join lateral (
        select * from rap
        where rap.fine_rapporto_lavorativo_id = c.id
           or (c.ticket_id is not null and rap.ticket_id = c.ticket_id)
        order by case when rap.fine_rapporto_lavorativo_id = c.id then 0 else 1 end
        limit 1
      ) r on true
      left join public.famiglie f on f.id = r.famiglia_id
      left join public.lavoratori l on l.id = r.lavoratore_id
    ), '[]'::jsonb),
    'rapporti', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rapporto', to_jsonb(r),
        'famiglia', case when f.id is null then null else jsonb_build_object('id', f.id, 'nome', f.nome, 'cognome', f.cognome) end,
        'lavoratore', case when l.id is null then null else jsonb_build_object('id', l.id, 'nome', l.nome, 'cognome', l.cognome) end
      ))
      from rap r
      left join public.famiglie f on f.id = r.famiglia_id
      left join public.lavoratori l on l.id = r.lavoratore_id
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.chiusure_board() to anon, authenticated;
