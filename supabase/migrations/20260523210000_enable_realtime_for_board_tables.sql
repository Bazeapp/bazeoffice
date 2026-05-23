-- Enable Realtime (postgres_changes) on all board-related tables so that
-- useRealtimeBoardSync receives row-level events and the UI can stay in
-- sync across users without manual refresh.
--
-- The publication is created by Supabase by default; this migration adds the
-- tables idempotently.

DO $$
DECLARE
  target text;
  targets text[] := ARRAY[
    'processi_matching',
    'famiglie',
    'indirizzi',
    'rapporti_lavorativi',
    'lavoratori',
    'ticket',
    'assunzioni',
    'chiusure_contratti',
    'variazioni_contrattuali',
    'mesi_lavorati',
    'mesi_calendario',
    'pagamenti',
    'presenze_mensili',
    'contributi_inps',
    'transazioni_finanziarie',
    'selezioni_lavoratori',
    'documenti_lavoratori',
    'esperienze_lavoratori',
    'referenze_lavoratori',
    'richieste_attivazione'
  ];
BEGIN
  FOREACH target IN ARRAY targets LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = target
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', target);
    END IF;
  END LOOP;
END $$;
