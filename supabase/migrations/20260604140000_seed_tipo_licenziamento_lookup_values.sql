-- Valori (e colori) per "Tipo licenziamento/dimissione" delle chiusure.
-- Popola lookup_values così la select nella sheet è data-driven come lo stato.
insert into public.lookup_values (entity_table, entity_field, value_key, value_label, sort_order, is_active, metadata)
values
  ('chiusure_contratti','tipo_licenziamento','Mancato superamento periodo di prova','Mancato superamento periodo di prova',10,true,'{"color":"zinc","filter_type":"enum"}'),
  ('chiusure_contratti','tipo_licenziamento','Licenziamento con preavviso','Licenziamento con preavviso',20,true,'{"color":"amber","filter_type":"enum"}'),
  ('chiusure_contratti','tipo_licenziamento','Licenziamento senza preavviso','Licenziamento senza preavviso',30,true,'{"color":"amber","filter_type":"enum"}'),
  ('chiusure_contratti','tipo_licenziamento','Dimissioni durante il periodo di prova','Dimissioni durante il periodo di prova',40,true,'{"color":"zinc","filter_type":"enum"}'),
  ('chiusure_contratti','tipo_licenziamento','Dimissioni con preavviso','Dimissioni con preavviso',50,true,'{"color":"green","filter_type":"enum"}'),
  ('chiusure_contratti','tipo_licenziamento','Dimissioni senza preavviso','Dimissioni senza preavviso',60,true,'{"color":"orange","filter_type":"enum"}'),
  ('chiusure_contratti','tipo_licenziamento','Fine contratto a tempo determinato','Fine contratto a tempo determinato',70,true,'{"color":"sky","filter_type":"enum"}'),
  ('chiusure_contratti','tipo_licenziamento','Rescissione abbonamento','Rescissione abbonamento',80,true,'{"color":"red","filter_type":"enum"}'),
  ('chiusure_contratti','tipo_licenziamento','Annullamento contratto','Annullamento contratto',90,true,'{"color":"zinc","filter_type":"enum"}')
on conflict (entity_table, entity_field, value_key) do update
set value_label = excluded.value_label,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    metadata = excluded.metadata,
    updated_at = now();
