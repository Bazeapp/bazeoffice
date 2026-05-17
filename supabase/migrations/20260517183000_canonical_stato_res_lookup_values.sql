with canonical(value_key, value_label, sort_order, color) as (
  values
    ('da_assegnare', 'da assegnare', 10, 'amber'),
    ('fare_ricerca', 'fare ricerca', 20, 'yellow'),
    ('in_preparazione_per_invio', 'in preparazione per invio', 30, 'cyan'),
    ('inviare_selezione', 'inviare selezione', 40, 'sky'),
    (
      'selezione_inviata,_in_attesa_di_feedback',
      'selezione inviata, in attesa di feedback',
      50,
      'blue'
    ),
    ('fase_di_colloqui', 'fase di colloqui', 60, 'red'),
    ('in_prova_con_lavoratore', 'in prova con lavoratore', 70, 'orange'),
    ('match', 'match', 80, 'emerald'),
    ('no_match', 'no match', 90, 'red'),
    ('stand_by', 'stand by', 100, 'green')
),
updated as (
  update public.lookup_values as lookup_value
  set
    value_label = canonical.value_label,
    sort_order = canonical.sort_order,
    is_active = true,
    metadata = jsonb_set(
      coalesce(lookup_value.metadata, '{}'::jsonb) || '{"filter_type":"enum"}'::jsonb,
      '{color}',
      to_jsonb(canonical.color),
      true
    ),
    updated_at = now()
  from canonical
  where lookup_value.entity_table = 'processi_matching'
    and lookup_value.entity_field = 'stato_res'
    and lookup_value.value_key = canonical.value_key
  returning lookup_value.value_key
),
inserted as (
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
    'processi_matching',
    'stato_res',
    canonical.value_key,
    canonical.value_label,
    canonical.sort_order,
    true,
    jsonb_build_object('color', canonical.color, 'filter_type', 'enum')
  from canonical
  where not exists (
    select 1
    from public.lookup_values as lookup_value
    where lookup_value.entity_table = 'processi_matching'
      and lookup_value.entity_field = 'stato_res'
      and lookup_value.value_key = canonical.value_key
  )
  returning value_key
)
update public.lookup_values as lookup_value
set
  is_active = false,
  updated_at = now()
where lookup_value.entity_table = 'processi_matching'
  and lookup_value.entity_field = 'stato_res'
  and not exists (
    select 1
    from canonical
    where canonical.value_key = lookup_value.value_key
  );
