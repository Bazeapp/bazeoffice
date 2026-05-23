-- Assunzioni (Gestione contrattuale) board + detail RPCs.
-- Replaces the client-side cascade in use-assunzioni-board.ts (board) and the
-- per-card fan-out in assunzioni-board-view.tsx (detail).
--
-- Board: light card data (rapporto + resolved process/family/lavoratore + the
-- two assunzioni name fields). Stage resolution stays client-side via
-- lookup_values, like the other boards. richiesta_attivazione is NOT shown on
-- cards, so it is resolved only in the detail RPC.
--
-- Read-only, SECURITY DEFINER, granted to anon + authenticated.

create index if not exists idx_rapporti_lavorativi_stato_assunzione
  on public.rapporti_lavorativi (stato_assunzione);

create index if not exists idx_processi_matching_famiglia_id
  on public.processi_matching (famiglia_id);

create index if not exists idx_richieste_attivazione_id
  on public.richieste_attivazione (id);

-- ---------------------------------------------------------------------------
-- Helper: parse uuid tokens out of rapporti_lavorativi.id_rapporto, which can
-- be a comma/newline/semicolon separated list.
-- ---------------------------------------------------------------------------
create or replace function public.parse_uuid_tokens(p_value text)
returns uuid[]
language sql
immutable
as $$
  select coalesce(
    array_agg(tok::uuid),
    array[]::uuid[]
  )
  from (
    select trim(t) as tok
    from regexp_split_to_table(coalesce(p_value, ''), '[,\n;]+') as t
  ) s
  where tok ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
$$;

-- ---------------------------------------------------------------------------
-- Board
-- p_stato_filter null  -> all rapporti except the deferred stages
-- p_stato_filter set   -> only that exact stato_assunzione (deferred columns)
-- ---------------------------------------------------------------------------
drop function if exists public.assunzioni_board(text);

create or replace function public.assunzioni_board(
  p_stato_filter text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select rl.*
    from public.rapporti_lavorativi rl
    where (
      (p_stato_filter is not null and rl.stato_assunzione = p_stato_filter)
      or (
        p_stato_filter is null
        and coalesce(rl.stato_assunzione, '') not in ('Contratto firmato', 'Non assume con Baze')
      )
    )
  ),
  resolved as (
    select
      b.*,
      coalesce(
        (select p.id from public.processi_matching p where p.id = b.processi_matching_id),
        (
          select p.id from public.processi_matching p
          where p.id = any(public.parse_uuid_tokens(b.id_rapporto))
          order by p.aggiornato_il desc nulls last
          limit 1
        ),
        (
          select p.id from public.processi_matching p
          where p.famiglia_id = b.famiglia_id
          order by p.aggiornato_il desc nulls last
          limit 1
        )
      ) as resolved_process_id
    from base b
  )
  select jsonb_build_object(
    'rows',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'rapporto', jsonb_build_object(
                'id', r.id,
                'id_rapporto', r.id_rapporto,
                'accordo_di_lavoro_allegati', r.accordo_di_lavoro_allegati,
                'codice_datore_webcolf', r.codice_datore_webcolf,
                'codice_dipendente_webcolf', r.codice_dipendente_webcolf,
                'processi_matching_id', r.processi_matching_id,
                'preventivo_id', r.preventivo_id,
                'richiesta_attivazione_id', r.richiesta_attivazione_id,
                'assunzione_datore_id', r.assunzione_datore_id,
                'assunzione_lavoratore_id', r.assunzione_lavoratore_id,
                'famiglia_id', r.famiglia_id,
                'lavoratore_id', r.lavoratore_id,
                'stato_assunzione', r.stato_assunzione,
                'cognome_nome_datore_proper', r.cognome_nome_datore_proper,
                'nome_lavoratore_per_url', r.nome_lavoratore_per_url,
                'data_inizio_rapporto', r.data_inizio_rapporto,
                'ore_a_settimana', r.ore_a_settimana,
                'distribuzione_ore_settimana', r.distribuzione_ore_settimana,
                'paga_mensile_lorda', r.paga_mensile_lorda,
                'paga_oraria_lorda', r.paga_oraria_lorda,
                'ricevuta_inps_allegati', r.ricevuta_inps_allegati,
                'tipo_contratto', r.tipo_contratto,
                'tipo_rapporto', r.tipo_rapporto,
                'metadati_migrazione', r.metadati_migrazione
              ),
              'process', case when p.id is null then null else jsonb_build_object(
                'id', p.id,
                'famiglia_id', p.famiglia_id,
                'titolo_annuncio', p.titolo_annuncio,
                'tipo_rapporto', p.tipo_rapporto,
                'data_limite_invio_selezione', p.data_limite_invio_selezione,
                'source_url', p.source_url,
                'offerta', p.offerta
              ) end,
              'famiglia', case when f.id is null then null else jsonb_build_object(
                'id', f.id,
                'nome', f.nome,
                'cognome', f.cognome,
                'email', f.email,
                'telefono', f.telefono
              ) end,
              'lavoratore', case when l.id is null then null else jsonb_build_object(
                'id', l.id,
                'nome', l.nome,
                'cognome', l.cognome,
                'email', l.email,
                'telefono', l.telefono,
                'nazionalita', l.nazionalita,
                'iban', l.iban
              ) end,
              'assunzione', case when ad.id is null then null else jsonb_build_object(
                'id', ad.id,
                'info_anagrafiche_nome', ad.info_anagrafiche_nome,
                'info_anagrafiche_cognome', ad.info_anagrafiche_cognome
              ) end,
              'lavoratoreAssunzione', case when al.id is null then null else jsonb_build_object(
                'id', al.id,
                'info_anagrafiche_nome', al.info_anagrafiche_nome,
                'info_anagrafiche_cognome', al.info_anagrafiche_cognome
              ) end
            )
            order by r.aggiornato_il desc nulls last
          )
          from resolved r
          left join public.processi_matching p on p.id = r.resolved_process_id
          left join public.famiglie f
            on f.id = coalesce(r.famiglia_id, p.famiglia_id)
          left join public.lavoratori l on l.id = r.lavoratore_id
          left join public.assunzioni ad on ad.id = r.assunzione_datore_id
          left join public.assunzioni al on al.id = r.assunzione_lavoratore_id
        ),
        '[]'::jsonb
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Detail: one rapporto with full assunzioni records and the resolved
-- richiesta_attivazione (4-strategy fallback, mirroring the client logic).
-- ---------------------------------------------------------------------------
drop function if exists public.assunzione_detail(uuid);

create or replace function public.assunzione_detail(
  p_rapporto_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with r as (
    select * from public.rapporti_lavorativi where id = p_rapporto_id
  ),
  resolved_process as (
    select coalesce(
      (select p.id from public.processi_matching p, r where p.id = r.processi_matching_id),
      (
        select p.id from public.processi_matching p, r
        where p.id = any(public.parse_uuid_tokens(r.id_rapporto))
        order by p.aggiornato_il desc nulls last limit 1
      ),
      (
        select p.id from public.processi_matching p, r
        where p.famiglia_id = r.famiglia_id
        order by p.aggiornato_il desc nulls last limit 1
      )
    ) as process_id
  ),
  richiesta as (
    select to_jsonb(ra) as data
    from public.richieste_attivazione ra
    where ra.id = (select richiesta_attivazione_id from r)
    limit 1
  ),
  richiesta_by_process as (
    select to_jsonb(ra) as data
    from public.richieste_attivazione ra
    where ra.processo_res_id in (
      (select process_id from resolved_process),
      (select processi_matching_id from r)
    )
    or ra.processo_res_id = any(public.parse_uuid_tokens((select id_rapporto from r)))
    order by ra.aggiornato_il desc nulls last
    limit 1
  )
  select case when (select id from r) is null then null else jsonb_build_object(
    'rapporto', (select to_jsonb(r) from r),
    'assunzione', (
      select to_jsonb(a) from public.assunzioni a
      where a.id = (select assunzione_datore_id from r)
    ),
    'lavoratoreAssunzione', (
      select to_jsonb(a) from public.assunzioni a
      where a.id = (select assunzione_lavoratore_id from r)
    ),
    'richiestaAttivazione', coalesce(
      (select data from richiesta),
      (select data from richiesta_by_process)
    )
  ) end;
$$;

grant execute on function public.parse_uuid_tokens(text) to anon, authenticated;
grant execute on function public.assunzioni_board(text) to anon, authenticated;
grant execute on function public.assunzione_detail(uuid) to anon, authenticated;
