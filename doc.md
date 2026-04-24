# DB Map Completa

## Aggiornamento 2026-04-08

In questa iterazione non sono stati aggiunti nuovi campi al database.

Le modifiche recenti lato FE e mapping hanno riusato campi gia presenti, in particolare:

- `rapporti_lavorativi.ticket_id`
- `rapporti_lavorativi.stato_servizio`
- `rapporti_lavorativi.tipo_rapporto`
- `rapporti_lavorativi.ore_a_settimana`
- `rapporti_lavorativi.data_inizio_rapporto`
- `ticket.rapporto_id`
- `ticket.stato`
- `chiusure_contratti.ticket_id`
- `variazioni_contrattuali.rapporto_lavorativo_id`
- `contributi_inps.rapporto_lavorativo_id`
- `mesi_lavorati.rapporto_lavorativo_id`

Nota operativa:

- `chiusure_contratti` non espone un riferimento diretto al rapporto lavorativo; il collegamento viene risolto tramite `ticket_id -> rapporti_lavorativi.ticket_id`.

Documentazione costruita incrociando tutte le fonti locali della repo:

- `src/types/entities/*`: shape tipizzati dei record
- `supabase/functions/table-query/index.ts`: whitelist reale leggibile dal frontend
- `data/schema.sql`: schema SQL locale
- `data/lookup.sql`: domini enum/multi-enum e valori
- codice `src/**` e `supabase/functions/**`: riferimenti espliciti ai campi

## Legenda

- `explicit + query`: il campo e usato nel codice ed e esposto dalla edge `table-query`
- `explicit gap`: il campo e usato nel codice ma non compare nella whitelist `table-query`
- `query only`: il campo e esposto al frontend ma non ha un uso esplicito forte fuori dai flussi generici
- `schema/type only`: esiste in schema o nei type ma non emerge nel perimetro leggibile corrente
- `lookup only`: esiste un dominio lookup ma non ho trovato il campo nelle altre fonti

## Gap Critici Repo vs `table-query`

- `esperienze_lavoratori`: `motivazione_fine_rapporto`
- `famiglie`: `airtable_id`, `airtable_record_id`, `data_ora_di_creazione`, `data_ultima_modifica`, `log_sales`
- `lavoratori`: `airtable_id`, `airtable_record_id`, `bio_personale`, `cap`, `data_ora_ultima_modifica`, `descrizione`, `docs_codice_fiscale_fronte`, `docs_codice_fiscale_retro`, `docs_documento_identita_fronte`, `docs_documento_identita_retro`, `docs_permesso_di_soggiorno_fronte`, `docs_permesso_di_soggiorno_retro`, `docs_ricevuta_rinnovo_permesso_di_soggiorno`, `indirizzo_residenza_completo`, `password`, `permalink_foto`, `rating`
- `processi_matching`: `airtable_id`, `airtable_record_id`, `disponibilita_domenica_mattina`, `disponibilita_domenica_pomeriggio`, `disponibilita_domenica_sera`, `disponibilita_giovedi_mattina`, `disponibilita_giovedi_pomeriggio`, `disponibilita_giovedi_sera`, `disponibilita_lunedi_mattina`, `disponibilita_lunedi_pomeriggio`, `disponibilita_lunedi_sera`, `disponibilita_martedi_mattina`, `disponibilita_martedi_pomeriggio`, `disponibilita_martedi_sera`, `disponibilita_mercoledi_mattina`, `disponibilita_mercoledi_pomeriggio`, `disponibilita_mercoledi_sera`, `disponibilita_sabato_mattina`, `disponibilita_sabato_pomeriggio`, `disponibilita_sabato_sera`, `disponibilita_venerdi_mattina`, `disponibilita_venerdi_pomeriggio`, `disponibilita_venerdi_sera`, `luogo_id`, `old_stato_sales`, `pipeline`, `qualificazione_lead`, `rapporti_lavorativi`

## Catalogo Lookup

### `lavoratori`

| Dominio | Kind | Valori |
| --- | --- | --- |
| `lavoratori.colloquio_in_presenza` | enum | `show` -> show, `no_show` -> no show |
| `lavoratori.come_ti_sposti` | multi_enum | `mi_sposto_con_i_mezzi` -> Mi sposto con i mezzi, `ho_la_patente,_ma_non_la_macchina` -> Ho la patente, ma non la macchina, `non_guido_e_mi_accompagnano` -> Non guido e mi accompagnano, `ho_la_patente_e_la_macchina` -> Ho la patente e la macchina |
| `lavoratori.conoscenza_dellitaliano` | enum | `medio` -> Medio, `basso` -> Basso, `alto` -> Alto |
| `lavoratori.cosa_so_fare` | multi_enum | `lavanderia` -> Lavanderia, `aiuto_nell’igiene_personale` -> Aiuto nell’igiene personale, `sla` -> SLA, `schizofrenia` -> Schizofrenia, `pulizie_quotidiane_o_settimanali` -> Pulizie quotidiane o settimanali, `diabete` -> Diabete, `cura_del_terrazzo` -> Cura del terrazzo, `cura_della_casa` -> Cura della casa, `assistenza_completa_alla_persona` -> Assistenza completa alla persona, `compiti_domestici` -> Compiti domestici, `demenza_senile` -> Demenza senile, `morbo_di_parkinson` -> Morbo di Parkinson, `alzheimer` -> Alzheimer, `ritardo_cognitivo` -> Ritardo cognitivo, `sclerosi_multipla` -> Sclerosi multipla, `condomini` -> Condomini, `stirare` -> Stirare, `pulizia_di_uffici` -> Pulizia di uffici, `cura_del_giardino` -> Cura del giardino, `malati_terminali` -> Malati terminali, `guidare` -> Guidare, `commissioni_fuori_casa_(_spese_ect)` -> Commissioni fuori casa ( spese ect), `ictus` -> Ictus, `grosse_pulizie` -> Grosse pulizie, `cucinare` -> Cucinare, `fare_la_spesa` -> Fare la spesa |
| `lavoratori.disponibilita_nel_giorno` | multi_enum | `notte` -> Notte, `sera` -> Sera, `mattina` -> Mattina, `pomeriggio` -> Pomeriggio |
| `lavoratori.disponibilita_ore_a_settimana` | multi_enum | `tra_le_30_e_le_40_ore` -> Tra le 30 e le 40 ore, `tra_le_10_e_le_20_ore` -> Tra le 10 e le 20 ore, `meno_di_5_ore` -> Meno di 5 ore, `tra_le_5_e_le_10_ore` -> Tra le 5 e le 10 ore, `più_di_40_ore` -> Più di 40 ore, `tra_le_20_e_le_30_ore` -> Tra le 20 e le 30 ore |
| `lavoratori.hai_referenze` | enum | `ho_referenze_verificabili` -> Ho referenze verificabili, `non_ho_referenze_verificabili` -> Non ho referenze verificabili, `1_referenza_verificabili` -> 1 referenza verificabili |
| `lavoratori.is_qualified` | enum | `no` -> no, `yes` -> yes |
| `lavoratori.quanto_brava_bambini` | enum | `basso` -> Basso, `alto` -> Alto, `medio` -> Medio |
| `lavoratori.quanto_brava_giardinaggio` | enum | `alto` -> Alto, `medio` -> Medio, `basso` -> Basso |
| `lavoratori.quanto_brava_in_cucina` | enum | `medio` -> Medio, `alto` -> Alto, `basso` -> Basso |
| `lavoratori.quanto_brava_stirare` | enum | `medio` -> Medio, `alto` -> Alto, `basso` -> Basso |
| `lavoratori.sesso` | enum | `uomo` -> Uomo, `preferisco_non_dire` -> Preferisco non dire, `donna` -> Donna |
| `lavoratori.stato` | enum | `profilo_base` -> Profilo Base, `profilo_completo` -> Profilo Completo, `lead` -> Lead |
| `lavoratori.stato_profilo` | enum | `profilo_completo` -> Profilo Completo, `profilo_base` -> Profilo Base, `lead` -> Lead |
| `lavoratori.stato_selezioni` | multi_enum | `prova_con_cliente` -> Prova con cliente, `match` -> Match, `selezionato` -> Selezionato, `inviato_al_cliente` -> Inviato al cliente, `colloquio_schedulato` -> Colloquio schedulato, `colloquio_fatto` -> Colloquio fatto |
| `lavoratori.tipo_lavoro_domestico` | multi_enum | `assistenza_domestica_/_badante` -> Assistenza Domestica / Badante, `babysitter_/_tata-colf` -> Babysitter / Tata-Colf, `colf_/_pulizie` -> Colf / Pulizie |
| `lavoratori.tipo_rapporto_lavorativo` | multi_enum | `part_time` -> Part time, `non_convivente_full-time` -> Non convivente Full-time, `lavoro_ad_ore` -> Lavoro ad ore, `convivente` -> Convivente |

### `processi_matching`

| Dominio | Kind | Valori |
| --- | --- | --- |
| `processi_matching.channel_grouped` | enum | `google` -> Google, `organico` -> Organico, `meta` -> Meta, `altro` -> Altro, `instagram` -> Instagram |
| `processi_matching.fase_processo_res` | enum | `chiuso` -> chiuso, `ricerca` -> ricerca, `sales` -> sales |
| `processi_matching.frequenza_rapporto` | enum | `regolare` -> Regolare, `occasionale` -> Occasionale, `sostituzione` -> Sostituzione |
| `processi_matching.interesse_consulenza` | enum | `basso` -> basso, `medio` -> medio, `alto` -> alto |
| `processi_matching.modalita_tariffa` | enum | `success_fee` -> success fee, `payment` -> payment, `entry_fee_silver` -> entry fee silver, `custom` -> custom, `entry_fee_gold` -> entry fee gold |
| `processi_matching.motivazione_lost` | enum | `ha_trovato` -> Ha trovato, `stand_by_decisionale` -> Stand by decisionale, `generale` -> Generale, `prezzo` -> Prezzo, `red_flag_cliente` -> Red flag cliente, `non_risponde` -> Non risponde, `feature_mancante` -> Feature mancante |
| `processi_matching.motivazione_oot` | enum | `figura_non_coperta` -> Cerca una figura che non copriamo, `lavoratore` -> Lavoratore, `frequenza_non_compatibile` -> Frequenza non compatibile, `area_geografica` -> Area geografica, `doppione` -> Doppione, `ricerca_fuori_target` -> Ricerca fuori target |
| `processi_matching.motivo_no_match` | enum | `non_ha_più_risposto` -> Non ha più risposto, `non_si_trovano_lavoratori_-_zona` -> Non si trovano lavoratori - Zona, `ha_interrotto_la_ricerca_-_trovato_da_solo/a` -> Ha interrotto la ricerca - Trovato da solo/a, `non_si_trovano_lavoratori_-_requisiti_stringenti` -> Non si trovano lavoratori - Requisiti stringenti, `ha_interrotto_la_ricerca_-_lavoratori_andati_male` -> Ha interrotto la ricerca - Lavoratori andati male, `non_si_trovano_lavoratori_-_patente/macchina` -> Non si trovano lavoratori - Patente/Macchina, `ha_interrotto_la_ricerca_-_ha_rivalutato_la_ricerca` -> Ha interrotto la ricerca - Ha rivalutato la ricerca, `non_si_trovano_lavoratori_-_orario` -> Non si trovano lavoratori - Orario |
| `processi_matching.pipeline` | enum | `sales_pipeline` -> Sales Pipeline |
| `processi_matching.qualificazione_lead` | enum | `gold` -> Gold, `not_qualified` -> Not qualified, `silver` -> Silver, `bronze` -> Bronze |
| `processi_matching.sales_cold_call_followup` | enum | `prima_chiamata_senza_risposta` -> 1° chiamata senza risposta, `seconda_chiamata_senza_risposta` -> 2° chiamata senza risposta, `terza_chiamata_senza_risposta` -> 3° chiamata senza risposta |
| `processi_matching.sales_no_show_followup` | enum | `prima_chiamata_senza_risposta` -> 1° chiamata senza risposta, `seconda_chiamata_senza_risposta` -> 2° chiamata senza risposta |
| `processi_matching.stato_messaggi_whatsapp_shortlist` | enum | `non_inviato` -> Non inviato, `inviato_a_tutti` -> Inviato a tutti, `invio_parziale` -> Invio parziale |
| `processi_matching.stato_res` | enum | `da_assegnare` -> da assegnare, `raccolta_candidature` -> raccolta candidature, `fare_ricerca` -> fare ricerca, `in_preparazione_per_invio` -> in preparazione per invio, `match` -> match, `senza_risposta` -> senza risposta, `preventivo_firmato_in_autonomia` -> preventivo firmato in autonomia, `selezione_inviata,_in_attesa_di_feedback` -> selezione inviata, in attesa di feedback, `no_match` -> no match, `out_of_target` -> out of target, `lead` -> lead, `in_prova_con_lavoratore` -> in prova con lavoratore, `ricerca_futura` -> ricerca futura, `non_interessato` -> non interessato, `hold` -> hold, `stand_by` -> stand by, `fase_di_colloqui` -> fase di colloqui |
| `processi_matching.stato_sales` | enum | `hot_callback_programmato` -> HOT - Callback programmato, `hot_in_attesa_di_primo_contatto` -> HOT - In attesa di primo contatto, `out_of_target` -> OUT OF TARGET, `hot_call_attivazione_prenotata` -> HOT - Call attivazione prenotata, `hot_contatto_avvenuto` -> HOT - Contatto avvenuto, `hot_no_show` -> HOT - No-show, `hot_call_attivazione_fatta` -> HOT - Call attivazione fatta, `hot_ingresso` -> HOT - Ingresso, `hot_follow_up_post_call` -> HOT - Follow-up post call, `warm_lead` -> WARM - Lead, `won_ricerca_attivata` -> WON - Ricerca attivata, `lost` -> LOST, `hot_decisione_rimandata` -> HOT - Decisione rimandata, `cold_ricerca_futura` -> COLD - Ricerca futura |
| `processi_matching.stato_whatsapp_invito_colloquio` | enum | `non_inviato` -> Non inviato |
| `processi_matching.tipo_incontro_famiglia_lavoratore` | enum | `prova_diretta` -> Prova diretta, `colloquio_conoscitivo` -> Colloquio conoscitivo |
| `processi_matching.urgenza` | enum | `tra_1-2_mesi` -> Tra 1-2 mesi, `subito` -> Subito, `entro_1_settimana` -> Entro 1 settimana, `ho_una_data_precisa` -> Ho una data precisa, `sto_solo_guardando` -> Sto solo guardando |

## Inventario Completo

### `documenti_lavoratori`

| Campo | Tipo | Stato repo | Lookup | Area |
| --- | --- | --- | --- | --- |
| `aggiornato_il` | string \| null | explicit + query | - | date / timestamp |
| `airtable_id` | string \| null | explicit + query | - | foreign key / reference |
| `airtable_record_id` | string \| null | explicit + query | - | foreign key / reference |
| `allegato_codice_fiscale_fronte` | JsonValue \| null | explicit + query | - | json / attachments |
| `allegato_codice_fiscale_retro` | JsonValue \| null | explicit + query | - | json / attachments |
| `allegato_documento_identita_fronte` | JsonValue \| null | explicit + query | - | json / attachments |
| `allegato_documento_identita_retro` | JsonValue \| null | explicit + query | - | json / attachments |
| `allegato_permesso_di_soggiorno_fronte` | JsonValue \| null | explicit + query | - | json / attachments |
| `allegato_permesso_di_soggiorno_retro` | JsonValue \| null | explicit + query | - | json / attachments |
| `allegato_ricevuta_rinnovo_permesso` | JsonValue \| null | explicit + query | - | json / attachments |
| `creato_il` | string \| null | explicit + query | - | date / timestamp |
| `data_scadenza` | string \| null | explicit + query | - | date / timestamp |
| `data_scadenza_permesso_di_soggiorno` | string \| null | explicit + query | - | date / timestamp |
| `id` | string | explicit + query | - | primary key |
| `lavoratore_id` | string \| null | explicit + query | - | foreign key / reference |
| `stato_documento` | string \| null | explicit + query | - | status / workflow |
| `status` | string \| null | explicit + query | - | status / workflow |
| `tipo_documento` | string \| null | explicit + query | - | classification |

### `esperienze_lavoratori`

| Campo | Tipo | Stato repo | Lookup | Area |
| --- | --- | --- | --- | --- |
| `aggiornato_il` | unknown | explicit + query | - | date / timestamp |
| `creato_il` | unknown | explicit + query | - | date / timestamp |
| `data_fine` | string \| null | explicit + query | - | date / timestamp |
| `data_inizio` | string \| null | explicit + query | - | date / timestamp |
| `descrizione` | string \| null | explicit + query | - | domain field |
| `descrizione_contesto_lavorativo` | string \| null | explicit + query | - | domain field |
| `id` | string | explicit + query | - | primary key |
| `lavoratore_id` | string \| null | explicit + query | - | foreign key / reference |
| `motivazione_fine_rapporto` | string \| null | explicit gap | - | reason / explanation |
| `stato_esperienza_attiva` | boolean \| null | explicit + query | - | status / workflow |
| `tipo_lavoro` | string[] \| null | explicit + query | - | classification |
| `tipo_rapporto` | string \| null | explicit + query | - | classification |

### `famiglie`

| Campo | Tipo | Stato repo | Lookup | Area |
| --- | --- | --- | --- | --- |
| `aggiornato_il` | string \| null | explicit + query | - | date / timestamp |
| `airtable_id` | string \| null | explicit gap | - | foreign key / reference |
| `airtable_record_id` | string \| null | explicit gap | - | foreign key / reference |
| `arr_from_abbonamenti` | string \| null | schema/type only | - | domain field |
| `base_codice_otp` | string \| null | explicit + query | - | domain field |
| `call_utm_source` | string \| null | schema/type only | - | domain field |
| `codice_fiscale` | string \| null | schema/type only | - | domain field |
| `cognome` | string \| null | explicit + query | - | contact / identity |
| `cognome_fatturazione` | string \| null | schema/type only | - | domain field |
| `consenso_newsletter` | boolean \| null | schema/type only | - | domain field |
| `created_by` | JsonObject \| null | schema/type only | - | domain field |
| `creato_il` | string \| null | explicit + query | - | date / timestamp |
| `customer_email` | string \| null | schema/type only | - | domain field |
| `data_call_prenotata` | string \| null | explicit + query | - | date / timestamp |
| `data_ora_di_creazione` | string \| null | explicit gap | - | date / timestamp |
| `data_ultima_modifica` | string \| null | explicit gap | - | date / timestamp |
| `email` | string \| null | explicit + query | - | contact / identity |
| `famiglie_consulenza` | string \| null | schema/type only | - | domain field |
| `fatturare_come_azienda` | boolean \| null | schema/type only | - | domain field |
| `feedback_customer_interview` | string \| null | schema/type only | - | domain field |
| `feedback_richiesto` | boolean \| null | schema/type only | - | domain field |
| `id` | string | explicit + query | - | primary key |
| `is_sent_whatsapp_sales` | boolean \| null | schema/type only | - | domain field |
| `lavoratore_match` | string \| null | explicit + query | - | domain field |
| `log_sales` | string \| null | explicit gap | - | domain field |
| `match_data` | string \| null | schema/type only | - | domain field |
| `metadati_migrazione` | JsonObject \| null | schema/type only | - | json / attachments |
| `nome` | string \| null | explicit + query | - | contact / identity |
| `nome_azienda` | string \| null | schema/type only | - | domain field |
| `nome_fatturazione` | string \| null | schema/type only | - | domain field |
| `partita_iva` | string \| null | schema/type only | - | domain field |
| `preventivi` | string \| null | explicit + query | - | domain field |
| `quanto_ci_consiglieresti` | number \| null | schema/type only | - | domain field |
| `quanto_ci_consiglieresti_scritto` | string \| null | schema/type only | - | domain field |
| `quanto_soddisfatto` | number \| null | schema/type only | - | domain field |
| `quanto_soddisfatto_scritto` | string \| null | schema/type only | - | domain field |
| `rapporti_lavorativi` | string \| null | explicit + query | - | domain field |
| `rapporti_lavorativi_2` | string \| null | schema/type only | - | domain field |
| `recensione_pubblica` | string \| null | schema/type only | - | domain field |
| `referral_richiedere` | boolean \| null | schema/type only | - | domain field |
| `referral_stato_richiesta` | string \| null | schema/type only | - | domain field |
| `referrer` | string \| null | schema/type only | - | domain field |
| `secondary_email` | string \| null | schema/type only | - | domain field |
| `stato_richiesta_dati_fatturazione` | string \| null | schema/type only | - | status / workflow |
| `telefono` | string \| null | explicit + query | - | contact / identity |
| `verified_user_wized` | boolean \| null | schema/type only | - | domain field |
| `whatsapp` | string \| null | schema/type only | - | domain field |

### `lavoratori`

| Campo | Tipo | Stato repo | Lookup | Area |
| --- | --- | --- | --- | --- |
| `active_selection_json` | string \| null | schema/type only | - | json / attachments |
| `aggiornato_il` | string \| null | explicit + query | - | date / timestamp |
| `airtable_id` | string \| null | explicit gap | - | foreign key / reference |
| `airtable_record_id` | string \| null | explicit gap | - | foreign key / reference |
| `allegati` | JsonObject \| null | schema/type only | - | domain field |
| `anni_esperienza_babysitter` | number \| null | explicit + query | - | numeric metric |
| `anni_esperienza_badante` | number \| null | explicit + query | - | numeric metric |
| `anni_esperienza_colf` | number \| null | explicit + query | - | numeric metric |
| `availability_final_json` | string \| null | explicit + query | - | availability |
| `baze_score` | number \| null | schema/type only | - | domain field |
| `bio_personale` | string \| null | explicit gap | - | domain field |
| `candidature_mandate` | number \| null | schema/type only | - | domain field |
| `cap` | string \| null | explicit gap | - | address / logistics |
| `cap_link_id` | string \| null | schema/type only | - | foreign key / reference |
| `check_accetta_babysitting_multipli_bambini` | string \| null | explicit + query | - | flag / business check |
| `check_accetta_babysitting_neonati` | string \| null | explicit + query | - | flag / business check |
| `check_accetta_case_con_cani` | string \| null | explicit + query | - | flag / business check |
| `check_accetta_case_con_cani_grandi` | string \| null | explicit + query | - | flag / business check |
| `check_accetta_case_con_gatti` | string \| null | explicit + query | - | flag / business check |
| `check_accetta_funzionamento_baze` | string \| null | explicit + query | - | flag / business check |
| `check_accetta_lavori_con_trasferta` | string \| null | explicit + query | - | flag / business check |
| `check_accetta_multipli_contratti` | string \| null | explicit + query | - | flag / business check |
| `check_accetta_paga_9_euro_netti` | string \| null | explicit + query | - | flag / business check |
| `check_accetta_salire_scale_o_soffitti_alti` | string \| null | explicit + query | - | flag / business check |
| `check_blacklist` | string \| null | explicit + query | - | flag / business check |
| `check_conferma_certificazione_inviata` | boolean \| null | schema/type only | - | flag / business check |
| `check_conferma_idoneita_inviata` | boolean \| null | schema/type only | - | flag / business check |
| `check_lavori_accettabili` | string[] \| null | explicit + query | - | flag / business check |
| `cognome` | string \| null | explicit + query | - | contact / identity |
| `colloquio_in_presenza` | string \| null | explicit + query | enum (2) | domain field |
| `come_hai_conosciuto_baze` | string \| null | schema/type only | - | domain field |
| `come_ti_racconteresti` | string \| null | schema/type only | - | domain field |
| `come_ti_sposti` | string[] \| null | explicit + query | multi_enum (4) | domain field |
| `compatibilita_babysitting_neonati` | string \| null | explicit + query | - | compatibility |
| `compatibilita_con_animali_in_casa` | string \| null | explicit + query | - | compatibility |
| `compatibilita_con_case_di_grandi_dimensioni` | string \| null | explicit + query | - | compatibility |
| `compatibilita_con_contesti_pacati` | string \| null | explicit + query | - | compatibility |
| `compatibilita_con_cucina_strutturata` | string \| null | explicit + query | - | compatibility |
| `compatibilita_con_elevata_autonomia_richiesta` | string \| null | explicit + query | - | compatibility |
| `compatibilita_con_stiro_esigente` | string \| null | explicit + query | - | compatibility |
| `compatibilita_famiglie_molto_esigenti` | string \| null | explicit + query | - | compatibility |
| `compatibilita_famiglie_numerose` | string \| null | explicit + query | - | compatibility |
| `compatibilita_lavoro_con_datore_presente_in_casa` | string \| null | explicit + query | - | compatibility |
| `conoscenza_dellitaliano` | string \| null | explicit + query | enum (3) | domain field |
| `consenso_newsletter` | boolean \| null | schema/type only | - | domain field |
| `cosa_so_fare` | string[] \| null | schema/type only | multi_enum (26) | domain field |
| `count_follow_up_fatti` | number \| null | schema/type only | - | numeric metric |
| `creato_da_candidatura` | boolean \| null | schema/type only | - | domain field |
| `creato_il` | string \| null | explicit + query | - | date / timestamp |
| `cv` | JsonObject \| null | schema/type only | - | json / attachments |
| `data_di_nascita` | string \| null | explicit + query | - | date / timestamp |
| `data_ora_di_creazione` | string \| null | explicit + query | - | date / timestamp |
| `data_ora_ultima_modifica` | string \| null | explicit gap | - | date / timestamp |
| `data_ritorno_disponibilita` | string \| null | explicit + query | - | date / timestamp |
| `data_scadenza_naspi` | string \| null | explicit + query | - | date / timestamp |
| `data_ultima_candidatura` | string \| null | explicit + query | - | date / timestamp |
| `data_ultima_modifica_profilo` | string \| null | explicit + query | - | date / timestamp |
| `data_ultimo_form_completato` | string \| null | schema/type only | - | date / timestamp |
| `descrizione` | string \| null | explicit gap | - | domain field |
| `descrizione_pubblica` | string \| null | explicit + query | - | domain field |
| `descrizione_rivista` | string \| null | explicit + query | - | domain field |
| `disponibile_a_lavorare_con_bambini` | string \| null | schema/type only | - | domain field |
| `disponibilita` | string \| null | explicit + query | - | availability |
| `disponibilita_domenica_mattina` | boolean \| null | explicit + query | - | availability |
| `disponibilita_domenica_notte` | boolean \| null | schema/type only | - | availability |
| `disponibilita_domenica_pomeriggio` | boolean \| null | explicit + query | - | availability |
| `disponibilita_domenica_sera` | boolean \| null | explicit + query | - | availability |
| `disponibilita_giovedi_mattina` | boolean \| null | explicit + query | - | availability |
| `disponibilita_giovedi_notte` | boolean \| null | schema/type only | - | availability |
| `disponibilita_giovedi_pomeriggio` | boolean \| null | explicit + query | - | availability |
| `disponibilita_giovedi_sera` | boolean \| null | explicit + query | - | availability |
| `disponibilita_lunedi_mattina` | boolean \| null | explicit + query | - | availability |
| `disponibilita_lunedi_notte` | boolean \| null | schema/type only | - | availability |
| `disponibilita_lunedi_pomeriggio` | boolean \| null | explicit + query | - | availability |
| `disponibilita_lunedi_sera` | boolean \| null | explicit + query | - | availability |
| `disponibilita_martedi_mattina` | boolean \| null | explicit + query | - | availability |
| `disponibilita_martedi_notte` | boolean \| null | schema/type only | - | availability |
| `disponibilita_martedi_pomeriggio` | boolean \| null | explicit + query | - | availability |
| `disponibilita_martedi_sera` | boolean \| null | explicit + query | - | availability |
| `disponibilita_mercoledi_mattina` | boolean \| null | explicit + query | - | availability |
| `disponibilita_mercoledi_notte` | boolean \| null | schema/type only | - | availability |
| `disponibilita_mercoledi_pomeriggio` | boolean \| null | explicit + query | - | availability |
| `disponibilita_mercoledi_sera` | boolean \| null | explicit + query | - | availability |
| `disponibilita_nel_giorno` | string[] \| null | explicit + query | multi_enum (4) | availability |
| `disponibilita_ore_a_settimana` | string[] \| null | schema/type only | multi_enum (6) | availability |
| `disponibilita_per_json` | string \| null | explicit + query | - | availability |
| `disponibilita_sabato_mattina` | boolean \| null | explicit + query | - | availability |
| `disponibilita_sabato_notte` | boolean \| null | schema/type only | - | availability |
| `disponibilita_sabato_pomeriggio` | boolean \| null | explicit + query | - | availability |
| `disponibilita_sabato_sera` | boolean \| null | explicit + query | - | availability |
| `disponibilita_venerdi_mattina` | boolean \| null | explicit + query | - | availability |
| `disponibilita_venerdi_notte` | boolean \| null | schema/type only | - | availability |
| `disponibilita_venerdi_pomeriggio` | boolean \| null | explicit + query | - | availability |
| `disponibilita_venerdi_sera` | boolean \| null | explicit + query | - | availability |
| `docs_codice_fiscale` | string \| null | schema/type only | - | json / attachments |
| `docs_codice_fiscale_fronte` | JsonObject \| null | explicit gap | - | json / attachments |
| `docs_codice_fiscale_retro` | JsonObject \| null | explicit gap | - | json / attachments |
| `docs_documento_identita_fronte` | JsonObject \| null | explicit gap | - | json / attachments |
| `docs_documento_identita_retro` | JsonObject \| null | explicit gap | - | json / attachments |
| `docs_permesso_di_soggiorno_fronte` | JsonObject \| null | explicit gap | - | json / attachments |
| `docs_permesso_di_soggiorno_retro` | JsonObject \| null | explicit gap | - | json / attachments |
| `docs_ricevuta_rinnovo_permesso_di_soggiorno` | JsonObject \| null | explicit gap | - | json / attachments |
| `docs_scadenza_permesso_di_soggiorno` | string \| null | schema/type only | - | json / attachments |
| `documenti_in_regola` | string \| null | explicit + query | - | domain field |
| `email` | string \| null | explicit + query | - | contact / identity |
| `errore_su_brevo` | boolean \| null | schema/type only | - | domain field |
| `fbclid` | string \| null | explicit + query | - | marketing / attribution |
| `feedback_recruiter` | string \| null | explicit + query | - | domain field |
| `followup_chiamata_idoneita` | string \| null | explicit + query | - | domain field |
| `form_3_completato` | boolean \| null | schema/type only | - | domain field |
| `foto` | JsonObject \| null | explicit + query | - | json / attachments |
| `gclid` | string \| null | explicit + query | - | marketing / attribution |
| `geocache` | string \| null | schema/type only | - | domain field |
| `hai_referenze` | string \| null | explicit + query | enum (3) | domain field |
| `iban` | string \| null | explicit + query | - | commercial / payment |
| `id` | string | explicit + query | - | primary key |
| `id_stripe_account` | string \| null | explicit + query | - | commercial / payment |
| `id_stripe_price` | string \| null | schema/type only | - | commercial / payment |
| `idoneita` | string \| null | schema/type only | - | domain field |
| `indirizzo_residenza_completo` | string \| null | explicit gap | - | address / logistics |
| `invito` | string \| null | schema/type only | - | domain field |
| `invito_link` | string \| null | schema/type only | - | domain field |
| `invito_referrer` | string \| null | schema/type only | - | domain field |
| `is_qualified` | string \| null | schema/type only | enum (2) | domain field |
| `livello_babysitting` | string \| null | explicit + query | - | skill / evaluation |
| `livello_cucina` | string \| null | explicit + query | - | skill / evaluation |
| `livello_dogsitting` | string \| null | explicit + query | - | skill / evaluation |
| `livello_giardinaggio` | string \| null | explicit + query | - | skill / evaluation |
| `livello_inglese` | string \| null | explicit + query | - | skill / evaluation |
| `livello_italiano` | string \| null | explicit + query | - | skill / evaluation |
| `livello_pulizie` | string \| null | explicit + query | - | skill / evaluation |
| `livello_stiro` | string \| null | explicit + query | - | skill / evaluation |
| `massimo_ore_settimanale` | number \| null | schema/type only | - | domain field |
| `metadati_migrazione` | JsonObject \| null | schema/type only | - | json / attachments |
| `motivazione_non_idoneo` | string[] \| null | explicit + query | - | reason / explanation |
| `nazionalita` | string \| null | explicit + query | - | domain field |
| `nome` | string \| null | explicit + query | - | contact / identity |
| `nome_della_migliore_referenza` | string \| null | schema/type only | - | experience / reference |
| `numero_della_migliore_referenza` | string \| null | schema/type only | - | numeric metric |
| `old_nome_della_migliore_referenza` | string \| null | schema/type only | - | experience / reference |
| `old_numero_della_migliore_referenza` | string \| null | schema/type only | - | experience / reference |
| `origin_source` | string[] \| null | schema/type only | - | marketing / attribution |
| `paga_oraria_richiesta` | number \| null | explicit + query | - | commercial / payment |
| `paga_richiesta` | string \| null | schema/type only | - | commercial / payment |
| `password` | string \| null | explicit gap | - | domain field |
| `permalink_foto` | string \| null | explicit gap | - | domain field |
| `presente_nel_cms_webflow` | boolean \| null | schema/type only | - | domain field |
| `provincia` | string \| null | explicit + query | - | address / logistics |
| `quantita_selezioni` | number \| null | schema/type only | - | domain field |
| `quanto_brava_bambini` | string \| null | schema/type only | enum (3) | skill / evaluation |
| `quanto_brava_giardinaggio` | string \| null | schema/type only | enum (3) | skill / evaluation |
| `quanto_brava_in_cucina` | string \| null | schema/type only | enum (3) | skill / evaluation |
| `quanto_brava_stirare` | string \| null | schema/type only | enum (3) | skill / evaluation |
| `quanto_vorresti_essere_pagata` | string \| null | schema/type only | - | commercial / payment |
| `rapporti_lavorativi_2_copy` | string \| null | schema/type only | - | domain field |
| `rapporti_lavorativi_2_copy_2` | string \| null | schema/type only | - | domain field |
| `rating` | string \| null | explicit gap | - | domain field |
| `rating_atteggiamento` | number \| null | explicit + query | - | skill / evaluation |
| `rating_capacita_comunicative` | number \| null | explicit + query | - | skill / evaluation |
| `rating_corporatura` | string \| null | explicit + query | - | skill / evaluation |
| `rating_cura_personale` | number \| null | explicit + query | - | skill / evaluation |
| `rating_precisione_puntualita` | number \| null | explicit + query | - | skill / evaluation |
| `recensione_pubblica` | string \| null | schema/type only | - | domain field |
| `recruiting_day_20_12` | boolean \| null | schema/type only | - | domain field |
| `referrer_id` | string \| null | schema/type only | - | foreign key / reference |
| `riassunto_profilo_breve` | string \| null | explicit + query | - | domain field |
| `saresti_disposta_a_trasferirti` | boolean \| null | schema/type only | - | domain field |
| `sesso` | string \| null | explicit + query | enum (3) | domain field |
| `situazione_lavorativa_attuale` | string \| null | explicit + query | - | domain field |
| `sono_una_persona` | string[] \| null | schema/type only | - | domain field |
| `stato` | string \| null | schema/type only | enum (3) | status / workflow |
| `stato_lavoratore` | string \| null | explicit + query | - | status / workflow |
| `stato_profilo` | string \| null | explicit + query | enum (3) | status / workflow |
| `stato_recensione_pubblica` | string \| null | schema/type only | - | status / workflow |
| `stato_selezioni` | string[] \| null | explicit + query | multi_enum (6) | status / workflow |
| `stato_verifica_documenti` | string \| null | explicit + query | - | status / workflow |
| `telefono` | string \| null | explicit + query | - | contact / identity |
| `temp_selezione_statica` | boolean \| null | schema/type only | - | domain field |
| `test_attitudinale_comunicazione_assistito_badante` | string \| null | schema/type only | - | domain field |
| `test_attitudinale_comunicazione_datore_colf` | string \| null | schema/type only | - | experience / reference |
| `test_attitudinale_comunicazione_famiglia_badante` | string \| null | schema/type only | - | domain field |
| `test_attitudinale_critica_colf` | string \| null | schema/type only | - | domain field |
| `test_attitudinale_esperienze_lavori_colf` | string[] \| null | schema/type only | - | domain field |
| `test_attitudinale_finisco_in_anticipo_colf` | string \| null | schema/type only | - | domain field |
| `test_attitudinale_gestione_lavoro_badante` | string \| null | schema/type only | - | domain field |
| `test_attitudinale_gestione_lavoro_colf` | string \| null | schema/type only | - | domain field |
| `test_attitudinale_igiene_badante` | string \| null | schema/type only | - | domain field |
| `test_attitudinale_lamenta_aggressiva_badante` | string \| null | schema/type only | - | domain field |
| `test_attitudinale_malatie_badante` | string[] \| null | schema/type only | - | domain field |
| `test_attitudinale_organizzazione_lavoro_colf` | string \| null | schema/type only | - | domain field |
| `test_attitudinale_peso_badante` | string \| null | schema/type only | - | domain field |
| `test_attitudinale_stato_motorio_badante` | string \| null | schema/type only | - | domain field |
| `test_attitudinale_task_straordinarie_colf` | string \| null | schema/type only | - | domain field |
| `tipo_lavoro_domestico` | string[] \| null | explicit + query | multi_enum (3) | classification |
| `tipo_rapporto_lavorativo` | string[] \| null | explicit + query | multi_enum (4) | classification |
| `ultima_modifica` | string \| null | explicit + query | - | date / timestamp |
| `ultima_modifica_calendario` | string \| null | schema/type only | - | date / timestamp |
| `ultima_modifica_disponibilita` | string \| null | schema/type only | - | date / timestamp |
| `ultima_modifica_idoneita` | string \| null | schema/type only | - | date / timestamp |
| `url_onboarding_stripe` | string \| null | explicit + query | - | commercial / payment |
| `utm_campaign` | string \| null | explicit + query | - | marketing / attribution |
| `utm_content` | string \| null | explicit + query | - | marketing / attribution |
| `utm_medium` | string \| null | explicit + query | - | marketing / attribution |
| `utm_source` | string \| null | explicit + query | - | marketing / attribution |
| `utm_term` | string \| null | explicit + query | - | marketing / attribution |
| `verified` | boolean \| null | schema/type only | - | domain field |
| `vincoli_orari_disponibilita` | string \| null | explicit + query | - | domain field |
| `vincoli_orari_disponibilita_json` | string \| null | schema/type only | - | json / attachments |
| `worker_availability_last_modified` | string \| null | schema/type only | - | availability |

### `lookup_values`

| Campo | Tipo | Stato repo | Lookup | Area |
| --- | --- | --- | --- | --- |
| `entity_field` | unknown | explicit + query | - | domain field |
| `entity_table` | unknown | explicit + query | - | domain field |
| `id` | unknown | explicit + query | - | primary key |
| `is_active` | unknown | explicit + query | - | domain field |
| `metadata` | unknown | explicit + query | - | domain field |
| `sort_order` | unknown | explicit + query | - | domain field |
| `value_key` | unknown | explicit + query | - | domain field |
| `value_label` | unknown | explicit + query | - | domain field |

### `operatori`

| Campo | Tipo | Stato repo | Lookup | Area |
| --- | --- | --- | --- | --- |
| `aggiornato_il` | unknown | explicit + query | - | date / timestamp |
| `cognome` | unknown | explicit + query | - | contact / identity |
| `creato_il` | unknown | explicit + query | - | date / timestamp |
| `email` | unknown | explicit + query | - | contact / identity |
| `id` | unknown | explicit + query | - | primary key |
| `nome` | unknown | explicit + query | - | contact / identity |
| `telefono` | unknown | explicit + query | - | contact / identity |

### `processi_matching`

| Campo | Tipo | Stato repo | Lookup | Area |
| --- | --- | --- | --- | --- |
| `aggiornato_il` | string \| null | explicit + query | - | date / timestamp |
| `airtable_id` | string \| null | explicit gap | - | foreign key / reference |
| `airtable_record_id` | string \| null | explicit gap | - | foreign key / reference |
| `annuncio_webflow` | string \| null | explicit + query | - | publishing / ad copy |
| `appunti_chiamata_sales` | string \| null | explicit + query | - | domain field |
| `appunti_generali_sul_cliente` | string \| null | schema/type only | - | domain field |
| `brainstorm_slug` | string \| null | schema/type only | - | domain field |
| `campaign_id_klaaryo` | string \| null | schema/type only | - | domain field |
| `cap_link_id` | string \| null | schema/type only | - | foreign key / reference |
| `channel_grouped` | string \| null | explicit + query | enum (5) | marketing / attribution |
| `channel_grouped_copy` | string \| null | schema/type only | - | marketing / attribution |
| `check_synced_looker_studio` | boolean \| null | explicit + query | - | flag / business check |
| `colloqui_fatti_okr_calcolo` | number \| null | schema/type only | - | domain field |
| `colloquio_lista_domande` | string[] \| null | schema/type only | - | domain field |
| `count_pubblicazioni` | number \| null | schema/type only | - | numeric metric |
| `count_pubblicazioni_in_gruppo_facebook` | number \| null | schema/type only | - | numeric metric |
| `creato_il` | string \| null | explicit + query | - | date / timestamp |
| `criticit` | string \| null | schema/type only | - | domain field |
| `da_inviare_in_newsletter` | boolean \| null | schema/type only | - | domain field |
| `data_assegnazione` | string \| null | explicit + query | - | date / timestamp |
| `data_chiusura` | string \| null | explicit + query | - | date / timestamp |
| `data_limite_invio_selezione` | string \| null | explicit + query | - | date / timestamp |
| `data_ora_di_creazione` | string \| null | explicit + query | - | date / timestamp |
| `data_per_ricerca_futura` | string \| null | explicit + query | - | date / timestamp |
| `data_ultima_modifica` | string \| null | explicit + query | - | date / timestamp |
| `deadline_mobile` | string \| null | explicit + query | - | date / timestamp |
| `descrizione_animali_in_casa` | string \| null | explicit + query | - | domain field |
| `descrizione_casa` | string \| null | explicit + query | - | domain field |
| `descrizione_lavoratore_ideale` | string \| null | explicit + query | - | domain field |
| `descrizione_richiesta_ferie` | string \| null | explicit + query | - | domain field |
| `descrizione_richiesta_giorni_riposo` | string \| null | explicit + query | - | domain field |
| `descrizione_richiesta_trasferte` | string \| null | explicit + query | - | domain field |
| `descrizione_seo_webflow` | string \| null | schema/type only | - | publishing / ad copy |
| `descrizione_ultime_colf_cliente` | string \| null | schema/type only | - | domain field |
| `dettagli_o_specifiche_aggiuntive` | string \| null | schema/type only | - | domain field |
| `di_cosa_si_dovra_occupare` | string[] \| null | schema/type only | - | domain field |
| `difficolt_ricerca` | number \| null | schema/type only | - | domain field |
| `disponibilita_colloqui_in_presenza` | string \| null | explicit + query | - | availability |
| `disponibilita_domenica_mattina` | string \| null | explicit gap | - | availability |
| `disponibilita_domenica_notte` | string \| null | schema/type only | - | availability |
| `disponibilita_domenica_pomeriggio` | string \| null | explicit gap | - | availability |
| `disponibilita_domenica_sera` | string \| null | explicit gap | - | availability |
| `disponibilita_giovedi_mattina` | string \| null | explicit gap | - | availability |
| `disponibilita_giovedi_notte` | string \| null | schema/type only | - | availability |
| `disponibilita_giovedi_pomeriggio` | string \| null | explicit gap | - | availability |
| `disponibilita_giovedi_sera` | string \| null | explicit gap | - | availability |
| `disponibilita_lunedi_mattina` | string \| null | explicit gap | - | availability |
| `disponibilita_lunedi_notte` | string \| null | schema/type only | - | availability |
| `disponibilita_lunedi_pomeriggio` | string \| null | explicit gap | - | availability |
| `disponibilita_lunedi_sera` | string \| null | explicit gap | - | availability |
| `disponibilita_martedi_mattina` | string \| null | explicit gap | - | availability |
| `disponibilita_martedi_notte` | string \| null | schema/type only | - | availability |
| `disponibilita_martedi_pomeriggio` | string \| null | explicit gap | - | availability |
| `disponibilita_martedi_sera` | string \| null | explicit gap | - | availability |
| `disponibilita_mercoledi_mattina` | string \| null | explicit gap | - | availability |
| `disponibilita_mercoledi_notte` | string \| null | schema/type only | - | availability |
| `disponibilita_mercoledi_pomeriggio` | string \| null | explicit gap | - | availability |
| `disponibilita_mercoledi_sera` | string \| null | explicit gap | - | availability |
| `disponibilita_sabato_mattina` | string \| null | explicit gap | - | availability |
| `disponibilita_sabato_notte` | string \| null | schema/type only | - | availability |
| `disponibilita_sabato_pomeriggio` | string \| null | explicit gap | - | availability |
| `disponibilita_sabato_sera` | string \| null | explicit gap | - | availability |
| `disponibilita_venerdi_mattina` | string \| null | explicit gap | - | availability |
| `disponibilita_venerdi_notte` | string \| null | schema/type only | - | availability |
| `disponibilita_venerdi_pomeriggio` | string \| null | explicit gap | - | availability |
| `disponibilita_venerdi_sera` | string \| null | explicit gap | - | availability |
| `eta_ideale` | number \| null | schema/type only | - | numeric metric |
| `eta_massima` | number \| null | explicit + query | - | numeric metric |
| `eta_minima` | number \| null | explicit + query | - | numeric metric |
| `famiglia_id` | string \| null | explicit + query | - | foreign key / reference |
| `family_availability_json` | string \| null | explicit + query | - | availability |
| `fascia_eta_ideale` | string[] \| null | schema/type only | - | domain field |
| `fase_processo_res` | string \| null | schema/type only | enum (3) | status / workflow |
| `fbclid` | string \| null | explicit + query | - | marketing / attribution |
| `fine_raccolta_candidature` | string \| null | schema/type only | - | domain field |
| `firma_preventivo` | JsonObject \| null | schema/type only | - | commercial / payment |
| `flessibilita_giorni` | string \| null | schema/type only | - | domain field |
| `flessibilita_orari` | string \| null | schema/type only | - | domain field |
| `frequenza_rapporto` | string \| null | explicit + query | enum (3) | classification |
| `from_onboarding` | string \| null | schema/type only | - | domain field |
| `gclid` | string \| null | explicit + query | - | marketing / attribution |
| `geocode` | string \| null | schema/type only | - | domain field |
| `gift_card_code` | number \| null | schema/type only | - | domain field |
| `gift_card_type` | string \| null | schema/type only | - | domain field |
| `id` | string | explicit + query | - | primary key |
| `id_cronjob_follow_up_dopo_colloqui` | string \| null | schema/type only | - | domain field |
| `id_hubspot` | string \| null | schema/type only | - | domain field |
| `indirizzo_prova_cap` | string \| null | explicit + query | - | address / logistics |
| `indirizzo_prova_citofono` | string \| null | explicit + query | - | address / logistics |
| `indirizzo_prova_civico` | string \| null | explicit + query | - | address / logistics |
| `indirizzo_prova_comune` | string \| null | explicit + query | - | address / logistics |
| `indirizzo_prova_note` | string \| null | explicit + query | - | address / logistics |
| `indirizzo_prova_provincia` | string \| null | explicit + query | - | address / logistics |
| `indirizzo_prova_via` | string \| null | explicit + query | - | address / logistics |
| `informazioni_extra_riservate` | string \| null | explicit + query | - | domain field |
| `interesse_consulenza` | string \| null | schema/type only | enum (3) | domain field |
| `introduzione_annuncio` | string \| null | schema/type only | - | publishing / ad copy |
| `is_pagante_manuale` | boolean \| null | schema/type only | - | commercial / payment |
| `is_sent_email_presentazione_referente` | boolean \| null | schema/type only | - | domain field |
| `lavoratori_selezionati_2` | string \| null | schema/type only | - | domain field |
| `link_pagamento_stripe_annuale` | string \| null | schema/type only | - | commercial / payment |
| `link_pagamento_stripe_mensile` | string \| null | schema/type only | - | commercial / payment |
| `link_typeform` | string \| null | schema/type only | - | domain field |
| `liquidity` | string \| null | schema/type only | - | domain field |
| `log_sales` | string \| null | explicit + query | - | domain field |
| `luogo_id` | string \| null | explicit gap | - | foreign key / reference |
| `mansioni_richieste` | string \| null | explicit + query | - | domain field |
| `mansioni_richieste_transformed_ai` | string \| null | explicit + query | - | domain field |
| `metadati_migrazione` | JsonObject \| null | schema/type only | - | json / attachments |
| `metratura_casa` | string \| null | explicit + query | - | domain field |
| `modalita_tariffa` | string \| null | explicit + query | enum (5) | classification |
| `modello_smartmatching` | string \| null | explicit + query | - | domain field |
| `momento_disponibilita` | string[] \| null | explicit + query | - | domain field |
| `momento_giornata` | string \| null | schema/type only | - | domain field |
| `momento_settimana` | string \| null | schema/type only | - | domain field |
| `motivazione_lost` | string \| null | explicit + query | enum (7) | reason / explanation |
| `motivazione_oot` | string \| null | explicit + query | enum (6) | reason / explanation |
| `motivo_no_match` | string \| null | explicit + query | enum (8) | reason / explanation |
| `must_have_ricerca` | string \| null | schema/type only | - | domain field |
| `nice_to_have_ricerca` | string \| null | schema/type only | - | domain field |
| `nucleo_famigliare` | string \| null | explicit + query | - | domain field |
| `numero_giorni_settimanali` | string \| null | explicit + query | - | numeric metric |
| `numero_lavoratori_da_ricevere_smart_matching` | number \| null | schema/type only | - | numeric metric |
| `numero_ricerca_attivata` | number \| null | explicit + query | - | numeric metric |
| `offerta` | string \| null | schema/type only | - | domain field |
| `old_stato_sales` | string \| null | explicit gap | - | domain field |
| `orario_di_lavoro` | string \| null | explicit + query | - | domain field |
| `ore_settimanale` | string \| null | explicit + query | - | numeric metric |
| `paga_mensile` | string \| null | explicit + query | - | commercial / payment |
| `paga_oraria` | string \| null | explicit + query | - | commercial / payment |
| `patente` | string[] \| null | explicit + query | - | domain field |
| `pipedrive_lead_id` | string \| null | schema/type only | - | foreign key / reference |
| `pipeline` | string \| null | explicit gap | enum (1) | domain field |
| `preferenza_giorno` | string[] \| null | explicit + query | - | domain field |
| `presenza_animali_in_casa` | boolean \| null | explicit + query | - | domain field |
| `presenza_informazioni_riservate` | boolean \| null | schema/type only | - | domain field |
| `preventivo_firmato` | boolean \| null | explicit + query | - | commercial / payment |
| `prima_scelta_pagamento_webapp` | string \| null | schema/type only | - | commercial / payment |
| `prodotto_stripe_custom_id` | string \| null | schema/type only | - | foreign key / reference |
| `pubblicazioni_annunci` | string \| null | schema/type only | - | domain field |
| `qualificazione_lead` | string \| null | explicit gap | enum (4) | domain field |
| `rapporti_lavorativi` | string \| null | explicit gap | - | domain field |
| `recruiter_ricerca_e_selezione_id` | string \| null | explicit + query | - | foreign key / reference |
| `referente_ricerca_e_selezione_id` | string \| null | explicit + query | - | foreign key / reference |
| `richiesta_ferie` | boolean \| null | explicit + query | - | domain field |
| `richiesta_patente` | boolean \| null | explicit + query | - | domain field |
| `richiesta_trasferte` | boolean \| null | explicit + query | - | domain field |
| `sales_cold_call_followup` | string \| null | explicit + query | enum (3) | domain field |
| `sales_no_show_followup` | string \| null | explicit + query | enum (2) | domain field |
| `sesso` | string \| null | explicit + query | - | domain field |
| `slug_short_job_outreach_whatsapp` | string \| null | schema/type only | - | domain field |
| `source_question` | string \| null | explicit + query | - | marketing / attribution |
| `source_url` | string \| null | explicit + query | - | marketing / attribution |
| `src_embed_maps_annucio` | string \| null | explicit + query | - | domain field |
| `stato_messaggi_whatsapp_shortlist` | string \| null | schema/type only | enum (3) | status / workflow |
| `stato_res` | string \| null | explicit + query | enum (17) | status / workflow |
| `stato_sales` | string \| null | explicit + query | enum (14) | status / workflow |
| `stato_whatsapp_invito_colloquio` | string \| null | schema/type only | enum (1) | status / workflow |
| `stipendio_type_structured_data` | string \| null | schema/type only | - | domain field |
| `stipendio_value_hour` | string \| null | schema/type only | - | domain field |
| `stipendio_value_month` | string \| null | schema/type only | - | domain field |
| `tasks` | string \| null | schema/type only | - | domain field |
| `temp_checkbox_recupero` | boolean \| null | schema/type only | - | domain field |
| `temp_risposta_wa` | boolean \| null | schema/type only | - | domain field |
| `test_colloquio_prova` | boolean \| null | schema/type only | - | domain field |
| `test_unico_profilo` | boolean \| null | schema/type only | - | domain field |
| `testo_annuncio_webflow` | string \| null | explicit + query | - | publishing / ad copy |
| `testo_annuncio_whatsapp` | string \| null | explicit + query | - | publishing / ad copy |
| `tipo_incontro_famiglia_lavoratore` | string \| null | explicit + query | enum (2) | classification |
| `tipo_lavoro` | string[] \| null | explicit + query | - | classification |
| `tipo_rapporto` | string[] \| null | explicit + query | - | classification |
| `titolo_annuncio` | string \| null | explicit + query | - | publishing / ad copy |
| `totale_candidati_copy` | number \| null | schema/type only | - | domain field |
| `urgenza` | string \| null | explicit + query | enum (5) | domain field |
| `url_panoramica_ricerca_shorten` | string \| null | schema/type only | - | publishing / ad copy |
| `url_shorten_facebook` | string \| null | schema/type only | - | publishing / ad copy |
| `url_shorten_facebook_page` | string \| null | schema/type only | - | publishing / ad copy |
| `url_shorten_telegram` | string \| null | schema/type only | - | publishing / ad copy |
| `url_shorten_whatsapp` | string \| null | schema/type only | - | publishing / ad copy |
| `url_whatsapp_shortio` | string \| null | schema/type only | - | domain field |
| `utm_campaign` | string \| null | explicit + query | - | marketing / attribution |
| `utm_content` | string \| null | explicit + query | - | marketing / attribution |
| `utm_medium` | string \| null | explicit + query | - | marketing / attribution |
| `utm_source` | string \| null | explicit + query | - | marketing / attribution |
| `utm_term` | string \| null | explicit + query | - | marketing / attribution |
| `wa_conferma_avvio_ricerca` | string \| null | schema/type only | - | domain field |

### `referenze_lavoratori`

| Campo | Tipo | Stato repo | Lookup | Area |
| --- | --- | --- | --- | --- |
| `aggiornato_il` | unknown | explicit + query | - | date / timestamp |
| `assunto_tramite_baze` | boolean \| null | explicit + query | - | domain field |
| `cognome_datore` | string \| null | explicit + query | - | experience / reference |
| `commento_esperienza` | string \| null | explicit + query | - | experience / reference |
| `creato_il` | unknown | explicit + query | - | date / timestamp |
| `data_fine` | string \| null | explicit + query | - | date / timestamp |
| `data_inzio` | string \| null | explicit + query | - | date / timestamp |
| `esperienza_lavoratore_id` | string \| null | explicit + query | - | foreign key / reference |
| `id` | string | explicit + query | - | primary key |
| `lavoratore_id` | string \| null | explicit + query | - | foreign key / reference |
| `nome_datore` | string \| null | explicit + query | - | experience / reference |
| `rapporto_ancora_attivo` | boolean \| null | explicit + query | - | domain field |
| `referenza_verificata` | string \| null | explicit + query | - | experience / reference |
| `referenza_verificata_da_baze` | boolean \| null | explicit + query | - | experience / reference |
| `ruolo` | string[] \| null | explicit + query | - | domain field |
| `telefono_datore` | string \| null | explicit + query | - | experience / reference |
| `valutazione` | number \| null | explicit + query | - | numeric metric |

### `selezioni_lavoratori`

| Campo | Tipo | Stato repo | Lookup | Area |
| --- | --- | --- | --- | --- |
| `aggiornato_il` | unknown | explicit + query | - | date / timestamp |
| `creato_il` | unknown | explicit + query | - | date / timestamp |
| `followup_senza_risposta` | unknown | explicit + query | - | domain field |
| `id` | unknown | explicit + query | - | primary key |
| `lavoratore_id` | unknown | explicit + query | - | foreign key / reference |
| `motivo_archivio` | unknown | explicit + query | - | reason / explanation |
| `motivo_inserimento_manuale` | unknown | explicit + query | - | reason / explanation |
| `motivo_no_match` | unknown | explicit + query | - | reason / explanation |
| `motivo_non_selezionato` | unknown | explicit + query | - | reason / explanation |
| `note_selezione` | unknown | explicit + query | - | domain field |
| `processo_matching_id` | unknown | explicit + query | - | foreign key / reference |
| `punteggio` | unknown | explicit + query | - | numeric metric |
| `stato_selezione` | unknown | explicit + query | - | status / workflow |
| `travel_time_tra_cap` | unknown | explicit + query | - | domain field |

## Note Operative

- Se un campo e `explicit gap`, la UI lo nomina o lo aspetta ma `table-query` non lo espone oggi.
- I campi `query only` sono comunque parte del modello dati leggibile dal frontend, specialmente nella vista `Anagrafiche` che usa `select ["*"]` lato API ma viene poi filtrata dalla whitelist server.
- Il catalogo lookup evita di ridefinire enum e multi-enum nel codice: i valori canonici stanno in `lookup_values`.

## Mappa Allegati FE/DB

### Aggiornamento 2026-04-23

Audit manuale incrociato tra:

- schema locale `data/migrationshema.sql`
- componenti FE `src/components/**`
- utils FE `src/features/**`
- shape effettivamente lette da `AttachmentUploadSlot`

Obiettivo: distinguere con precisione i campi attachment davvero usati nel frontend da quelli solo presenti a schema o usati come fallback legacy.

### Contratto desiderato

Tutti i campi attachment dovrebbero convergere su una shape `jsonb` coerente:

```json
[
  {
    "name": "nome_visibile_file.pdf",
    "path": "baze-bucket/tabella/nome_tecnico_file.pdf",
    "type": "application/pdf"
  }
]
```

### Stato reale attuale

Il FE oggi non salva ancora in modo uniforme quella shape minima.

Nei flussi upload attivi i payload salvati contengono tipicamente anche:

- `bucket`
- `content_type`
- `file_name`
- `public_url`
- `size`
- `uploaded_at`

Inoltre `AttachmentUploadSlot` e permissivo in lettura e accetta shape legacy con:

- `url`
- `download_url`
- `signed_url`
- `public_url`
- `src`
- `name`
- `file_name`
- `filename`
- `original_filename`
- `title`

Quindi oggi il contratto attachment e ancora misto: il FE legge molte varianti e non impone ancora la shape canonica.

### Matrice campi attachment

| Tabella.campo | Stato FE | Modalita | Note |
| --- | --- | --- | --- |
| `lavoratori.foto` | usato | upload + render | Fonte reale per avatar/profilo; `toAvatarUrl()` usa prima `permalink_foto`, poi `foto.url` / `download_url` / `src` |
| `documenti_lavoratori.allegato_codice_fiscale_fronte` | usato | upload + render | Fonte primaria documenti lavoratore |
| `documenti_lavoratori.allegato_codice_fiscale_retro` | usato | upload + render | Fonte primaria documenti lavoratore |
| `documenti_lavoratori.allegato_documento_identita_fronte` | usato | upload + render | Fonte primaria documenti lavoratore |
| `documenti_lavoratori.allegato_documento_identita_retro` | usato | upload + render | Fonte primaria documenti lavoratore |
| `documenti_lavoratori.allegato_permesso_di_soggiorno_fronte` | usato | upload + render | Fonte primaria documenti lavoratore |
| `documenti_lavoratori.allegato_permesso_di_soggiorno_retro` | usato | upload + render | Fonte primaria documenti lavoratore |
| `documenti_lavoratori.allegato_ricevuta_rinnovo_permesso` | usato | upload + render | Fonte primaria documenti lavoratore |
| `lavoratori.docs_codice_fiscale_fronte` | usato | fallback | Fallback legacy per `DocumentsCard`, non fonte primaria |
| `lavoratori.docs_codice_fiscale_retro` | usato | fallback | Fallback legacy per `DocumentsCard`, non fonte primaria |
| `lavoratori.docs_documento_identita_fronte` | usato | fallback | Fallback legacy per `DocumentsCard`, non fonte primaria |
| `lavoratori.docs_documento_identita_retro` | usato | fallback | Fallback legacy per `DocumentsCard`, non fonte primaria |
| `lavoratori.docs_permesso_di_soggiorno_fronte` | usato | fallback | Fallback legacy per `DocumentsCard`, non fonte primaria |
| `lavoratori.docs_permesso_di_soggiorno_retro` | usato | fallback | Fallback legacy per `DocumentsCard`, non fonte primaria |
| `lavoratori.docs_ricevuta_rinnovo_permesso_di_soggiorno` | usato | fallback | Fallback legacy per `DocumentsCard`, non fonte primaria |
| `ticket.allegati` | usato | upload + render | Campo attachment pienamente attivo nel support |
| `contributi_inps.allegato` | usato | upload + render | Campo attachment pienamente attivo nel payroll |
| `rapporti_lavorativi.accordo_di_lavoro_allegati` | usato | upload + render | Gestito nel pannello rapporto |
| `rapporti_lavorativi.ricevuta_inps_allegati` | usato | upload + render | Gestito nel pannello rapporto |
| `metadati_migrazione.delega_inps_allegati` | usato | upload + render | Caso speciale: non e una colonna attachment vera di `rapporti_lavorativi`, vive dentro `metadati_migrazione` |
| `mesi_lavorati.cedolino` | usato | read-only | Mostrato nel dettaglio cedolino; in UI e di fatto non editabile |
| `mesi_lavorati.cedolino_url` | usato | fallback read-only | Fallback testuale/url per il cedolino |
| `chiusure_contratti.documenti_chiusura_rapporto` | usato | read-only | Renderizzato nel board chiusure |
| `chiusure_contratti.allegato_compilato` | usato | read-only | Renderizzato nel board chiusure |
| `variazioni_contrattuali.accordo_variazione_contrattuale` | usato | read-only | Renderizzato nel board variazioni |
| `variazioni_contrattuali.ricevuta_inps_variazione_rapporto` | usato | read-only | Renderizzato nel board variazioni |
| `assunzioni.codice_fiscale_allegati` | non coperto bene | placeholder/parziale | Il detail assunzioni mostra slot documentali, ma non mi risulta un binding reale completo a questi campi |
| `assunzioni.delega_inps_allegati` | non coperto bene | placeholder/parziale | Nel FE il caso delega oggi passa dal metadata del rapporto, non da qui |
| `assunzioni.documenti_bambini_allegati` | non usato | - | Presente a schema, non emerso nel FE |
| `assunzioni.documento_identita_allegati` | non coperto bene | placeholder/parziale | Vedi nota su assunzioni |
| `assunzioni.permesso_di_soggiorno_allegati` | non coperto bene | placeholder/parziale | Vedi nota su assunzioni |
| `assunzioni.ricevuta_rinnovo_permesso_allegati` | non coperto bene | placeholder/parziale | Vedi nota su assunzioni |
| `processi_matching.firma_preventivo` | non usato | - | Presente a DB, non emerso in FE |
| `rapporti_lavorativi.dichiarazione_ospitalita_allegati` | non usato | - | Presente a DB, non emerso in FE |
| `documenti_lavoratori.fronte` | non usato | - | Presente a DB, nessun uso FE rilevato |
| `documenti_lavoratori.retro` | non usato | - | Presente a DB, nessun uso FE rilevato |
| `documenti_lavoratori.selfie` | non usato | - | Presente a DB, nessun uso FE rilevato |
| `lavoratori.allegati` | non usato | - | Campo generico, non emerso come flusso attivo |
| `lavoratori.cv` | non usato | - | Presente a DB, non emerso come flusso attivo |
| `operatori.foto` | non usato | - | Esiste a DB, ma l'UI operatori usa avatar generati/iniziali |
| `esperienze_lavoratori.referenza_documenti` | non usato | - | Presente a DB, non emerso in FE |
| `referenze_lavoratori.allegati_referenza` | non usato | - | Presente a DB, non emerso in FE |
| `costi_marketing.attachments` | non usato | - | Presente a DB, non emerso in FE |
| `moduli_cud.allegato` | non usato | - | Presente a DB, non emerso in FE |
| `variabili_globali.allegati` | non usato | - | Presente a DB, non emerso in FE |

### Fonti FE principali

I punti centrali da ricordare sono questi:

- `documenti_lavoratori.allegato_*` e il flusso documentale primario del lavoratore
- `lavoratori.docs_*` e solo fallback legacy per popolare `DocumentsCard`
- `lavoratori.foto` e davvero usato nel profilo lavoratore
- `operatori.foto` esiste a DB ma non mi risulta usato nel FE attuale

### File FE chiave

- `src/components/lavoratori/documents-card.tsx`
- `src/components/lavoratori/lavoratori-cerca-view.tsx`
- `src/components/lavoratori/gate1-view.tsx`
- `src/components/lavoratori/worker-profile-header.tsx`
- `src/components/lavoratori/worker-profile-overview.tsx`
- `src/features/lavoratori/lib/base-utils.ts`
- `src/components/support/support-ticket-detail-sheet.tsx`
- `src/components/payroll/contributi-inps-view.tsx`
- `src/components/payroll/payroll-overview-view.tsx`
- `src/components/gestione-contrattuale/rapporto-detail-panel.tsx`
- `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx`
- `src/components/gestione-contrattuale/chiusure-board-view.tsx`
- `src/components/gestione-contrattuale/variazioni-board-view.tsx`

### Problemi strutturali emersi

1. Duplicazione logica sui documenti lavoratore
   - `documenti_lavoratori.allegato_*` e `lavoratori.docs_*` convivono
   - i primi sono il flusso vero, i secondi sono fallback legacy

2. Shape attachment non uniforme
   - il formato letto/scritto oggi non e ancora allineato alla shape minima `name/path/type`

3. Campi attachment generici o poco chiari
   - `lavoratori.allegati`
   - `ticket.allegati`
   - `costi_marketing.attachments`
   Questi rischiano di diventare contenitori eterogenei se non governati bene

4. Caso speciale sporco su delega INPS
   - `delega_inps_allegati` lato FE oggi vive in `metadati_migrazione`
   - non e modellato come colonna attachment dedicata sul rapporto

### Direzione consigliata

- Tenere come fonte primaria i documenti worker in `documenti_lavoratori.allegato_*`
- Tenere `lavoratori.foto` come fonte foto worker
- Deprecare progressivamente i fallback `lavoratori.docs_*`
- Uniformare la shape attachment a `name/path/type`
- Ridurre i campi attachment generici quando esiste gia una categoria documentale specifica
