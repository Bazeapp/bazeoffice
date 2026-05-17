create temp table if not exists lookup_key_contamination (
  entity_table text,
  entity_field text,
  record_id text,
  saved_value_key text,
  expected_label text
) on commit drop;

truncate lookup_key_contamination;

do $$
declare
  lookup_field record;
begin
  for lookup_field in
    select
      lv.entity_table,
      lv.entity_field,
      c.data_type
    from public.lookup_values lv
    join information_schema.columns c
      on c.table_schema = 'public'
     and c.table_name = lv.entity_table
     and c.column_name = lv.entity_field
    where lv.is_active = true
      and coalesce(lv.value_key, '') <> coalesce(lv.value_label, '')
      and c.data_type in ('text', 'ARRAY')
    group by lv.entity_table, lv.entity_field, c.data_type
  loop
    if lookup_field.data_type = 'text' then
      execute format(
        $sql$
          insert into lookup_key_contamination (
            entity_table,
            entity_field,
            record_id,
            saved_value_key,
            expected_label
          )
          select
            %L,
            %L,
            target.id::text,
            lookup_value.value_key,
            lookup_value.value_label
          from public.%I as target
          join public.lookup_values as lookup_value
            on lookup_value.entity_table = %L
           and lookup_value.entity_field = %L
           and lookup_value.is_active = true
           and lookup_value.value_key is not null
           and lookup_value.value_label is not null
           and lookup_value.value_key <> lookup_value.value_label
           and target.%I = lookup_value.value_key
        $sql$,
        lookup_field.entity_table,
        lookup_field.entity_field,
        lookup_field.entity_table,
        lookup_field.entity_table,
        lookup_field.entity_field,
        lookup_field.entity_field
      );
    else
      execute format(
        $sql$
          insert into lookup_key_contamination (
            entity_table,
            entity_field,
            record_id,
            saved_value_key,
            expected_label
          )
          select
            %L,
            %L,
            target.id::text,
            lookup_value.value_key,
            lookup_value.value_label
          from public.%I as target
          cross join lateral unnest(target.%I) as element(value)
          join public.lookup_values as lookup_value
            on lookup_value.entity_table = %L
           and lookup_value.entity_field = %L
           and lookup_value.is_active = true
           and lookup_value.value_key is not null
           and lookup_value.value_label is not null
           and lookup_value.value_key <> lookup_value.value_label
           and element.value = lookup_value.value_key
        $sql$,
        lookup_field.entity_table,
        lookup_field.entity_field,
        lookup_field.entity_table,
        lookup_field.entity_field,
        lookup_field.entity_table,
        lookup_field.entity_field
      );
    end if;
  end loop;
end $$;

select
  entity_table,
  entity_field,
  saved_value_key,
  expected_label,
  count(*) as rows
from lookup_key_contamination
group by entity_table, entity_field, saved_value_key, expected_label
order by entity_table, entity_field, rows desc, saved_value_key;
