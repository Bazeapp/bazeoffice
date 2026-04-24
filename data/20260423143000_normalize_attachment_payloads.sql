create or replace function public.attachment_path_from_public_url(raw_url text)
returns text
language plpgsql
immutable
as $$
declare
  marker constant text := '/storage/v1/object/public/';
  marker_index integer;
  normalized_path text;
begin
  if raw_url is null or btrim(raw_url) = '' then
    return null;
  end if;

  marker_index := strpos(raw_url, marker);
  if marker_index = 0 then
    return null;
  end if;

  normalized_path := substr(raw_url, marker_index + length(marker));
  normalized_path := regexp_replace(normalized_path, '^/+', '');
  normalized_path := replace(normalized_path, '%20', ' ');

  if normalized_path = '' then
    return null;
  end if;

  return normalized_path;
end;
$$;

create or replace function public.normalize_attachment_path(raw_path text, bucket_name text default 'baze-bucket')
returns text
language plpgsql
immutable
as $$
declare
  normalized_path text;
begin
  if raw_path is null or btrim(raw_path) = '' then
    return null;
  end if;

  normalized_path := btrim(raw_path);
  if normalized_path ~* '^https?://' then
    normalized_path := public.attachment_path_from_public_url(normalized_path);
  end if;

  if normalized_path is null or normalized_path = '' then
    return null;
  end if;

  normalized_path := regexp_replace(normalized_path, '^/+', '');

  if normalized_path like bucket_name || '/%' then
    return normalized_path;
  end if;

  return bucket_name || '/' || normalized_path;
end;
$$;

create or replace function public.normalize_attachment_item(raw_item jsonb, fallback_bucket text default 'baze-bucket')
returns jsonb
language plpgsql
immutable
as $$
declare
  source jsonb;
  bucket_name text;
  normalized_path text;
  normalized_name text;
  normalized_type text;
begin
  if raw_item is null or jsonb_typeof(raw_item) <> 'object' then
    return null;
  end if;

  source := raw_item;
  bucket_name := coalesce(nullif(btrim(source ->> 'bucket'), ''), fallback_bucket);
  normalized_path := public.normalize_attachment_path(
    coalesce(
      nullif(btrim(source ->> 'path'), ''),
      nullif(btrim(source ->> 'public_url'), ''),
      nullif(btrim(source ->> 'url'), ''),
      nullif(btrim(source ->> 'download_url'), ''),
      nullif(btrim(source ->> 'src'), '')
    ),
    bucket_name
  );

  if normalized_path is null then
    return null;
  end if;

  normalized_name := coalesce(
    nullif(btrim(source ->> 'name'), ''),
    nullif(btrim(source ->> 'file_name'), ''),
    nullif(btrim(source ->> 'filename'), ''),
    nullif(btrim(source ->> 'original_filename'), ''),
    nullif(btrim(source ->> 'title'), ''),
    regexp_replace(normalized_path, '^.*/', '')
  );

  normalized_type := coalesce(
    nullif(btrim(source ->> 'type'), ''),
    nullif(btrim(source ->> 'content_type'), ''),
    'application/octet-stream'
  );

  return jsonb_build_object(
    'name', normalized_name,
    'path', normalized_path,
    'type', normalized_type
  );
end;
$$;

create or replace function public.normalize_attachment_value(raw_value jsonb, fallback_bucket text default 'baze-bucket')
returns jsonb
language plpgsql
immutable
as $$
declare
  normalized_item jsonb;
  normalized_array jsonb;
begin
  if raw_value is null or jsonb_typeof(raw_value) = 'null' then
    return null;
  end if;

  if jsonb_typeof(raw_value) = 'object' then
    normalized_item := public.normalize_attachment_item(raw_value, fallback_bucket);
    if normalized_item is null then
      return null;
    end if;
    return jsonb_build_array(normalized_item);
  end if;

  if jsonb_typeof(raw_value) = 'array' then
    select jsonb_agg(item order by ordinality)
    into normalized_array
    from (
      select ordinality, public.normalize_attachment_item(value, fallback_bucket) as item
      from jsonb_array_elements(raw_value) with ordinality
    ) normalized_items
    where item is not null;

    return normalized_array;
  end if;

  return null;
end;
$$;

with normalized as (
  select ctid, public.normalize_attachment_value(delega_inps_allegati) as value
  from assunzioni
  where delega_inps_allegati is not null
)
update assunzioni target
set delega_inps_allegati = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.delega_inps_allegati;

with normalized as (
  select ctid, public.normalize_attachment_value(allegato_compilato) as value
  from chiusure_contratti
  where allegato_compilato is not null
)
update chiusure_contratti target
set allegato_compilato = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.allegato_compilato;

with normalized as (
  select ctid, public.normalize_attachment_value(documenti_chiusura_rapporto) as value
  from chiusure_contratti
  where documenti_chiusura_rapporto is not null
)
update chiusure_contratti target
set documenti_chiusura_rapporto = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.documenti_chiusura_rapporto;

with normalized as (
  select ctid, public.normalize_attachment_value(allegato) as value
  from contributi_inps
  where allegato is not null
)
update contributi_inps target
set allegato = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.allegato;

with normalized as (
  select ctid, public.normalize_attachment_value(allegato_codice_fiscale_fronte) as value
  from documenti_lavoratori
  where allegato_codice_fiscale_fronte is not null
)
update documenti_lavoratori target
set allegato_codice_fiscale_fronte = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.allegato_codice_fiscale_fronte;

with normalized as (
  select ctid, public.normalize_attachment_value(allegato_codice_fiscale_retro) as value
  from documenti_lavoratori
  where allegato_codice_fiscale_retro is not null
)
update documenti_lavoratori target
set allegato_codice_fiscale_retro = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.allegato_codice_fiscale_retro;

with normalized as (
  select ctid, public.normalize_attachment_value(allegato_documento_identita_fronte) as value
  from documenti_lavoratori
  where allegato_documento_identita_fronte is not null
)
update documenti_lavoratori target
set allegato_documento_identita_fronte = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.allegato_documento_identita_fronte;

with normalized as (
  select ctid, public.normalize_attachment_value(allegato_documento_identita_retro) as value
  from documenti_lavoratori
  where allegato_documento_identita_retro is not null
)
update documenti_lavoratori target
set allegato_documento_identita_retro = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.allegato_documento_identita_retro;

with normalized as (
  select ctid, public.normalize_attachment_value(allegato_permesso_di_soggiorno_fronte) as value
  from documenti_lavoratori
  where allegato_permesso_di_soggiorno_fronte is not null
)
update documenti_lavoratori target
set allegato_permesso_di_soggiorno_fronte = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.allegato_permesso_di_soggiorno_fronte;

with normalized as (
  select ctid, public.normalize_attachment_value(allegato_permesso_di_soggiorno_retro) as value
  from documenti_lavoratori
  where allegato_permesso_di_soggiorno_retro is not null
)
update documenti_lavoratori target
set allegato_permesso_di_soggiorno_retro = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.allegato_permesso_di_soggiorno_retro;

with normalized as (
  select ctid, public.normalize_attachment_value(allegato_ricevuta_rinnovo_permesso) as value
  from documenti_lavoratori
  where allegato_ricevuta_rinnovo_permesso is not null
)
update documenti_lavoratori target
set allegato_ricevuta_rinnovo_permesso = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.allegato_ricevuta_rinnovo_permesso;

with normalized as (
  select ctid, public.normalize_attachment_value(foto) as value
  from lavoratori
  where foto is not null
)
update lavoratori target
set foto = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.foto;

with normalized as (
  select ctid, public.normalize_attachment_value(cedolino) as value
  from mesi_lavorati
  where cedolino is not null
)
update mesi_lavorati target
set cedolino = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.cedolino;

with normalized as (
  select ctid, public.normalize_attachment_value(accordo_di_lavoro_allegati) as value
  from rapporti_lavorativi
  where accordo_di_lavoro_allegati is not null
)
update rapporti_lavorativi target
set accordo_di_lavoro_allegati = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.accordo_di_lavoro_allegati;

with normalized as (
  select ctid, public.normalize_attachment_value(ricevuta_inps_allegati) as value
  from rapporti_lavorativi
  where ricevuta_inps_allegati is not null
)
update rapporti_lavorativi target
set ricevuta_inps_allegati = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.ricevuta_inps_allegati;

with normalized as (
  select ctid, public.normalize_attachment_value(allegati) as value
  from ticket
  where allegati is not null
)
update ticket target
set allegati = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.allegati;

with normalized as (
  select ctid, public.normalize_attachment_value(accordo_variazione_contrattuale) as value
  from variazioni_contrattuali
  where accordo_variazione_contrattuale is not null
)
update variazioni_contrattuali target
set accordo_variazione_contrattuale = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.accordo_variazione_contrattuale;

with normalized as (
  select ctid, public.normalize_attachment_value(ricevuta_inps_variazione_rapporto) as value
  from variazioni_contrattuali
  where ricevuta_inps_variazione_rapporto is not null
)
update variazioni_contrattuali target
set ricevuta_inps_variazione_rapporto = normalized.value
from normalized
where target.ctid = normalized.ctid
  and normalized.value is distinct from target.ricevuta_inps_variazione_rapporto;
