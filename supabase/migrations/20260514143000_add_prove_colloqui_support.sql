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
  ('rapporti_lavorativi', 'prova_stato_cs', 'Chiamare famiglia — pre-prova', 'Chiamare famiglia — pre-prova', 10, true, '{"color":"sky","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_stato_cs', 'Chiamare lavoratore — pre-prova', 'Chiamare lavoratore — pre-prova', 20, true, '{"color":"blue","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_stato_cs', 'In attesa di inizio prova', 'In attesa di inizio prova', 30, true, '{"color":"amber","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_stato_cs', 'Prova in corso oggi', 'Prova in corso oggi', 40, true, '{"color":"emerald","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_stato_cs', 'Leggere feedback — D2 mattina', 'Leggere feedback — D2 mattina', 50, true, '{"color":"violet","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_stato_cs', 'Chiamare lavoratore — D2', 'Chiamare lavoratore — D2', 60, true, '{"color":"blue","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_stato_cs', 'Chiamare famiglia — D2', 'Chiamare famiglia — D2', 70, true, '{"color":"sky","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_stato_cs', 'Check-in programmato', 'Check-in programmato', 80, true, '{"color":"orange","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_stato_cs', 'Concluso — esito positivo', 'Concluso — esito positivo', 90, true, '{"color":"emerald","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_stato_cs', 'Concluso — esito negativo', 'Concluso — esito negativo', 100, true, '{"color":"rose","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_feedback_famiglia', 'Positivo', 'Positivo', 10, true, '{"color":"emerald","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_feedback_famiglia', 'Criticità', 'Criticità', 20, true, '{"color":"rose","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_feedback_famiglia', 'Nessuna risposta', 'Nessuna risposta', 30, true, '{"color":"zinc","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_feedback_lavoratore', 'Positivo', 'Positivo', 10, true, '{"color":"emerald","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_feedback_lavoratore', 'Criticità', 'Criticità', 20, true, '{"color":"rose","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_feedback_lavoratore', 'Nessuna risposta', 'Nessuna risposta', 30, true, '{"color":"zinc","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_ramo_d2', 'A — famiglia ok', 'A — famiglia ok', 10, true, '{"color":"emerald","filter_type":"enum"}'::jsonb),
  ('rapporti_lavorativi', 'prova_ramo_d2', 'B — famiglia con criticità', 'B — famiglia con criticità', 20, true, '{"color":"amber","filter_type":"enum"}'::jsonb)
on conflict do nothing;
