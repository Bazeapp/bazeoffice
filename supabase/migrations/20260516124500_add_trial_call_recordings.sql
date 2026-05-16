alter table public.rapporti_lavorativi
  add column if not exists registrazioni_chiamate_lavoratore jsonb,
  add column if not exists registrazioni_chiamate_famiglia jsonb;

comment on column public.rapporti_lavorativi.registrazioni_chiamate_lavoratore
  is 'Audio call recordings uploaded during trial monitoring for the worker side.';

comment on column public.rapporti_lavorativi.registrazioni_chiamate_famiglia
  is 'Audio call recordings uploaded during trial monitoring for the family side.';
