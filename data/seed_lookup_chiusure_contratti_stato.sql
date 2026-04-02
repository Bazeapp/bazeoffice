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
    'chiusure_contratti',
    'stato',
    'Lavoratore comunica dimissioni',
    'Lavoratore comunica dimissioni',
    10,
    true,
    '{"color":"violet"}'::jsonb
  ),
  (
    'chiusure_contratti',
    'stato',
    'Datore comunica licenziamento',
    'Datore comunica licenziamento',
    20,
    true,
    '{"color":"zinc"}'::jsonb
  ),
  (
    'chiusure_contratti',
    'stato',
    'Inviato comunicazione per firma documento',
    'Inviato comunicazione per firma documento',
    30,
    true,
    '{"color":"sky"}'::jsonb
  ),
  (
    'chiusure_contratti',
    'stato',
    'Ricevuto documento firmato',
    'Ricevuto documento firmato',
    40,
    true,
    '{"color":"lime"}'::jsonb
  ),
  (
    'chiusure_contratti',
    'stato',
    'Chiusura elaborata',
    'Chiusura elaborata',
    50,
    true,
    '{"color":"amber"}'::jsonb
  ),
  (
    'chiusure_contratti',
    'stato',
    'Inviato documenti di chiusura',
    'Inviato documenti di chiusura',
    60,
    true,
    '{"color":"lime"}'::jsonb
  ),
  (
    'chiusure_contratti',
    'stato',
    'Richiesta chiarimenti famiglia',
    'Richiesta chiarimenti famiglia',
    70,
    true,
    '{"color":"orange"}'::jsonb
  ),
  (
    'chiusure_contratti',
    'stato',
    'Chiusura terminata',
    'Chiusura terminata',
    80,
    true,
    '{"color":"green"}'::jsonb
  )
on conflict (entity_table, entity_field, value_key)
do update set
  value_label = excluded.value_label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  metadata = excluded.metadata;
