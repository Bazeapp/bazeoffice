-- FASE 4 BIS — helper di ordinamento whitelisted per cerca/gate1/gate2.
-- Confinano le colonne ordinabili: testo/date in lavoratore_sort_text,
-- numeri in lavoratore_sort_num. Colonna fuori whitelist => null => default.

CREATE OR REPLACE FUNCTION public.lavoratore_sort_num(p_row jsonb, p_col text)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case p_col
    when 'anni_esperienza_colf' then nullif(p_row->>'anni_esperienza_colf','')::numeric
    when 'anni_esperienza_babysitter' then nullif(p_row->>'anni_esperienza_babysitter','')::numeric
    else null
  end
$function$;

CREATE OR REPLACE FUNCTION public.lavoratore_sort_text(p_row jsonb, p_col text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case p_col
    when 'nome' then lower(p_row->>'nome')
    when 'cognome' then lower(p_row->>'cognome')
    when 'stato_lavoratore' then lower(p_row->>'stato_lavoratore')
    when 'disponibilita' then lower(p_row->>'disponibilita')
    when 'provincia' then lower(p_row->>'provincia')
    when 'data_di_nascita' then p_row->>'data_di_nascita'
    when 'followup_chiamata_idoneita' then lower(p_row->>'followup_chiamata_idoneita')
    when 'data_ora_di_creazione' then p_row->>'data_ora_di_creazione'
    when 'data_ora_ultima_modifica' then p_row->>'data_ora_ultima_modifica'
    when 'creato_il' then p_row->>'creato_il'
    when 'aggiornato_il' then p_row->>'aggiornato_il'
    else null
  end
$function$;
