-- FASE 4 BIS — Scheda RPC: tutto il dettaglio del lavoratore in UNA chiamata.
-- Sostituisce: lavoratori_by_ids + lavoratore_extras + indirizzi_by_entity +
-- (cerca-view) selezioni + processi + famiglie del worker selezionato.
-- related_searches ritorna TUTTE le selezioni del worker joinate a processo+
-- famiglia con i campi "ricchi" del pannello "altre ricerche attive"; lo split
-- direct/other resta client-side (isDirectInvolvementSelection).
CREATE OR REPLACE FUNCTION public.lavoratore_scheda(p_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'worker', (select to_jsonb(l) from public.lavoratori l where l.id = p_id),
    'indirizzi', coalesce((
      select jsonb_agg(to_jsonb(i) order by
        case when i.tipo_indirizzo = 'residenza' then 0 else 1 end,
        i.aggiornato_il desc nulls last, i.creato_il desc nulls last)
      from public.indirizzi i
      where i.entita_tabella = 'lavoratori' and i.entita_id = p_id::text
    ), '[]'::jsonb),
    'documenti', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.creato_il desc nulls last)
      from public.documenti_lavoratori d where d.lavoratore_id = p_id
    ), '[]'::jsonb),
    'esperienze', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.creato_il desc nulls last)
      from public.esperienze_lavoratori e where e.lavoratore_id = p_id
    ), '[]'::jsonb),
    'referenze', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.creato_il desc nulls last)
      from public.referenze_lavoratori r where r.lavoratore_id = p_id
    ), '[]'::jsonb),
    'related_searches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'processo_matching_id', s.processo_matching_id,
        'stato_selezione', s.stato_selezione,
        'note_selezione', s.note_selezione,
        'stato_situazione_lavorativa', s.stato_situazione_lavorativa,
        'stato_res', p.stato_res,
        'recruiter_ricerca_e_selezione_id', p.recruiter_ricerca_e_selezione_id,
        'orario_di_lavoro', p.orario_di_lavoro,
        'ore_settimanale', p.ore_settimanale,
        'deadline_mobile', p.deadline_mobile,
        'tipo_lavoro', p.tipo_lavoro,
        'tipo_rapporto', p.tipo_rapporto,
        'numero_ricerca_attivata', p.numero_ricerca_attivata,
        'famiglia_id', p.famiglia_id,
        'indirizzo_prova_comune', p.indirizzo_prova_comune,
        'indirizzo_prova_provincia', p.indirizzo_prova_provincia,
        'indirizzo_prova_cap', p.indirizzo_prova_cap,
        'indirizzo_prova_note', p.indirizzo_prova_note,
        'indirizzo_prova_via', p.indirizzo_prova_via,
        'famiglia_nome', f.nome,
        'famiglia_cognome', f.cognome
      ) order by s.aggiornato_il desc nulls last)
      from public.selezioni_lavoratori s
      join public.processi_matching p on p.id = s.processo_matching_id
      left join public.famiglie f on f.id = p.famiglia_id
      where s.lavoratore_id = p_id
    ), '[]'::jsonb)
  );
$function$;
