create index if not exists idx_selezioni_lavoratori_worker_process_updated
  on public.selezioni_lavoratori (lavoratore_id, processo_matching_id, aggiornato_il desc)
  where lavoratore_id is not null and processo_matching_id is not null;

drop function if exists public.ricerca_worker_related_selection_summaries(uuid[], uuid);

create or replace function public.ricerca_worker_related_selection_summaries(
  p_worker_ids uuid[],
  p_current_process_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with direct_statuses(status_token) as (
    values
      ('selezionato'),
      ('inviato al cliente'),
      ('inviato al cliente in attesa di feedback'),
      ('colloquio schedulato'),
      ('colloquio fatto'),
      ('colloquio rimandato'),
      ('prova schedulata'),
      ('prova in corso'),
      ('prova rimandata'),
      ('match')
  ),
  normalized as (
    select
      sl.id,
      sl.lavoratore_id,
      sl.processo_matching_id,
      coalesce(nullif(trim(sl.stato_selezione), ''), '-') as stato_selezione,
      sl.aggiornato_il,
      trim(
        regexp_replace(
          translate(lower(coalesce(sl.stato_selezione, '')), '_-,', '   '),
          '\s+',
          ' ',
          'g'
        )
      ) as stato_selezione_token
    from public.selezioni_lavoratori sl
    where sl.lavoratore_id = any(p_worker_ids)
      and sl.processo_matching_id is not null
      and sl.processo_matching_id <> p_current_process_id
  ),
  direct_unique_processes as (
    select distinct on (n.lavoratore_id, n.processo_matching_id)
      n.lavoratore_id,
      n.processo_matching_id,
      n.stato_selezione,
      n.aggiornato_il
    from normalized n
    where exists (
        select 1
        from direct_statuses ds
        where ds.status_token = n.stato_selezione_token
      )
    order by n.lavoratore_id, n.processo_matching_id, n.aggiornato_il desc nulls last
  ),
  ranked as (
    select
      d.*,
      row_number() over (
        partition by d.lavoratore_id
        order by d.aggiornato_il desc nulls last, d.processo_matching_id
      ) as dot_rank
    from direct_unique_processes d
  ),
  grouped as (
    select
      r.lavoratore_id,
      count(*)::integer as related_count,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'process_id', r.processo_matching_id,
            'stato_selezione', r.stato_selezione
          )
          order by r.dot_rank
        ) filter (where r.dot_rank <= 4),
        '[]'::jsonb
      ) as dots
    from ranked r
    group by r.lavoratore_id
  )
  select jsonb_build_object(
    'rows',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'worker_id', g.lavoratore_id,
          'count', g.related_count,
          'dots', g.dots
        )
        order by g.lavoratore_id
      ),
      '[]'::jsonb
    )
  )
  from grouped g;
$$;
