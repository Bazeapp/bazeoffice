-- Prove e Colloqui board RPC.
-- Replaces use-prove-colloqui-data.ts cascade: rapporti with prova_stato_cs not blank
-- (joined with famiglia + lavoratore) + selezioni in date range (joined with
-- processo + process famiglia + selection lavoratore). Stage/lookup metadata
-- resolved client-side via fetchLookupValues.
-- Read-only, SECURITY DEFINER, granted to anon + authenticated.

create index if not exists idx_rapporti_lavorativi_prova_stato_cs
  on public.rapporti_lavorativi (prova_stato_cs);

create index if not exists idx_selezioni_lavoratori_data_colloquio
  on public.selezioni_lavoratori (data_ora_colloquio_famiglia_lavoratore);

drop function if exists public.prove_colloqui_board(timestamptz, timestamptz);

create or replace function public.prove_colloqui_board(
  p_start_date timestamptz,
  p_end_date timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'rapporti', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rapporto', jsonb_build_object(
          'id', r.id, 'famiglia_id', r.famiglia_id, 'lavoratore_id', r.lavoratore_id,
          'processi_matching_id', r.processi_matching_id,
          'cognome_nome_datore_proper', r.cognome_nome_datore_proper,
          'nome_lavoratore_per_url', r.nome_lavoratore_per_url,
          'data_inizio_rapporto', r.data_inizio_rapporto,
          'distribuzione_ore_settimana', r.distribuzione_ore_settimana,
          'ore_a_settimana', r.ore_a_settimana,
          'prova_data_checkin', r.prova_data_checkin,
          'prova_feedback_famiglia', r.prova_feedback_famiglia,
          'prova_feedback_lavoratore', r.prova_feedback_lavoratore,
          'prova_note_cs_famiglia', r.prova_note_cs_famiglia,
          'prova_note_cs_lavoratore', r.prova_note_cs_lavoratore,
          'prova_priorita_famiglia', r.prova_priorita_famiglia,
          'prova_ramo_d2', r.prova_ramo_d2,
          'prova_stato_cs', r.prova_stato_cs,
          'registrazione_chiamate_famiglia', r.registrazione_chiamate_famiglia,
          'registrazione_chiamate_lavoratori', r.registrazione_chiamate_lavoratori,
          'stato_assunzione', r.stato_assunzione,
          'aggiornato_il', r.aggiornato_il
        ),
        'famiglia', case when f.id is null then null else jsonb_build_object(
          'id', f.id, 'nome', f.nome, 'cognome', f.cognome, 'email', f.email, 'telefono', f.telefono
        ) end,
        'lavoratore', case when l.id is null then null else jsonb_build_object(
          'id', l.id, 'nome', l.nome, 'cognome', l.cognome, 'email', l.email, 'telefono', l.telefono, 'foto', l.foto
        ) end
      ) order by r.data_inizio_rapporto asc nulls last, r.aggiornato_il desc nulls last)
      from public.rapporti_lavorativi r
      left join public.famiglie f on f.id = r.famiglia_id
      left join public.lavoratori l on l.id = r.lavoratore_id
      where coalesce(trim(r.prova_stato_cs), '') <> ''
    ), '[]'::jsonb),
    'selezioni', coalesce((
      select jsonb_agg(jsonb_build_object(
        'selezione', jsonb_build_object(
          'id', s.id, 'processo_matching_id', s.processo_matching_id,
          'lavoratore_id', s.lavoratore_id, 'stato_selezione', s.stato_selezione,
          'colloquio_effettuato', s.colloquio_effettuato,
          'data_ora_colloquio_famiglia_lavoratore', s.data_ora_colloquio_famiglia_lavoratore
        ),
        'processo', case when p.id is null then null else jsonb_build_object(
          'id', p.id, 'famiglia_id', p.famiglia_id, 'stato_res', p.stato_res,
          'tipo_incontro_famiglia_lavoratore', p.tipo_incontro_famiglia_lavoratore,
          'indirizzo_prova_via', p.indirizzo_prova_via,
          'indirizzo_prova_civico', p.indirizzo_prova_civico,
          'indirizzo_prova_comune', p.indirizzo_prova_comune
        ) end,
        'processoFamiglia', case when pf.id is null then null else jsonb_build_object(
          'id', pf.id, 'nome', pf.nome, 'cognome', pf.cognome, 'email', pf.email, 'telefono', pf.telefono
        ) end,
        'lavoratore', case when sl.id is null then null else jsonb_build_object(
          'id', sl.id, 'nome', sl.nome, 'cognome', sl.cognome, 'email', sl.email, 'telefono', sl.telefono, 'foto', sl.foto
        ) end
      ) order by s.data_ora_colloquio_famiglia_lavoratore asc)
      from public.selezioni_lavoratori s
      left join public.processi_matching p on p.id = s.processo_matching_id
      left join public.famiglie pf on pf.id = p.famiglia_id
      left join public.lavoratori sl on sl.id = s.lavoratore_id
      where s.data_ora_colloquio_famiglia_lavoratore >= p_start_date
        and s.data_ora_colloquio_famiglia_lavoratore <= p_end_date
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.prove_colloqui_board(timestamptz, timestamptz) to anon, authenticated;
