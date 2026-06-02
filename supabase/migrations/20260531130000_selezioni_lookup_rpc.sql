-- FASE 4 BIS — Wave 4 (selezioni): RPC unica flessibile.
-- Copre tutti i pattern di lookup selezioni_lavoratori fuori da Anagrafiche:
-- by id, by lavoratore_id, by processo_matching_id, composito lav+processo
-- (dup-check), e filtro stato_selezione (gate1 blocking). I parametri non
-- null sono AND-combinati. setof selezioni_lavoratori (riga piena).
create or replace function public.selezioni_lookup(
  p_ids uuid[] default null,
  p_lavoratore_ids uuid[] default null,
  p_processo_ids uuid[] default null,
  p_stati text[] default null
)
returns setof public.selezioni_lavoratori
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.selezioni_lavoratori
  where (p_ids is null or id = any (p_ids))
    and (p_lavoratore_ids is null or lavoratore_id = any (p_lavoratore_ids))
    and (p_processo_ids is null or processo_matching_id = any (p_processo_ids))
    and (p_stati is null or stato_selezione = any (p_stati));
$$;

grant execute on function public.selezioni_lookup(uuid[], uuid[], uuid[], text[]) to anon, authenticated;
