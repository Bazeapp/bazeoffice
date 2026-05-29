-- Move "Chiusura pronta" (sort_order 40) to BEFORE "Inviato comunicazione per
-- firma documento" (sort_order 30) on the chiusure_contratti.stato kanban.
--
-- Final order on the board:
--   10 Lavoratore comunica dimissioni
--   20 Datore comunica licenziamento
--   25 Chiusura pronta              ← moved here
--   30 Inviato comunicazione per firma documento
--   50 Ricevuto documento firmato
--   60 Chiusura elaborata
--   70 Inviato documenti di chiusura
--   80 Richiesta chiarimenti famiglia
--   90 Chiusura terminata
--
-- Uses sort_order=25 (between 20 and 30) so no other rows need to shift; the
-- DEFAULT_STAGE_DEFINITIONS in src/hooks/use-chiusure-board.ts mirrors this
-- new order for the hard-coded fallback (used when lookup_values is empty).

update public.lookup_values
set sort_order = 25
where entity_table = 'chiusure_contratti'
  and entity_field = 'stato'
  and value_key = 'Chiusura pronta';
