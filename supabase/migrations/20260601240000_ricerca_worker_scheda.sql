-- FASE 4 BIS — scheda worker della pipeline Ricerca in 1 RPC:
-- worker + indirizzi (residenza/domicilio) + esperienze + documenti + referenze
-- + la selezione corrente (by id). Sostituisce 6 chiamate parallele in
-- ricerca-workers-pipeline-view (lookup resta separata, è cacheata).
CREATE OR REPLACE FUNCTION public.ricerca_worker_scheda(p_worker_id uuid, p_selection_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'worker', (select to_jsonb(l) from public.lavoratori l where l.id = p_worker_id),
    'indirizzi', coalesce((
      select jsonb_agg(to_jsonb(i) order by
        case when i.tipo_indirizzo = 'residenza' then 0 else 1 end,
        i.aggiornato_il desc nulls last, i.creato_il desc nulls last)
      from public.indirizzi i
      where i.entita_tabella = 'lavoratori' and i.entita_id = p_worker_id::text
        and i.tipo_indirizzo = any (array['residenza','domicilio'])
    ), '[]'::jsonb),
    'esperienze', coalesce((
      select jsonb_agg(to_jsonb(e) order by
        e.stato_esperienza_attiva desc, e.data_inizio desc, e.aggiornato_il desc)
      from public.esperienze_lavoratori e where e.lavoratore_id = p_worker_id
    ), '[]'::jsonb),
    'documenti', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.aggiornato_il desc nulls last)
      from public.documenti_lavoratori d where d.lavoratore_id = p_worker_id
    ), '[]'::jsonb),
    'referenze', coalesce((
      select jsonb_agg(to_jsonb(r) order by
        r.referenza_verificata asc, r.data_inzio desc, r.aggiornato_il desc)
      from public.referenze_lavoratori r where r.lavoratore_id = p_worker_id
    ), '[]'::jsonb),
    'selezione', (
      select to_jsonb(s) from public.selezioni_lavoratori s
      where p_selection_id is not null and s.id = p_selection_id
    )
  );
$function$;
