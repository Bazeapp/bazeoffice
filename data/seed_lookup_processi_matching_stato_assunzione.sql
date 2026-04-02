insert into lookup_values (
  entity_table,
  entity_field,
  value_key,
  value_label,
  sort_order,
  is_active,
  metadata
)
values
  (
    'processi_matching',
    'stato_assunzione',
    'Avviare pratica',
    'Avviare pratica',
    10,
    true,
    '{"color":"sky"}'::jsonb
  ),
  (
    'processi_matching',
    'stato_assunzione',
    'Inviata richiesta dati',
    'Inviata richiesta dati',
    20,
    true,
    '{"color":"sky"}'::jsonb
  ),
  (
    'processi_matching',
    'stato_assunzione',
    'In attesa di dati famiglia',
    'In attesa di dati famiglia',
    30,
    true,
    '{"color":"teal"}'::jsonb
  ),
  (
    'processi_matching',
    'stato_assunzione',
    'In attesa di dati lavoratore',
    'In attesa di dati lavoratore',
    40,
    true,
    '{"color":"teal"}'::jsonb
  ),
  (
    'processi_matching',
    'stato_assunzione',
    'Dati pronti per assunzione',
    'Dati pronti per assunzione',
    50,
    true,
    '{"color":"amber"}'::jsonb
  ),
  (
    'processi_matching',
    'stato_assunzione',
    'Assunzione fatta',
    'Assunzione fatta',
    60,
    true,
    '{"color":"lime"}'::jsonb
  ),
  (
    'processi_matching',
    'stato_assunzione',
    'Documenti assunzione inviati',
    'Documenti assunzione inviati',
    70,
    true,
    '{"color":"green"}'::jsonb
  ),
  (
    'processi_matching',
    'stato_assunzione',
    'Contratto firmato',
    'Contratto firmato',
    80,
    true,
    '{"color":"green"}'::jsonb
  ),
  (
    'processi_matching',
    'stato_assunzione',
    'Non assume con Baze',
    'Non assume con Baze',
    90,
    true,
    '{"color":"orange"}'::jsonb
  )
on conflict (entity_table, entity_field, value_key)
do update set
  value_label = excluded.value_label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  metadata = excluded.metadata;
