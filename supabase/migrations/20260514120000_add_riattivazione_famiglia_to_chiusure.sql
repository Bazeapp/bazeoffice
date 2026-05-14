alter table public.chiusure_contratti
  add column if not exists stato_riattivazione_famiglia text default 'da sentire';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chiusure_contratti_stato_riattivazione_famiglia_check'
      and conrelid = 'public.chiusure_contratti'::regclass
  ) then
    alter table public.chiusure_contratti
      add constraint chiusure_contratti_stato_riattivazione_famiglia_check
      check (
        stato_riattivazione_famiglia is null
        or stato_riattivazione_famiglia in (
          'da sentire',
          'in attesa',
          'riattivato',
          'non riattiva'
        )
      );
  end if;
end $$;
