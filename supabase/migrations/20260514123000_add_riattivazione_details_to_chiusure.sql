alter table public.chiusure_contratti
  add column if not exists data_per_riattivazione timestamptz,
  add column if not exists sconto_proposto_riattivazione text;
