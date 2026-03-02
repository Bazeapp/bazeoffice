| Sezione UI | Campo UI | Colonna processi_matching | Stato |
|---|---|---|---|
| Stato Lead | Stato lead/stadio | stato_sales | OK |
| Stato Lead | Tentativi chiamata (HOT attesa) | sales_cold_call_followup | OK |
| Stato Lead | Tentativi chiamata (HOT no-show) | sales_no_show_followup | OK |
| Stato Lead | Motivazione LOST | motivazione_lost | OK |
| Stato Lead | Motivazione OUT OF TARGET | motivazione_oot | OK |
| Stato Lead | Note (LOST/OOT/COLD) | appunti_chiamata_sales | OK |
| Stato Lead | Data ricontatto (COLD) | data_per_ricerca_futura | OK |
| Stato Lead | Data chiamata prenotata | famiglie.data_call_prenotata | OK |
| Onboarding - Orari e frequenza | Orario di lavoro | orario_di_lavoro | OK |
| Onboarding - Orari e frequenza | Ore settimanali | ore_settimanale | OK |
| Onboarding - Orari e frequenza | Giorni settimanali | numero_giorni_settimanali | OK |
| Onboarding - Orari e frequenza | Giornate preferite | preferenza_giorno | OK |
| Onboarding - Decisione lavoro | Famiglia (note) | nucleo_famigliare | OK |
| Onboarding - Decisione lavoro | Sono presenti neonati | DA CREARE | DA CREARE |
| Onboarding - Decisione lavoro | Accudire più di un bambino | DA CREARE | DA CREARE |
| Onboarding - Decisione lavoro | Famiglia 4+ persone | DA CREARE | DA CREARE |
| Onboarding - Decisione lavoro | Casa (descrizione) | descrizione_casa | OK |
| Onboarding - Decisione lavoro | Casa >200 mq | DA CREARE | DA CREARE |
| Onboarding - Decisione lavoro | Specificare quanto (mq) | metratura_casa | OK |
| Onboarding - Decisione lavoro | Animali (descrizione) | descrizione_animali_in_casa | OK |
| Onboarding - Decisione lavoro | Ci sono cani/gatti | presenza_animali_in_casa | DA CREARE |
| Onboarding - Decisione lavoro | Mansioni (note) | mansioni_richieste | OK |
| Onboarding - Decisione lavoro | Ripiani alti | DA CREARE | DA CREARE |
| Onboarding - Decisione lavoro | Stirare | DA CREARE | DA CREARE |
| Onboarding - Decisione lavoro | Cucinare | DA CREARE | DA CREARE |
| Onboarding - Decisione lavoro | Cura giardino | DA CREARE | DA CREARE |
| Onboarding - Decisione lavoro | Comunicazione italiano/inglese | DA CREARE | DA CREARE |
| Onboarding - Decisione lavoro | Richieste specifiche lavoratore | DA CREARE | DA CREARE |
| Onboarding - Decisione lavoro | Genere | sesso (text + lookup singolo: donna/uomo/preferisco_non_dire) | OK |
| Onboarding - Decisione lavoro | Richiesta patente | richiesta_patente | OK |
| Onboarding - Decisione lavoro | Nazionalità escluse | onb_nazionalita_escluse | DA CREARE |
| Onboarding - Decisione lavoro | Nazionalità obbligatorie | onb_nazionalita_obbligatorie | DA CREARE |
| Onboarding - Decisione lavoro | Età min | eta_minima | OK |
| Onboarding - Decisione lavoro | Età max | eta_massima | OK |
| Onboarding - Decisione lavoro | Altre info | informazioni_extra_riservate | OK |
| Onboarding - Decisione lavoro | Trasferte | richiesta_trasferte | OK |
| Onboarding - Decisione lavoro | Famiglia molto esigente | DA CREARE | DA CREARE |
| Onboarding - Decisione lavoro | Richiesta autonomia | DA CREARE | DA CREARE |
| Onboarding - Decisione lavoro | Datore spesso presente | DA CREARE | DA CREARE |
| Onboarding - Decisione lavoro | Richiesta discrezione | DA CREARE | DA CREARE |
| Onboarding - Luogo di lavoro | Luogo | luogo_id | ~ |
| Onboarding - Luogo di lavoro | Provincia | indirizzo_prova_provincia | ~ |
| Onboarding - Luogo di lavoro | CAP | indirizzo_prova_cap | ~ |
| Onboarding - Luogo di lavoro | Provincia caricata da utente | DA CREARE | DA CREARE |
| Onboarding - Luogo di lavoro | Quartiere - Milano - CAP | indirizzo_prova_note | ~ |
| Onboarding - Luogo di lavoro | Indirizzo completo | indirizzo_prova_via + indirizzo_prova_civico + indirizzo_prova_comune + indirizzo_prova_cap | ~ |
| Onboarding - Luogo di lavoro | Indirizzo formattato Google | DA CREARE | DA CREARE |
| Onboarding - Luogo di lavoro | SRC Maps | NO | NO |
| Onboarding - Luogo di lavoro | Link corretto maps | src_embed_maps_annucio | OK |
| Onboarding - Tempistiche | Deadline | deadline_mobile | OK |
| Onboarding - Tempistiche | 3 | disponibilita_colloqui_in_presenza | OK |
| Onboarding - Tempistiche | Tipologia primo incontro | tipo_incontro_famiglia_lavoratore | OK |
| Onboarding - Tempistiche | Preventivo da inviare (link) | DA CREARE | DA CREARE |
| Creazione Annuncio | Titolo | titolo_annuncio | OK |
| Creazione Annuncio | Descrizione SEO | descrizione_seo_webflow | OK |
| Creazione Annuncio | Slug | brainstorm_slug | OK |
| Creazione Annuncio | URL annuncio | annuncio_webflow | OK |
| Creazione Annuncio | Body annuncio | testo_annuncio_webflow | OK |
| Creazione Annuncio | Testo WhatsApp | testo_annuncio_whatsapp | OK |

## Regole DB per le domande

- Usa `boolean` solo per domande sì/no pure.
- Usa `text` + `lookup_values` (scelta singola) quando ci sono livelli/stati multipli.
- Usa `text` libero per note/descrizioni.

## Proposta campi nuovi (processi_matching)

| Domanda UI | Colonna proposta | Tipo | Valori ammessi | Default |
|---|---|---|---|---|
| Sono presenti neonati | onb_neonati_presenti | boolean | true/false | false |
| Deve accudire più di un bambino | onb_accudire_piu_bambini | boolean | true/false | false |
| Famiglia 4+ persone | onb_famiglia_4_plus | boolean | true/false | false |
| Casa >200 mq | onb_casa_oltre_200mq | boolean | true/false | false |
| Cani (nessuno/media-grande) | onb_cani_livello | text + lookup | no / media_o_inferiore / grande / entrambe | no |
| Ci sono gatti | onb_presenza_gatti | boolean | true/false | false |
| Deve stirare | onb_stiro_livello | text + lookup | no / si / si_abiti_difficili | no |
| Deve cucinare | onb_cucina_livello | text + lookup | no / si / si_piatti_elaborati | no |
| Cura giardino | onb_cura_giardino | boolean | true/false | false |
| Comunicazione in italiano | onb_comunicazione_italiano | text + lookup | no / base / frequente | no |
| Comunicazione in inglese | onb_comunicazione_inglese | text + lookup | no / base / frequente | no |
| Richieste specifiche lavoratore | onb_richieste_specifiche_lavoratore | text | testo libero | null |
| Nazionalità escluse | onb_nazionalita_escluse | text[] + lookup (multi) | da lookup `processi_matching.nazionalita_escluse` | {} |
| Nazionalità obbligatorie | onb_nazionalita_obbligatorie | text[] + lookup (multi) | da lookup `processi_matching.nazionalita_obbligatorie` | {} |
| Famiglia molto esigente | onb_famiglia_molto_esigente | boolean | true/false | false |
| Richiesta autonomia | onb_richiesta_autonomia | boolean | true/false | false |
| Datore spesso presente | onb_datore_spesso_presente | boolean | true/false | false |
| Richiesta discrezione | onb_richiesta_discrezione | boolean | true/false | false |
| Provincia caricata da utente | luogo_provincia_caricata_da_utente | text | testo libero | null |
| Indirizzo formattato Google | luogo_indirizzo_formattato | text | testo libero | null |
| Preventivo da inviare (link) | preventivo_dinamico | text | URL | null |

## SQL Migration (Onboarding campi nuovi)

```sql
begin;

-- =====================================================
-- 1) Nuove colonne onboarding su processi_matching
-- =====================================================
alter table public.processi_matching
  add column if not exists onb_neonati_presenti boolean not null default false,
  add column if not exists onb_accudire_piu_bambini boolean not null default false,
  add column if not exists onb_famiglia_4_plus boolean not null default false,
  add column if not exists onb_casa_oltre_200mq boolean not null default false,
  add column if not exists onb_cani_livello text not null default 'no',
  add column if not exists onb_presenza_gatti boolean not null default false,
  add column if not exists onb_stiro_livello text not null default 'no',
  add column if not exists onb_cucina_livello text not null default 'no',
  add column if not exists onb_cura_giardino boolean not null default false,
  add column if not exists onb_comunicazione_italiano text not null default 'no',
  add column if not exists onb_comunicazione_inglese text not null default 'no',
  add column if not exists onb_richieste_specifiche_lavoratore text,
  add column if not exists onb_nazionalita_escluse text[] not null default '{}'::text[],
  add column if not exists onb_nazionalita_obbligatorie text[] not null default '{}'::text[],
  add column if not exists onb_famiglia_molto_esigente boolean not null default false,
  add column if not exists onb_richiesta_autonomia boolean not null default false,
  add column if not exists onb_datore_spesso_presente boolean not null default false,
  add column if not exists onb_richiesta_discrezione boolean not null default false,
  add column if not exists luogo_provincia_caricata_da_utente text,
  add column if not exists luogo_indirizzo_formattato text,
  add column if not exists preventivo_dinamico text;

-- =====================================================
-- 2) Vincoli di coerenza per campi enum-like
-- =====================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'processi_matching_onb_cani_livello_check'
  ) then
    alter table public.processi_matching
      add constraint processi_matching_onb_cani_livello_check
      check (onb_cani_livello in ('no', 'media_o_inferiore', 'grande', 'entrambe'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'processi_matching_onb_stiro_livello_check'
  ) then
    alter table public.processi_matching
      add constraint processi_matching_onb_stiro_livello_check
      check (onb_stiro_livello in ('no', 'si', 'si_abiti_difficili'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'processi_matching_onb_cucina_livello_check'
  ) then
    alter table public.processi_matching
      add constraint processi_matching_onb_cucina_livello_check
      check (onb_cucina_livello in ('no', 'si', 'si_piatti_elaborati'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'processi_matching_onb_comunicazione_italiano_check'
  ) then
    alter table public.processi_matching
      add constraint processi_matching_onb_comunicazione_italiano_check
      check (onb_comunicazione_italiano in ('no', 'base', 'frequente'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'processi_matching_onb_comunicazione_inglese_check'
  ) then
    alter table public.processi_matching
      add constraint processi_matching_onb_comunicazione_inglese_check
      check (onb_comunicazione_inglese in ('no', 'base', 'frequente'));
  end if;
end $$;

-- =====================================================
-- 3) Lookup values per nuovi campi a scelta singola
-- =====================================================
with wanted(entity_table, entity_field, value_key, value_label, sort_order, is_active, metadata) as (
  values
    ('processi_matching','onb_cani_livello','no','No',1,true,'{}'::jsonb),
    ('processi_matching','onb_cani_livello','media_o_inferiore','Si, di taglia media o inferiore',2,true,'{}'::jsonb),
    ('processi_matching','onb_cani_livello','grande','Si, di taglia grande',3,true,'{}'::jsonb),
    ('processi_matching','onb_cani_livello','entrambe','Si, entrambe',4,true,'{}'::jsonb),

    ('processi_matching','onb_stiro_livello','no','No',1,true,'{}'::jsonb),
    ('processi_matching','onb_stiro_livello','si','Si',2,true,'{}'::jsonb),
    ('processi_matching','onb_stiro_livello','si_abiti_difficili','Si e abiti difficili',3,true,'{}'::jsonb),

    ('processi_matching','onb_cucina_livello','no','No',1,true,'{}'::jsonb),
    ('processi_matching','onb_cucina_livello','si','Si',2,true,'{}'::jsonb),
    ('processi_matching','onb_cucina_livello','si_piatti_elaborati','Si e piatti elaborati',3,true,'{}'::jsonb),

    ('processi_matching','onb_comunicazione_italiano','no','No',1,true,'{}'::jsonb),
    ('processi_matching','onb_comunicazione_italiano','base','Base',2,true,'{}'::jsonb),
    ('processi_matching','onb_comunicazione_italiano','frequente','Frequente',3,true,'{}'::jsonb),

    ('processi_matching','onb_comunicazione_inglese','no','No',1,true,'{}'::jsonb),
    ('processi_matching','onb_comunicazione_inglese','base','Base',2,true,'{}'::jsonb),
    ('processi_matching','onb_comunicazione_inglese','frequente','Frequente',3,true,'{}'::jsonb)
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
  w.entity_table,
  w.entity_field,
  w.value_key,
  w.value_label,
  w.sort_order,
  w.is_active,
  w.metadata
from wanted w
where not exists (
  select 1
  from public.lookup_values l
  where l.entity_table = w.entity_table
    and l.entity_field = w.entity_field
    and l.value_key = w.value_key
);

commit;

```

## SQL Lookup Nazionalità (dedicato)

- Script completo: `data/add_lookup_nazionalita_processi.sql`
- Popola in `lookup_values` entrambi i campi:
  - `processi_matching.nazionalita_escluse`
  - `processi_matching.nazionalita_obbligatorie`
- Applica colore a ogni opzione in `metadata.color`
