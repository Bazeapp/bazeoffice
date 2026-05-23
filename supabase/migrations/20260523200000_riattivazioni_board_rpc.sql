-- Riattivazioni board RPC.
-- Replaces use-riattivazioni-board.ts cascade: chiusure with rapporto +
-- famiglia + lavoratore resolved (rapporto preferred by fine_rapporto_lavorativo_id,
-- fallback by ticket_id). Stage filtering stays client-side.
-- Read-only, SECURITY DEFINER, granted to anon + authenticated.

drop function if exists public.riattivazioni_board();

create or replace function public.riattivazioni_board()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with rap as (
    select rl.id, rl.ticket_id, rl.famiglia_id, rl.lavoratore_id, rl.stato_assunzione,
      rl.stato_servizio, rl.fine_rapporto_lavorativo_id, rl.tipo_rapporto, rl.tipo_contratto,
      rl.ore_a_settimana, rl.data_inizio_rapporto, rl.cognome_nome_datore_proper,
      rl.nome_lavoratore_per_url
    from public.rapporti_lavorativi rl
  )
  select jsonb_build_object(
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'record', jsonb_build_object(
          'id', c.id, 'ticket_id', c.ticket_id, 'stato', c.stato,
          'stato_riattivazione_famiglia', c.stato_riattivazione_famiglia,
          'nome', c.nome, 'cognome', c.cognome, 'allegato_compilato', c.allegato_compilato,
          'check_8_giorni_di_lavoro_svolti', c.check_8_giorni_di_lavoro_svolti,
          'check_chiusura_istantanea', c.check_chiusura_istantanea,
          'creato_il', c.creato_il, 'email', c.email,
          'informazioni_aggiuntive', c.informazioni_aggiuntive,
          'motivazione_cessazione_rapporto', c.motivazione_cessazione_rapporto,
          'motivazione_lost', c.motivazione_lost,
          'data_fine_rapporto', c.data_fine_rapporto,
          'data_per_riattivazione', c.data_per_riattivazione,
          'documenti_chiusura_rapporto', c.documenti_chiusura_rapporto,
          'presenze_ultimo_mese', c.presenze_ultimo_mese,
          'sconto_proposto_riattivazione', c.sconto_proposto_riattivazione,
          'tipo_licenziamento', c.tipo_licenziamento, 'tipo_decesso', c.tipo_decesso
        ),
        'rapporto', case when r.id is null then null else to_jsonb(r) end,
        'famiglia', case when f.id is null then null else jsonb_build_object(
          'id', f.id, 'nome', f.nome, 'cognome', f.cognome, 'email', f.email
        ) end,
        'lavoratore', case when l.id is null then null else jsonb_build_object(
          'id', l.id, 'nome', l.nome, 'cognome', l.cognome, 'email', l.email
        ) end
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
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.riattivazioni_board() to anon, authenticated;
