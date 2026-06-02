-- FASE 4 BIS cleanup — rimuove RPC ormai orfane (nessun caller FE):
--  - lavoratori_nazionalita_options: sostituita da lookup_values
--  - lavoratore_extras: sostituita da lavoratore_scheda
--  - esperienze/referenze_lavoratori_by_lavoratore: servite da ricerca_worker_scheda
-- (documenti_lavoratori_by_lavoratore resta: usata da assunzioni-detail-sheet)
DROP FUNCTION IF EXISTS public.lavoratori_nazionalita_options();
DROP FUNCTION IF EXISTS public.lavoratore_extras(uuid);
DROP FUNCTION IF EXISTS public.esperienze_lavoratori_by_lavoratore(uuid);
DROP FUNCTION IF EXISTS public.referenze_lavoratori_by_lavoratore(uuid);
