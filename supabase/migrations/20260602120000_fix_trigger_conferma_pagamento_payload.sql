-- Fix: la conferma di pagamento cedolino non veniva mai inviata.
--
-- Il trigger trigger_wk_conferma_pagamento_cedolino chiamava l'edge function
-- `wk-conferma-pagamento-cedolino` con body { record_id: NEW.id }, ma l'EF
-- legge `record.id` (formato Database Webhook: { record: { id } }).
-- Risultato: l'EF rispondeva 400 "Missing record.id" → nessuna email al
-- lavoratore / nessuna conferma alla famiglia, e lo stato non avanzava a "DONE".
--
-- Allineiamo il payload del trigger a quello atteso dall'EF.

CREATE OR REPLACE FUNCTION public.trigger_wk_conferma_pagamento_cedolino()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://vrrusyyxqgitgovazbfe.supabase.co/functions/v1/wk-conferma-pagamento-cedolino',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('record', jsonb_build_object('id', NEW.id))
  );

  RETURN NEW;
END;
$function$;
