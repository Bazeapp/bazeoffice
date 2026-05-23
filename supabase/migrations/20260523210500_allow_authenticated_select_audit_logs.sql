-- Allow authenticated users to read audit_logs so the FE can resolve
-- "field changed by <user>" attributions in change notifications.
--
-- Note: audit_logs already has RLS enabled, so without this policy reads
-- from the FE are denied entirely.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    WHERE c.relname = 'audit_logs'
      AND p.polname = 'Select audit per Autenticati'
  ) THEN
    CREATE POLICY "Select audit per Autenticati"
      ON public.audit_logs
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
