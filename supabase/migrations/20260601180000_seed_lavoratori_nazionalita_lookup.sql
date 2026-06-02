-- FASE 4 BIS — porta le opzioni nazionalità del filtro Cerca/Gate dentro
-- lookup_values (entity lavoratori.nazionalita), riusando la lista già curata
-- per il CRM (processi_matching.nazionalita_obbligatorie, 144 valori).
-- Così il filtro nazionalità arriva da lookup-values come gli altri filtri e
-- sparisce la chiamata dedicata lavoratori_nazionalita_options.
-- filter_type=multi_enum (coerente col CRM; il matcher RPC gestisce has_any su
-- campo testo). Idempotente: salta i value_key già presenti.
insert into public.lookup_values
  (entity_table, entity_field, value_key, value_label, sort_order, is_active, metadata)
select 'lavoratori', 'nazionalita', src.value_key, src.value_label,
       src.sort_order, src.is_active, src.metadata
from public.lookup_values src
where src.entity_table = 'processi_matching'
  and src.entity_field = 'nazionalita_obbligatorie'
  and not exists (
    select 1 from public.lookup_values dst
    where dst.entity_table = 'lavoratori'
      and dst.entity_field = 'nazionalita'
      and dst.value_key = src.value_key
  );
