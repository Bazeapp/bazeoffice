-- Aggiunge il valore di lookup "DONE" per mesi_lavorati.stato_mese_lavorativo.
--
-- "DONE" è lo stato TERMINALE impostato dall'edge function
-- wk-conferma-pagamento-cedolino DOPO l'invio delle conferme. Finora non era
-- presente in lookup_values e il frontend lo accorpava alla colonna "Pagato"
-- (alias done -> Pagato), nascondendo se la conferma fosse effettivamente
-- partita. Lo rendiamo un valore di lookup distinto, ordinato dopo "Pagato".
--
-- Idempotente: non inserisce se già presente.

INSERT INTO public.lookup_values
  (entity_table, entity_field, value_key, value_label, sort_order, is_active, metadata)
SELECT
  'mesi_lavorati', 'stato_mese_lavorativo', 'DONE', 'DONE', 120, true,
  jsonb_build_object('color', 'emerald')
WHERE NOT EXISTS (
  SELECT 1 FROM public.lookup_values
  WHERE entity_table = 'mesi_lavorati'
    AND entity_field = 'stato_mese_lavorativo'
    AND value_key = 'DONE'
);
