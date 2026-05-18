create index if not exists idx_indirizzi_entity_lookup
  on public.indirizzi (
    entita_tabella,
    entita_id,
    (case when tipo_indirizzo = 'residenza' then 0 else 1 end),
    aggiornato_il desc nulls last,
    creato_il desc nulls last
  )
  include (cap, provincia, indirizzo_formattato);

comment on index public.idx_indirizzi_entity_lookup is
  'Speeds up lateral address lookup by entity in gate1_lavoratori and similar worker detail queries.';
