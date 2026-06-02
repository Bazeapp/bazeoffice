-- FASE 4 BIS — RPC operatori_options (sostituisce invoke("table-query") in
-- use-operatori-options). I role tokens sono calcolati lato client
-- (getRoleTokens) e passati come array; qui si confronta in overlap dopo
-- normalizzazione (lower/trim/spazi->underscore) degli elementi di ruolo.
CREATE OR REPLACE FUNCTION public.operatori_options(
  p_role_tokens text[] DEFAULT NULL,
  p_active_only boolean DEFAULT false
)
 RETURNS SETOF operatori
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select o.*
  from public.operatori o
  where (not coalesce(p_active_only, false) or o.attivo is true)
    and (
      p_role_tokens is null
      or cardinality(p_role_tokens) = 0
      or exists (
        select 1
        from unnest(coalesce(o.ruolo, '{}'::text[])) as r(val)
        where lower(trim(replace(r.val, ' ', '_'))) = any (
          select lower(trim(replace(t, ' ', '_'))) from unnest(p_role_tokens) as t
        )
      )
    )
  order by o.nome asc, o.cognome asc;
$function$;
