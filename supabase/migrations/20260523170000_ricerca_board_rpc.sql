-- Ricerca board RPC.
-- Replaces use-ricerca-board.ts cascade: eager processes (joined with famiglia +
-- best 'luogo'/'prova' address) + deferred stage counts in a single call.
-- Read-only, SECURITY DEFINER, granted to anon + authenticated.

create index if not exists idx_processi_matching_stato_res
  on public.processi_matching (stato_res);

drop function if exists public.ricerca_board(text[], text[]);

create or replace function public.ricerca_board(
  p_eager_stages text[] default array[]::text[],
  p_deferred_stages text[] default array[]::text[]
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with eager as (
    select p.id, p.stato_res, p.famiglia_id, p.recruiter_ricerca_e_selezione_id,
      p.referente_ricerca_e_selezione_id, p.ore_settimanale, p.numero_giorni_settimanali,
      p.deadline_mobile, p.tipo_lavoro, p.tipo_rapporto, p.aggiornato_il
    from public.processi_matching p
    where p.stato_res = any(p_eager_stages)
  )
  select jsonb_build_object(
    'processes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'stato_res', e.stato_res, 'famiglia_id', e.famiglia_id,
        'recruiter_ricerca_e_selezione_id', e.recruiter_ricerca_e_selezione_id,
        'referente_ricerca_e_selezione_id', e.referente_ricerca_e_selezione_id,
        'ore_settimanale', e.ore_settimanale, 'numero_giorni_settimanali', e.numero_giorni_settimanali,
        'deadline_mobile', e.deadline_mobile, 'tipo_lavoro', e.tipo_lavoro, 'tipo_rapporto', e.tipo_rapporto,
        'famiglia', case when f.id is null then null else jsonb_build_object(
          'id', f.id, 'nome', f.nome, 'cognome', f.cognome, 'email', f.email, 'telefono', f.telefono
        ) end,
        'indirizzo', case when addr.entita_id is null then null else jsonb_build_object(
          'tipo_indirizzo', addr.tipo_indirizzo, 'via', addr.via, 'civico', addr.civico,
          'cap', addr.cap, 'citta', addr.citta, 'provincia', addr.provincia,
          'indirizzo_formattato', addr.indirizzo_formattato, 'note', addr.note
        ) end
      ) order by e.aggiornato_il desc nulls last)
      from eager e
      left join public.famiglie f on f.id = e.famiglia_id
      left join lateral (
        select i.*
        from public.indirizzi i
        where i.entita_tabella = 'processi_matching'
          and i.entita_id = e.id::text
          and lower(coalesce(i.tipo_indirizzo, '')) in ('luogo', 'prova')
        order by case lower(coalesce(i.tipo_indirizzo, ''))
                   when 'luogo' then 0 when 'prova' then 1 else 2 end,
                 i.aggiornato_il desc nulls last
        limit 1
      ) addr on true
    ), '[]'::jsonb),
    'deferredCounts', coalesce((
      select jsonb_object_agg(s, (
        select count(*) from public.processi_matching p where p.stato_res = s
      ))
      from unnest(p_deferred_stages) s
    ), '{}'::jsonb)
  );
$$;

grant execute on function public.ricerca_board(text[], text[]) to anon, authenticated;
