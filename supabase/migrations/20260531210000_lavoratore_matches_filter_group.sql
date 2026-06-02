-- FASE 4 BIS — valutatore ricorsivo AND/OR dei gruppi di filtri.
-- Riusa lavoratore_matches_filters per le condizioni singole (no duplicazione).
create or replace function public.lavoratore_matches_filter_group(p_row jsonb, p_group jsonb)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  node jsonb; node_kind text; node_logic text; child_result boolean;
  any_true boolean := false; all_true boolean := true; has_nodes boolean := false;
begin
  if p_group is null or jsonb_typeof(p_group) <> 'object' then return true; end if;
  node_logic := lower(coalesce(p_group ->> 'logic', 'and'));
  if p_group -> 'nodes' is null or jsonb_typeof(p_group -> 'nodes') <> 'array' then return true; end if;
  for node in select value from jsonb_array_elements(p_group -> 'nodes') loop
    has_nodes := true;
    node_kind := node ->> 'kind';
    if node_kind = 'group' then
      child_result := public.lavoratore_matches_filter_group(p_row, node);
    else
      child_result := public.lavoratore_matches_filters(p_row, jsonb_build_array(node));
    end if;
    if child_result then any_true := true; else all_true := false; end if;
  end loop;
  if not has_nodes then return true; end if;
  if node_logic = 'or' then return any_true; end if;
  return all_true;
end;
$$;

grant execute on function public.lavoratore_matches_filter_group(jsonb, jsonb) to anon, authenticated;

-- cerca_lavoratori: nel WHERE di `eligible` aggiunta la condizione (additiva):
--   and (jsonb_typeof(p.filters_value) <> 'object'
--        or public.lavoratore_matches_filter_group(to_jsonb(l), p.filters_value))
-- Quando p_filters è un GRUPPO (oggetto logic/nodes) applica il matcher
-- ricorsivo; quando è un array, comportamento fast-path invariato.
-- (Definizione completa applicata via migration cerca_lavoratori_filter_group_support.)
