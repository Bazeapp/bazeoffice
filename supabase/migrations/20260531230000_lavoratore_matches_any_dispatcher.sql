-- FASE 4 BIS — dispatcher matcher filtri lavoratori.
-- array (piatto) → lavoratore_matches_filters (AND).
-- oggetto {logic,nodes} → lavoratore_matches_filter_group (AND/OR ricorsivo).
create or replace function public.lavoratore_matches_any(p_row jsonb, p_filters jsonb)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case
    when jsonb_typeof(p_filters) = 'object'
      then public.lavoratore_matches_filter_group(p_row, p_filters)
    else public.lavoratore_matches_filters(p_row, p_filters)
  end;
$$;

grant execute on function public.lavoratore_matches_any(jsonb, jsonb) to anon, authenticated;

-- gate1_lavoratori e gate2_lavoratori: nel WHERE di `eligible` la chiamata
-- public.lavoratore_matches_filters(<riga arricchita indirizzo>, p.filters_value)
-- è stata sostituita con public.lavoratore_matches_any(...), così i filtri con
-- logica OR (oggetto-gruppo) sono valutati ricorsivamente invece di cadere nel
-- fallback table-query. Array piatto → comportamento invariato.
-- Definizioni complete applicate via migration
-- gate1_lavoratori_filter_group_support / gate2_lavoratori_filter_group_support.
