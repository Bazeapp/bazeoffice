alter table public.rapporti_lavorativi
  add column if not exists registrazione_chiamate_lavoratori jsonb,
  add column if not exists registrazione_chiamate_famiglia jsonb;

comment on column public.rapporti_lavorativi.registrazione_chiamate_lavoratori
  is 'Audio call recordings uploaded during trial monitoring for the worker side.';

comment on column public.rapporti_lavorativi.registrazione_chiamate_famiglia
  is 'Audio call recordings uploaded during trial monitoring for the family side.';
