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
          update public.%I as target
          set %I = lookup_value.value_label
          from public.lookup_values as lookup_value
          where lookup_value.entity_table = %L
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
        lookup_field.entity_field,
        lookup_field.entity_field
      );
    else
      execute format(
        $sql$
          update public.%I as target
          set %I = mapped.values
          from (
            select
              source.id,
              array_agg(
                coalesce(lookup_value.value_label, element.value)
                order by element.ordinality
              ) as values
            from public.%I as source
            cross join lateral unnest(source.%I) with ordinality as element(value, ordinality)
            left join public.lookup_values as lookup_value
              on lookup_value.entity_table = %L
             and lookup_value.entity_field = %L
             and lookup_value.is_active = true
             and lookup_value.value_key = element.value
             and lookup_value.value_key <> lookup_value.value_label
            where source.%I is not null
            group by source.id
            having bool_or(lookup_value.value_label is not null)
          ) as mapped
          where target.id = mapped.id
        $sql$,
        lookup_field.entity_table,
        lookup_field.entity_field,
        lookup_field.entity_table,
        lookup_field.entity_field,
        lookup_field.entity_table,
        lookup_field.entity_field,
        lookup_field.entity_field
      );
    end if;
  end loop;
end $$;
