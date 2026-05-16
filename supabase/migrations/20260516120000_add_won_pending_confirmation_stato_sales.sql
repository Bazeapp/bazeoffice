do $$
declare
  stato_sales_type_oid oid;
begin
  select attribute.atttypid
    into stato_sales_type_oid
  from pg_attribute as attribute
  join pg_class as class
    on class.oid = attribute.attrelid
  join pg_namespace as schema
    on schema.oid = class.relnamespace
  join pg_type as pgtype
    on pgtype.oid = attribute.atttypid
  where schema.nspname = 'public'
    and class.relname = 'processi_matching'
    and attribute.attname = 'stato_sales'
    and pgtype.typtype = 'e'
  limit 1;

  if stato_sales_type_oid is not null
    and not exists (
      select 1
      from pg_enum
      where enumtypid = stato_sales_type_oid
        and enumlabel = 'won_in_attesa_di_conferma'
    )
  then
    execute format(
      'alter type %s add value %L',
      stato_sales_type_oid::regtype,
      'won_in_attesa_di_conferma'
    );
  end if;
end $$;

with desired_stage_order (value_key, sort_order) as (
  values
    ('won_in_attesa_di_conferma', 12),
    ('won_ricerca_attivata', 13),
    ('lost', 14),
    ('out_of_target', 15)
)
update public.lookup_values as lookup_value
set sort_order = desired_stage_order.sort_order
from desired_stage_order
where lookup_value.entity_table = 'processi_matching'
  and lookup_value.entity_field = 'stato_sales'
  and lookup_value.value_key = desired_stage_order.value_key;

with desired_value as (
  select
    'processi_matching'::text as entity_table,
    'stato_sales'::text as entity_field,
    'won_in_attesa_di_conferma'::text as value_key,
    'WON - In attesa di conferma'::text as value_label,
    12::integer as sort_order,
    true as is_active,
    '{"color":"emerald","filter_type":"enum"}'::jsonb as metadata
)
update public.lookup_values as lookup_value
set
  value_label = desired_value.value_label,
  sort_order = desired_value.sort_order,
  is_active = desired_value.is_active,
  metadata = desired_value.metadata
from desired_value
where lookup_value.entity_table = desired_value.entity_table
  and lookup_value.entity_field = desired_value.entity_field
  and lookup_value.value_key = desired_value.value_key;

with desired_value as (
  select
    'processi_matching'::text as entity_table,
    'stato_sales'::text as entity_field,
    'won_in_attesa_di_conferma'::text as value_key,
    'WON - In attesa di conferma'::text as value_label,
    12::integer as sort_order,
    true as is_active,
    '{"color":"emerald","filter_type":"enum"}'::jsonb as metadata
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
  desired_value.entity_table,
  desired_value.entity_field,
  desired_value.value_key,
  desired_value.value_label,
  desired_value.sort_order,
  desired_value.is_active,
  desired_value.metadata
from desired_value
where not exists (
  select 1
  from public.lookup_values as lookup_value
  where lookup_value.entity_table = desired_value.entity_table
    and lookup_value.entity_field = desired_value.entity_field
    and lookup_value.value_key = desired_value.value_key
);
