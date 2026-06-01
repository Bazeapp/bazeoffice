-- FASE 4 BIS — sostituisce le table-query su `assunzioni` (assunzioni-detail-sheet):
--  - assunzioni_by_ids: hydration by-id (datore/lavoratore assunzione)
--  - assunzioni_by_form_type: candidati per type_of_compilazione_form
-- Entrambe SETOF assunzioni (la FE trimma con .select() — Fix A).
CREATE OR REPLACE FUNCTION public.assunzioni_by_ids(p_ids uuid[])
 RETURNS SETOF assunzioni
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select * from public.assunzioni where id = any (p_ids);
$function$;

CREATE OR REPLACE FUNCTION public.assunzioni_by_form_type(p_type text)
 RETURNS SETOF assunzioni
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select * from public.assunzioni
  where type_of_compilazione_form = p_type
  order by creato_il desc nulls last;
$function$;
