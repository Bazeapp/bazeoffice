-- FASE 4 BIS — board RPC: enrichment "altre selezioni attive" server-side.
-- Sostituisce il fan-out FE (selezioni_lookup + processi_matching_by_ids xN +
-- famiglie_by_ids xN) con UN join. Filtra ai soli "direct involvement"
-- (replica di isDirectInvolvementSelection: stato_selezione nel set +
-- stato_situazione_lavorativa != 'Non attivo'). I valori sono accent-free e
-- differiscono solo per maiuscole, quindi lower(trim(...)) è sufficiente.
CREATE OR REPLACE FUNCTION public.lavoratori_selezioni_correlate(p_worker_ids uuid[])
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'lavoratore_id', s.lavoratore_id,
    'processo_matching_id', s.processo_matching_id,
    'stato_selezione', s.stato_selezione,
    'note_selezione', s.note_selezione,
    'stato_res', p.stato_res,
    'recruiter_ricerca_e_selezione_id', p.recruiter_ricerca_e_selezione_id,
    'orario_di_lavoro', p.orario_di_lavoro,
    'numero_ricerca_attivata', p.numero_ricerca_attivata,
    'indirizzo_prova_comune', p.indirizzo_prova_comune,
    'indirizzo_prova_provincia', p.indirizzo_prova_provincia,
    'indirizzo_prova_cap', p.indirizzo_prova_cap,
    'indirizzo_prova_note', p.indirizzo_prova_note,
    'indirizzo_prova_via', p.indirizzo_prova_via,
    'famiglia_nome', f.nome,
    'famiglia_cognome', f.cognome
  ) order by s.lavoratore_id, s.aggiornato_il desc nulls last), '[]'::jsonb)
  from public.selezioni_lavoratori s
  join public.processi_matching p on p.id = s.processo_matching_id
  left join public.famiglie f on f.id = p.famiglia_id
  where s.lavoratore_id = any(p_worker_ids)
    and coalesce(lower(trim(s.stato_situazione_lavorativa)), '') <> 'non attivo'
    and lower(trim(coalesce(s.stato_selezione, ''))) = any (array[
      'selezionato',
      'inviato al cliente',
      'inviato al cliente in attesa di feedback',
      'colloquio schedulato',
      'colloquio fatto',
      'colloquio rimandato',
      'prova schedulata',
      'prova in corso',
      'prova rimandata',
      'match'
    ]);
$function$;
