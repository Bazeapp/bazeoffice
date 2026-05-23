-- Lavoratore extras bundle: returns documenti + esperienze + referenze for a
-- given worker in a single call. Replaces the 3 parallel table-query fetches
-- that fire when a worker is selected in Cerca Lavoratori / Gate views.
-- Read-only, SECURITY DEFINER, granted to anon + authenticated.

create index if not exists idx_documenti_lavoratori_lavoratore_id
  on public.documenti_lavoratori (lavoratore_id);

create index if not exists idx_esperienze_lavoratori_lavoratore_id
  on public.esperienze_lavoratori (lavoratore_id);

create index if not exists idx_referenze_lavoratori_lavoratore_id
  on public.referenze_lavoratori (lavoratore_id);

drop function if exists public.lavoratore_extras(uuid);

create or replace function public.lavoratore_extras(
  p_worker_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'documenti', coalesce(
      (select jsonb_agg(to_jsonb(d) order by d.creato_il desc nulls last)
       from public.documenti_lavoratori d where d.lavoratore_id = p_worker_id),
      '[]'::jsonb
    ),
    'esperienze', coalesce(
      (select jsonb_agg(to_jsonb(e) order by e.creato_il desc nulls last)
       from public.esperienze_lavoratori e where e.lavoratore_id = p_worker_id),
      '[]'::jsonb
    ),
    'referenze', coalesce(
      (select jsonb_agg(to_jsonb(r) order by r.creato_il desc nulls last)
       from public.referenze_lavoratori r where r.lavoratore_id = p_worker_id),
      '[]'::jsonb
    )
  );
$$;

grant execute on function public.lavoratore_extras(uuid) to anon, authenticated;
