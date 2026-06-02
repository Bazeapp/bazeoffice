-- FASE 4 BIS — board in UNA RPC: richiama la list-RPC giusta (cerca/gate1/gate2)
-- e annida indirizzi (grezzi, come indirizzi_by_entity) + selezioni_correlate
-- (grezze, come lavoratori_selezioni_correlate). La FE fa 1 chiamata e riusa il
-- processing client esistente (colori/label). Il CASE è short-circuit → viene
-- valutata solo la list-RPC del gate richiesto.
CREATE OR REPLACE FUNCTION public.lavoratori_board(
  p_gate text,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL::text,
  p_filters jsonb DEFAULT '[]'::jsonb,
  p_order_by text DEFAULT NULL::text,
  p_order_dir text DEFAULT NULL::text,
  p_include_related boolean DEFAULT true
)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with base as (
    select case lower(coalesce(p_gate, ''))
      when 'gate1' then public.gate1_lavoratori(p_limit, p_offset, p_search, p_filters, p_order_by, p_order_dir)
      when 'gate2' then public.gate2_lavoratori(p_limit, p_offset, p_search, p_filters, p_order_by, p_order_dir)
      else public.cerca_lavoratori(p_limit, p_offset, p_search, p_filters, p_order_by, p_order_dir)
    end as payload
  ),
  ids as (
    select
      coalesce(array_agg((r->>'id')::uuid), '{}'::uuid[]) as ids_uuid,
      coalesce(array_agg(r->>'id'), '{}'::text[]) as ids_text
    from base
    cross join lateral jsonb_array_elements(base.payload->'rows') r
  )
  select jsonb_build_object(
    'rows', (select payload->'rows' from base),
    'total', (select payload->'total' from base),
    'indirizzi', coalesce((
      select jsonb_agg(to_jsonb(i))
      from public.indirizzi i
      cross join ids
      where i.entita_tabella = 'lavoratori' and i.entita_id = any(ids.ids_text)
    ), '[]'::jsonb),
    'selezioni_correlate', case
      when coalesce(p_include_related, true)
        then public.lavoratori_selezioni_correlate((select ids_uuid from ids))
      else '[]'::jsonb
    end
  );
$function$;
