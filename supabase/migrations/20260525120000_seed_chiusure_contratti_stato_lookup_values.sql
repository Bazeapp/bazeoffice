-- Seed canonical lookup_values rows for chiusure_contratti.stato so the kanban
-- stages (including the new "Chiusura pronta" column) are governed by the
-- lookup table on par with the other board entities (variazioni, assunzioni,
-- processi_matching, ...). The board still falls back to the hard-coded
-- DEFAULT_STAGE_DEFINITIONS array in `src/hooks/use-chiusure-board.ts` for the
-- column order, but label/color overrides will now flow through the lookup.

with desired_values (
  entity_table,
  entity_field,
  value_key,
  value_label,
  sort_order,
  is_active,
  metadata
) as (
  values
    ('chiusure_contratti', 'stato', 'Lavoratore comunica dimissioni', 'Lavoratore comunica dimissioni', 10, true, '{"color":"violet","filter_type":"enum"}'::jsonb),
    ('chiusure_contratti', 'stato', 'Datore comunica licenziamento', 'Datore comunica licenziamento', 20, true, '{"color":"zinc","filter_type":"enum"}'::jsonb),
    ('chiusure_contratti', 'stato', 'Inviato comunicazione per firma documento', 'Inviato comunicazione per firma documento', 30, true, '{"color":"sky","filter_type":"enum"}'::jsonb),
    ('chiusure_contratti', 'stato', 'Chiusura pronta', 'Chiusura pronta', 40, true, '{"color":"cyan","filter_type":"enum"}'::jsonb),
    ('chiusure_contratti', 'stato', 'Ricevuto documento firmato', 'Ricevuto documento firmato', 50, true, '{"color":"lime","filter_type":"enum"}'::jsonb),
    ('chiusure_contratti', 'stato', 'Chiusura elaborata', 'Chiusura elaborata', 60, true, '{"color":"amber","filter_type":"enum"}'::jsonb),
    ('chiusure_contratti', 'stato', 'Inviato documenti di chiusura', 'Inviato documenti di chiusura', 70, true, '{"color":"lime","filter_type":"enum"}'::jsonb),
    ('chiusure_contratti', 'stato', 'Richiesta chiarimenti famiglia', 'Richiesta chiarimenti famiglia', 80, true, '{"color":"orange","filter_type":"enum"}'::jsonb),
    ('chiusure_contratti', 'stato', 'Chiusura terminata', 'Chiusura terminata', 90, true, '{"color":"green","filter_type":"enum"}'::jsonb)
)
update public.lookup_values as lookup_value
set
  value_label = desired_values.value_label,
  sort_order = desired_values.sort_order,
  is_active = desired_values.is_active,
  metadata = desired_values.metadata
from desired_values
where lookup_value.entity_table = desired_values.entity_table
  and lookup_value.entity_field = desired_values.entity_field
  and lookup_value.value_key = desired_values.value_key;

with desired_values (
  entity_table,
  entity_field,
  value_key,
  value_label,
  sort_order,
  is_active,
  metadata
) as (
  values
    ('chiusure_contratti', 'stato', 'Lavoratore comunica dimissioni', 'Lavoratore comunica dimissioni', 10, true, '{"color":"violet","filter_type":"enum"}'::jsonb),
    ('chiusure_contratti', 'stato', 'Datore comunica licenziamento', 'Datore comunica licenziamento', 20, true, '{"color":"zinc","filter_type":"enum"}'::jsonb),
    ('chiusure_contratti', 'stato', 'Inviato comunicazione per firma documento', 'Inviato comunicazione per firma documento', 30, true, '{"color":"sky","filter_type":"enum"}'::jsonb),
    ('chiusure_contratti', 'stato', 'Chiusura pronta', 'Chiusura pronta', 40, true, '{"color":"cyan","filter_type":"enum"}'::jsonb),
    ('chiusure_contratti', 'stato', 'Ricevuto documento firmato', 'Ricevuto documento firmato', 50, true, '{"color":"lime","filter_type":"enum"}'::jsonb),
    ('chiusure_contratti', 'stato', 'Chiusura elaborata', 'Chiusura elaborata', 60, true, '{"color":"amber","filter_type":"enum"}'::jsonb),
    ('chiusure_contratti', 'stato', 'Inviato documenti di chiusura', 'Inviato documenti di chiusura', 70, true, '{"color":"lime","filter_type":"enum"}'::jsonb),
    ('chiusure_contratti', 'stato', 'Richiesta chiarimenti famiglia', 'Richiesta chiarimenti famiglia', 80, true, '{"color":"orange","filter_type":"enum"}'::jsonb),
    ('chiusure_contratti', 'stato', 'Chiusura terminata', 'Chiusura terminata', 90, true, '{"color":"green","filter_type":"enum"}'::jsonb)
)
insert into public.lookup_values (
  entity_table,
  entity_field,
  value_key,
  value_label,
  sort_order,
  is_active,
  metadata
)
select
  desired_values.entity_table,
  desired_values.entity_field,
  desired_values.value_key,
  desired_values.value_label,
  desired_values.sort_order,
  desired_values.is_active,
  desired_values.metadata
from desired_values
where not exists (
  select 1
  from public.lookup_values as lookup_value
  where lookup_value.entity_table = desired_values.entity_table
    and lookup_value.entity_field = desired_values.entity_field
    and lookup_value.value_key = desired_values.value_key
);
