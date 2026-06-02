-- FASE 4 BIS — RPC dettaglio lavoratore (sostituiscono table-query in
-- ricerca-workers-pipeline-view e assunzioni-detail-sheet).
-- Stesso ORDER BY dei vecchi fetch table-query.

CREATE OR REPLACE FUNCTION public.esperienze_lavoratori_by_lavoratore(p_lavoratore_id uuid)
 RETURNS SETOF esperienze_lavoratori
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select *
  from public.esperienze_lavoratori
  where lavoratore_id = p_lavoratore_id
  order by stato_esperienza_attiva desc, data_inizio desc, aggiornato_il desc;
$function$;

CREATE OR REPLACE FUNCTION public.documenti_lavoratori_by_lavoratore(p_lavoratore_id uuid)
 RETURNS SETOF documenti_lavoratori
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select *
  from public.documenti_lavoratori
  where lavoratore_id = p_lavoratore_id
  order by aggiornato_il desc;
$function$;

CREATE OR REPLACE FUNCTION public.referenze_lavoratori_by_lavoratore(p_lavoratore_id uuid)
 RETURNS SETOF referenze_lavoratori
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select *
  from public.referenze_lavoratori
  where lavoratore_id = p_lavoratore_id
  order by referenza_verificata asc, data_inzio desc, aggiornato_il desc;
$function$;
