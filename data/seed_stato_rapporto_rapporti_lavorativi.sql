alter table if exists public.rapporti_lavorativi
add column if not exists stato_rapporto text;

insert into public.lookup_values (
  entity_table,
  entity_field,
  value_key,
  value_label,
  sort_order,
  is_active,
  metadata
)
values
  ('rapporti_lavorativi', 'stato_rapporto', 'in_attivazione', 'In attivazione', 1, true, '{"color":"amber"}'::jsonb),
  ('rapporti_lavorativi', 'stato_rapporto', 'attivo', 'Attivo', 2, true, '{"color":"emerald"}'::jsonb),
  ('rapporti_lavorativi', 'stato_rapporto', 'terminato', 'Terminato', 3, true, '{"color":"zinc"}'::jsonb),
  ('rapporti_lavorativi', 'stato_rapporto', 'sconosciuto', 'Sconosciuto', 4, true, '{"color":"sky"}'::jsonb)
on conflict do nothing;

with randomized as (
  select
    id,
    (array['In attivazione', 'Attivo', 'Terminato', 'Sconosciuto'])[
      1 + floor(random() * 4)::int
    ] as next_stato
  from public.rapporti_lavorativi
)
update public.rapporti_lavorativi as rapporti
set stato_rapporto = randomized.next_stato
from randomized
where rapporti.id = randomized.id;
