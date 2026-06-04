-- rapporti_lavorativi_board: il nome (datore/lavoratore) dà priorità al
-- nominativo del form di assunzione collegato; la ricerca diventa multi-token
-- (AND su ogni parola) su un testo che include anche i nomi delle assunzioni,
-- così trova i nomi completi anche quando i campi denormalizzati sono vuoti.
create or replace function public.rapporti_lavorativi_board(p_limit integer default 50, p_offset integer default 0, p_search text default null::text, p_status_filter text default null::text)
returns jsonb
language sql
stable security definer
set search_path to 'public'
as $function$
  with params as (
    select
      nullif(trim(p_search), '') as search_value,
      nullif(trim(p_status_filter), '') as status_filter,
      least(greatest(coalesce(p_limit, 50), 0), 100) as limit_value,
      greatest(coalesce(p_offset, 0), 0) as offset_value
  ),
  enriched as (
    select
      rl as rapporto,
      coalesce(
        nullif(trim(concat_ws(' ', ad.info_anagrafiche_cognome, ad.info_anagrafiche_nome)), ''),
        nullif(trim(concat_ws(' ', f.cognome, f.nome)), ''),
        rl.cognome_nome_datore_proper
      ) as famiglia_label,
      coalesce(
        nullif(trim(concat_ws(' ', al.info_anagrafiche_cognome, al.info_anagrafiche_nome)), ''),
        nullif(trim(concat_ws(' ', l.cognome, l.nome)), ''),
        rl.nome_lavoratore_per_url
      ) as lavoratore_label,
      lower(concat_ws(
        ' ',
        rl.id::text,
        rl.id_rapporto,
        rl.cognome_nome_datore_proper,
        rl.nome_lavoratore_per_url,
        rl.codice_datore_webcolf::text,
        rl.codice_dipendente_webcolf::text,
        rl.tipo_contratto,
        rl.tipo_rapporto,
        rl.stato_assunzione,
        f.cognome, f.nome, f.email, f.customer_email, f.secondary_email, f.telefono, f.whatsapp,
        l.cognome, l.nome, l.email, l.telefono,
        ad.info_anagrafiche_cognome, ad.info_anagrafiche_nome,
        al.info_anagrafiche_cognome, al.info_anagrafiche_nome
      )) as search_text,
      c.data_fine_rapporto,
      case
        when lower(coalesce(rl.stato_assunzione, '')) in (
          'assunzione fatta',
          'documenti assunzione inviati',
          'contratto firmato'
        ) then
          case
            when c.data_fine_rapporto is not null
              and c.data_fine_rapporto::date < current_date
              then 'Terminato'
            else 'Attivo'
          end
        when lower(coalesce(rl.stato_assunzione, '')) in (
          'avviare pratica',
          'inviata richiesta dati',
          'in attesa di dati famiglia',
          'in attesa di dati lavoratore',
          'dati pronti per assunzione'
        ) then 'In attivazione'
        when lower(coalesce(rl.stato_assunzione, '')) = 'non assume con baze' then 'Sconosciuto'
        else 'Errore'
      end as stato_rapporto_resolved,
      rl.data_inizio_rapporto,
      rl.ultimo_aggiornamento,
      rl.aggiornato_il,
      rl.id
    from public.rapporti_lavorativi rl
    left join public.famiglie f on f.id = rl.famiglia_id
    left join public.lavoratori l on l.id = rl.lavoratore_id
    left join public.assunzioni ad on ad.id = rl.assunzione_datore_id
    left join public.assunzioni al on al.id = rl.assunzione_lavoratore_id
    left join public.chiusure_contratti c on c.id = rl.fine_rapporto_lavorativo_id
  ),
  filtered as (
    select e.*
    from enriched e
    cross join params p
    where (p.status_filter is null or e.stato_rapporto_resolved = p.status_filter)
      and (
        p.search_value is null
        or not exists (
          select 1
          from unnest(string_to_array(lower(trim(p.search_value)), ' ')) as tok
          where tok <> '' and e.search_text not like '%' || tok || '%'
        )
      )
  ),
  counted as (
    select count(*)::integer as total
    from filtered
  ),
  paged as (
    select f.*
    from filtered f
    order by
      case f.stato_rapporto_resolved
        when 'In attivazione' then 0
        when 'Attivo' then 1
        when 'Terminato' then 2
        when 'Sconosciuto' then 3
        else 4
      end,
      f.data_inizio_rapporto desc nulls last,
      f.ultimo_aggiornamento desc nulls last,
      f.aggiornato_il desc nulls last,
      f.id
    limit (select limit_value from params)
    offset (select offset_value from params)
  )
  select jsonb_build_object(
    'rows',
      coalesce(
        (
          select jsonb_agg(
            to_jsonb(p.rapporto)
              || jsonb_build_object(
                'cognome_nome_datore_proper', p.famiglia_label,
                'nome_lavoratore_per_url', p.lavoratore_label,
                'data_fine_rapporto', p.data_fine_rapporto,
                'stato_rapporto', p.stato_rapporto_resolved
              )
            order by
              case p.stato_rapporto_resolved
                when 'In attivazione' then 0
                when 'Attivo' then 1
                when 'Terminato' then 2
                when 'Sconosciuto' then 3
                else 4
              end,
              p.data_inizio_rapporto desc nulls last,
              p.ultimo_aggiornamento desc nulls last,
              p.aggiornato_il desc nulls last,
              p.id
          )
          from paged p
        ),
        '[]'::jsonb
      ),
    'total', (select total from counted)
  );
$function$;
