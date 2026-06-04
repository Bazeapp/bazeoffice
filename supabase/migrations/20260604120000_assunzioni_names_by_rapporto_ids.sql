-- Risolve i nomi anagrafici dalle assunzioni collegate a un insieme di
-- rapporti. Usata dal frontend per comporre il nome del rapporto dando
-- priorità al nominativo del form di assunzione (datore e lavoratore), con
-- fallback gestito lato client. Sola lettura, SECURITY DEFINER come le altre
-- board RPC.
create or replace function public.assunzioni_names_by_rapporto_ids(p_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(
    jsonb_object_agg(
      rl.id,
      jsonb_build_object(
        'datore', case when ad.id is null then null else jsonb_build_object(
          'info_anagrafiche_cognome', ad.info_anagrafiche_cognome,
          'info_anagrafiche_nome', ad.info_anagrafiche_nome
        ) end,
        'lavoratore', case when al.id is null then null else jsonb_build_object(
          'info_anagrafiche_cognome', al.info_anagrafiche_cognome,
          'info_anagrafiche_nome', al.info_anagrafiche_nome
        ) end
      )
    ),
    '{}'::jsonb
  )
  from public.rapporti_lavorativi rl
  left join public.assunzioni ad on ad.id = rl.assunzione_datore_id
  left join public.assunzioni al on al.id = rl.assunzione_lavoratore_id
  where rl.id = any(p_ids);
$function$;
