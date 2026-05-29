-- FASE 4 BIS — Wave 1: "by_ids trio" RPCs
--
-- Sostituisce il pattern table-query più frequente fuori dalla pagina
-- Anagrafiche: i lookup puntuali "id IN (...)" / "id = X" su famiglie,
-- lavoratori e processi_matching (~22 call site nel census
-- docs/audits/audit-table-query-callers.md, RPC #1/#5/#10).
--
-- Convenzione: <entita>_<scopo> (come le RPC esistenti cedolino_detail /
-- chiusure_board, SENZA suffisso di versione), `returns setof <table>` (riga piena, il
-- client trimma le colonne che gli servono), STABLE, SECURITY DEFINER per
-- bypassare RLS coerentemente con la edge function table-query esistente
-- (stessa security posture; il JWT-check è fuori scope per decisione founder).
-- grant a anon+authenticated come gli altri RPC del progetto.

-- 1. lavoratori_by_ids (RPC #1)
--    p_roles opzionale: filtra per overlap su tipo_lavoro_domestico (text[]).
create or replace function public.lavoratori_by_ids(
  p_ids uuid[],
  p_roles text[] default null
)
returns setof public.lavoratori
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.lavoratori
  where id = any (p_ids)
    and (p_roles is null or tipo_lavoro_domestico && p_roles);
$$;

-- 2. famiglie_by_ids (RPC #5)
create or replace function public.famiglie_by_ids(p_ids uuid[])
returns setof public.famiglie
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.famiglie
  where id = any (p_ids);
$$;

-- 3. processi_matching_by_ids (RPC #10)
--    Accetta id[] OPPURE famiglia_id[] (whichever non-null). Copre sia i
--    lookup per id sia il "processi by famiglia" della add-search dialog.
create or replace function public.processi_matching_by_ids(
  p_ids uuid[] default null,
  p_famiglia_ids uuid[] default null
)
returns setof public.processi_matching
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.processi_matching
  where (p_ids is null or id = any (p_ids))
    and (p_famiglia_ids is null or famiglia_id = any (p_famiglia_ids));
$$;

grant execute on function public.lavoratori_by_ids(uuid[], text[]) to anon, authenticated;
grant execute on function public.famiglie_by_ids(uuid[]) to anon, authenticated;
grant execute on function public.processi_matching_by_ids(uuid[], uuid[]) to anon, authenticated;
