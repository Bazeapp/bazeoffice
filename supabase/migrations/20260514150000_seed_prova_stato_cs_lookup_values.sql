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
    ('rapporti_lavorativi', 'prova_stato_cs', 'Chiamare famiglia — pre-prova', 'Chiamare famiglia — pre-prova', 10, true, '{"color":"sky","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'Chiamare lavoratore — pre-prova', 'Chiamare lavoratore — pre-prova', 20, true, '{"color":"blue","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'In attesa di inizio prova', 'In attesa di inizio prova', 30, true, '{"color":"amber","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'Prova in corso oggi', 'Prova in corso oggi', 40, true, '{"color":"emerald","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'Leggere feedback — D2 mattina', 'Leggere feedback — D2 mattina', 50, true, '{"color":"violet","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'Chiamare lavoratore — D2', 'Chiamare lavoratore — D2', 60, true, '{"color":"blue","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'Chiamare famiglia — D2', 'Chiamare famiglia — D2', 70, true, '{"color":"sky","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'Check-in programmato', 'Check-in programmato', 80, true, '{"color":"orange","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'Concluso — esito positivo', 'Concluso — esito positivo', 90, true, '{"color":"emerald","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'Concluso — esito negativo', 'Concluso — esito negativo', 100, true, '{"color":"rose","filter_type":"enum"}'::jsonb)
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
    ('rapporti_lavorativi', 'prova_stato_cs', 'Chiamare famiglia — pre-prova', 'Chiamare famiglia — pre-prova', 10, true, '{"color":"sky","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'Chiamare lavoratore — pre-prova', 'Chiamare lavoratore — pre-prova', 20, true, '{"color":"blue","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'In attesa di inizio prova', 'In attesa di inizio prova', 30, true, '{"color":"amber","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'Prova in corso oggi', 'Prova in corso oggi', 40, true, '{"color":"emerald","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'Leggere feedback — D2 mattina', 'Leggere feedback — D2 mattina', 50, true, '{"color":"violet","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'Chiamare lavoratore — D2', 'Chiamare lavoratore — D2', 60, true, '{"color":"blue","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'Chiamare famiglia — D2', 'Chiamare famiglia — D2', 70, true, '{"color":"sky","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'Check-in programmato', 'Check-in programmato', 80, true, '{"color":"orange","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'Concluso — esito positivo', 'Concluso — esito positivo', 90, true, '{"color":"emerald","filter_type":"enum"}'::jsonb),
    ('rapporti_lavorativi', 'prova_stato_cs', 'Concluso — esito negativo', 'Concluso — esito negativo', 100, true, '{"color":"rose","filter_type":"enum"}'::jsonb)
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
