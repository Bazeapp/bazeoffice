# Mappa lookup key/label

Data controllo: 2026-05-20.

Obiettivo: mappare i punti della webapp in cui i valori di `lookup_values` possono creare mismatch tra `value_key` usato dalla UI e `value_label` salvato/restituito dal backend.

Aggiornamento fix: i punti ad alta priorita mappati in questo documento sono stati normalizzati lato UI. La regola applicata e': `Select.value` / `checked` usa la key tecnica risolta da key/label, mentre `onValueChange` salva la label canonica quando il campo e' lookup-backed.

Guardrail aggiunto: `npm run audit:lookup` scansiona i pattern rischiosi (`SelectItem value={option.value}`, `SelectItem value={option.valueKey}`, radio/checkbox con key, patch dirette) e fallisce se trova occorrenze non revisionate.

## Regola attuale emersa

- `lookup_values` espone `entity_table`, `entity_field`, `value_key`, `value_label`.
- Le Edge Function `create-record` e `update-record` normalizzano i campi lookup-backed in ingresso e salvano la `value_label`.
- Quindi il DB tende a contenere label, non key. Esempio: `tipo_rapporto = "Part time"`.
- Le opzioni UI sono spesso costruite come `{ value: value_key, label: value_label }`.
- Ogni select lookup-backed deve quindi convertire il valore DB da label a key per `Select.value`, oppure usare direttamente label come `SelectItem.value`.

## Backend e API

| File | Ruolo | Stato |
| --- | --- | --- |
| `supabase/functions/lookup-values/index.ts` | Espone `lookup_values` ordinati per tabella/campo/sort/label. | Neutro. |
| `src/lib/anagrafiche-api.ts` | `fetchLookupValues()` invoca `lookup-values` con cache TTL 5 minuti. | Neutro. |
| `supabase/functions/create-record/index.ts` | `normalizeLookupBackedValues()` mappa key o label verso `value_label` prima dell'insert. | Canonico DB = label. |
| `supabase/functions/update-record/index.ts` | `normalizeLookupBackedPatch()` mappa key o label verso `value_label` prima dell'update. | Canonico DB = label. |
| `supabase/functions/update-process-stato-sales/index.ts` | Valida key/label e salva `stato_sales` come `value_label`. | Canonico DB = label. |
| `supabase/functions/table-query/index.ts` | Costruisce alias key+label per i filtri lookup, quindi i filtri con key possono matchare righe salvate con label. | Gia protetto lato filtro. |
| `supabase/migrations/20260517170000_restore_lookup_value_labels.sql` | Migrazione che converte valori DB da key a label su campi lookup text/array. | Conferma scelta label. |
| `supabase/audit_lookup_normalized_values.sql` | Audit per trovare righe ancora salvate con `value_key`. | Utile per verifica DB. |

## Helper frontend esistenti

| File | Helper | Uso corretto |
| --- | --- | --- |
| `src/features/lavoratori/lib/lookup-utils.ts` | `findLookupOption()` | Matcha sia `option.value` sia `option.label`. |
| `src/features/lavoratori/lib/lookup-utils.ts` | `getLookupSelectValue()` | Converte valore DB key/label nel `option.value` atteso dalla select. |
| `src/features/lavoratori/lib/lookup-utils.ts` | `normalizeLookupDbLabels()` | Converte array selezionato verso label da salvare. |
| `src/features/lavoratori/lib/lookup-utils.ts` | `normalizeLookupOptionValues()` | Converte array DB key/label verso option values per combobox. |
| `src/hooks/use-crm-pipeline-preview.ts` | `normalizeLookupPatchLabels()` | Converte patch CRM `processi_matching` verso label prima di salvare. |
| `src/components/ricerca/ricerca-detail-view.tsx` | `resolveLookupValueKey()` / `selectedLookupOptionValue()` | Converte label DB a key per select CRM ricerca. |

Questi helper sono la base del fix sistemico. Il problema nasce nei punti che non li usano.

## Punti a rischio da correggere

Questi sono i punti dove il componente usa un valore proveniente da DB/stato record come `Select.value`, ma le opzioni usano `value_key`. Se il DB contiene `value_label`, la select puo apparire vuota.

| Area | File | Campi lookup | Pattern rilevato | Priorita |
| --- | --- | --- | --- | --- |
| Prove colloqui, dettaglio prova | `src/components/prove-colloqui/prove-colloqui-view.tsx` | `rapporti_lavorativi.prova_stato_cs`, `prova_feedback_famiglia`, `prova_feedback_lavoratore`, `prova_ramo_d2` | `value={rapporto.<campo> ?? "none"}` con `<SelectItem value={option.value}>`. Dopo update il record torna label. | Alta |
| Prove colloqui, dettaglio colloquio | `src/components/prove-colloqui/prove-colloqui-view.tsx` | `processi_matching.tipo_incontro_famiglia_lavoratore` | Usa raw value e fallback item se non trova key. Non si svuota sempre, ma resta non canonico. | Media |
| CRM onboarding | `src/components/crm/cards/onboarding-card.tsx` | `processi_matching.tipo_incontro_famiglia_lavoratore` | `tipoIncontro` viene inizializzato dal valore DB, ma la select ha item con `valueKey`. | Alta |
| Ricerca lavoratori, sheet colloquio | `src/components/ricerca/ricerca-workers-pipeline-view.tsx` | `selezioni_lavoratori.stato_selezione` | `currentStato` arriva dalla riga selezione, item con `option.value`. | Alta |
| Dettaglio selezione | `src/components/ricerca/selection-details-card.tsx` | `stato_selezione`, `followup_senza_risposta`, `motivo_archivio`, `motivo_no_match` | Select singole usano draft raw + `option.value`. I multi lookup nello stesso file sono invece normalizzati. | Alta |
| Scheda colloquio | `src/components/ricerca/scheda-colloquio-panel.tsx` | `selezioni_lavoratori.motivo_no_match` | Select singola usa draft raw + `option.value`. Multi `motivo_non_selezionato` e' normalizzato. | Alta |
| Header lavoratore, disponibilita | `src/components/lavoratori/worker-profile-header.tsx`, `src/components/lavoratori/lavoratori-cerca-view.tsx`, `src/hooks/use-selected-worker-editor.ts` | `lavoratori.disponibilita`, `data_ritorno_disponibilita` | L'header risolve key/label per mostrare il valore, ma al cambio invia `option.value` al backend. `update-record` rientra con label e il draft viene riallineato dal record. Da normalizzare per evitare salti key/label e stati UI che sembrano tornare indietro. | Alta |
| Card disponibilita lavoratore | `src/components/lavoratori/availability-status-card.tsx` | `lavoratori.disponibilita` | La card usa `Select.value={draft.disponibilita}` e item con `value={option.label}`. E' coerente se il draft contiene label, ma non se riceve una key da altri punti UI. | Media |
| Lavoratori cerca, quick fix issue | `src/components/lavoratori/lavoratori-cerca-view.tsx` | `lavoratori.hai_referenze` | `value={selectedWorkerRow?.hai_referenze}` ma item usa `option.value`. Nello stesso blocco `provincia` e `documenti_in_regola` usano label e sono meno rischiosi. | Media |
| Header lavoratore | `src/components/lavoratori/worker-profile-header.tsx` | `lavoratori.sesso`, `lavoratori.nazionalita` | Il render helper in alto e' sicuro, ma i select inline in edit mode usano `draft.sesso`/`draft.nazionalita` con item `option.value`. | Media |

## Punti gia protetti o coerenti

| Area | File | Campi | Perche non e' il bug principale |
| --- | --- | --- | --- |
| Assunzioni detail | `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx` | `processi_matching.stato_assunzione`, `rapporti_lavorativi.tipo_rapporto`, `processi_matching.offerta` | Usa `getLookupSelectValue()` per `Select.value` e salva label via `getLookupLabelForSave()`. |
| Ricerca detail | `src/components/ricerca/ricerca-detail-view.tsx` | `stato_res`, `tipo_incontro_famiglia_lavoratore`, `motivo_no_match` | Usa resolver key/label e `normalizeLookupPatchLabels()`. |
| Ricerca family summary | `src/components/ricerca/ricerca-family-summary-card.tsx` | `processi_matching.stato_res` | `selectedOptionValue()` matcha key e label. |
| CRM detail famiglia | `src/components/crm/famiglia-processo-detail-content.tsx` | `stato_sales`, `tipo_lavoro`, `tipo_rapporto` | Converte selected key/label e salva label per multi/single. |
| CRM stato lead | `src/components/crm/cards/stato-lead-card.tsx` | `stato_sales`, `sales_cold_call_followup`, `sales_no_show_followup`, `motivazione_lost`, `motivazione_oot` | `selectedOptionValue()` matcha key e label per choice; stage e' canonicalizzato dal board. |
| CRM onboarding context | `src/components/crm/cards/onboarding-context-card.tsx` | `stato_res`, motivazioni/followup sales | Usa `selectedOptionValue()` per i select. |
| CRM onboarding decisione lavoro | `src/components/crm/cards/onboarding-decisione-lavoro-card.tsx` | `nazionalita_escluse`, `nazionalita_obbligatorie`, `patente` | Usa label come item/value nei combobox e nel select patente. |
| CRM onboarding provincia/offerta | `src/components/crm/cards/onboarding-card.tsx` | `indirizzo_prova_provincia`, `provincia`, `offerta` | Provincia e offerta usano `getSelectedLookupValue()`; provincia salva label. |
| Documenti lavoratore | `src/components/lavoratori/documents-card.tsx` | `stato_verifica_documenti`, `documenti_in_regola` | Usa `getLookupSelectValue()` e fallback option. |
| Profilo lavoratore overview | `src/components/lavoratori/worker-profile-overview.tsx` | `livello_italiano`, `sesso`, `nazionalita` | Usa `getLookupSelectValue()`. |
| Gate1 lavoratori | `src/components/lavoratori/gate1-view.tsx` | `hai_referenze`, `documenti_in_regola`, `nazionalita`, multi lookup vari | Select critiche usano `getLookupSelectValue()`; multi usano `normalizeLookupDbLabels()`. |
| Indirizzo lavoratore | `src/components/lavoratori/address-section-card.tsx` | `provincia`, `come_ti_sposti` | Provincia usa label come value; mobilita usa normalizzazione key/label. |
| Ricerca lavoro lavoratore | `src/components/lavoratori/job-search-card.tsx` e `worker-shift-preferences-fields.tsx` | `tipo_lavoro_domestico`, `tipo_rapporto_lavorativo`, check accettazione | Radio usano label; multi normalizzano verso label. |
| Skill lavoratore | `src/components/lavoratori/skills-competenze-card.tsx`, `skills-choice-matrix.tsx` | livelli e compatibilita | Select/radio usano label come value. |
| Esperienze/referenze | `src/components/lavoratori/experience-references-card.tsx` | `esperienze_lavoratori.tipo_lavoro`, `tipo_rapporto`, `referenze_lavoratori.referenza_verificata` | Multi normalizzati; select singoli usano label come value. |
| Worker pipeline summary | `src/components/ricerca/worker-pipeline-summary-cards.tsx` | province, mobilita, tipo lavoro/rapporto | Province usano label; mobilita normalizzata; altri passano da componenti gia normalizzati. |
| Filtri data table/anagrafiche | `src/components/data-table/data-table-filter-builder.tsx`, `src/components/anagrafiche/anagrafiche-query-builder.tsx` | tutti i lookup filter-backed | UI usa key, ma `table-query` espande key/label con alias lato backend. Non e' il bug di visualizzazione select. |

## Board e viste solo visuali

Questi punti leggono lookup per stage, colori, badge o grouping. Sono generalmente protetti perche costruiscono alias key+label e trasformano il valore DB in uno stage id interno.

| File | Lookup usati | Stato |
| --- | --- | --- |
| `src/hooks/use-assunzioni-board.ts` | `processi_matching.stato_assunzione` | Alias key/label, safe per board. |
| `src/hooks/use-chiusure-board.ts` | `chiusure_contratti.stato`, `tipo_licenziamento`, `tipo_decesso` | Alias key/label per stage e label tipo. |
| `src/hooks/use-variazioni-board.ts` | `variazioni_contrattuali.stato` | Alias key/label. |
| `src/hooks/use-payroll-board.ts` | `mesi_lavorati.stato_mese_lavorativo` | Alias key/label. |
| `src/hooks/use-contributi-inps-board.ts` | `contributi_inps.stato_contributi_inps` | Alias key/label. |
| `src/hooks/use-support-tickets-board.ts` | `ticket.stato` | Alias key/label. |
| `src/hooks/use-ricerca-board.ts` | `processi_matching.stato_res` + colori lookup | Alias key/label e colori. |
| `src/hooks/use-ricerca-workers-pipeline.ts` | `lavoratori.stato_selezione`, colori lavoratori/selezioni | Stage alias key/label; attenzione solo ai select consumers indicati sopra. |
| `src/hooks/use-rapporti-lavorativi-data.ts` | colori lookup rapporti/processi | Solo colori/badge. |
| `src/hooks/use-rapporto-related-data.ts` | colori lookup related rapporti | Solo colori/badge. |
| `src/hooks/use-crm-assegnazione.ts` | colori/label lookup CRM assegnazione | Solo mapping display. |

## Domini lookup mappati nella UI

Elenco sintetico dei domini trovati in uso:

- `processi_matching`: `stato_sales`, `stato_res`, `stato_assunzione`, `tipo_lavoro`, `tipo_rapporto`, `tipo_incontro_famiglia_lavoratore`, `motivo_no_match`, `sales_cold_call_followup`, `sales_no_show_followup`, `motivazione_lost`, `motivazione_oot`, `preferenza_giorno`, `offerta`, `provincia`, `indirizzo_prova_provincia`, `nazionalita_escluse`, `nazionalita_obbligatorie`, `patente`.
- `lavoratori`: `stato_lavoratore`, `motivazione_non_idoneo`, `followup_chiamata_idoneita`, `disponibilita`, `provincia`, `sesso`, `nazionalita`, `documenti_in_regola`, `stato_verifica_documenti`, `hai_referenze`, `come_ti_sposti`, `tipo_lavoro_domestico`, `tipo_rapporto_lavorativo`, `check_lavori_accettabili`, `disponibilita_nel_giorno`, `check_accetta_funzionamento_baze`, `check_accetta_lavori_con_trasferta`, `check_accetta_multipli_contratti`, `check_accetta_paga_9_euro_netti`, `check_accetta_babysitting_neonati`, `check_accetta_babysitting_multipli_bambini`, `check_accetta_case_con_cani`, `check_accetta_case_con_cani_grandi`, `check_accetta_case_con_gatti`, `check_accetta_salire_scale_o_soffitti_alti`, `livello_italiano`, `livello_inglese`, `livello_cucina`, `livello_stiro`, `livello_pulizie`, `livello_babysitting`, `livello_dogsitting`, `livello_giardinaggio`, `compatibilita_con_stiro_esigente`, `compatibilita_con_cucina_strutturata`, `compatibilita_babysitting_neonati`, `compatibilita_famiglie_numerose`, `compatibilita_famiglie_molto_esigenti`, `compatibilita_lavoro_con_datore_presente_in_casa`, `compatibilita_con_case_di_grandi_dimensioni`, `compatibilita_con_animali_in_casa`, `compatibilita_con_elevata_autonomia_richiesta`, `compatibilita_con_contesti_pacati`, `rating_corporatura`.
- `selezioni_lavoratori`: `stato_selezione`, `motivo_non_selezionato`, `motivo_no_match`, `followup_senza_risposta`, `motivo_archivio`.
- `rapporti_lavorativi`: `tipo_rapporto`, `stato_rapporto`, `stato_assunzione`, `stato_riattivazione`, `prova_stato_cs`, `prova_feedback_famiglia`, `prova_feedback_lavoratore`, `prova_ramo_d2`.
- `esperienze_lavoratori`: `tipo_lavoro`, `tipo_rapporto`.
- `referenze_lavoratori`: `referenza_verificata`.
- `chiusure_contratti`: `stato`, `tipo_licenziamento`, `tipo_decesso`.
- `variazioni_contrattuali`: `stato`.
- `mesi_lavorati`: `stato_mese_lavorativo`.
- `contributi_inps`: `stato_contributi_inps`.
- `ticket`: `stato`.

## Fix sistemico consigliato

1. Mantenere DB canonico a label, perche backend, migrazione e audit sono gia costruiti cosi.
2. Standardizzare gli helper anche per `LookupOptionsByField` CRM:
   - `getLookupFieldSelectValue(rawValue, options, emptyValue)` che matcha key/label e ritorna `valueKey`.
   - `getLookupFieldLabelForSave(selectedValue, options)` che ritorna `valueLabel`.
   - `getLookupFieldSelectedKeys(rawValueOrCommaString, options)` che matcha key/label e ritorna key per checkbox/combobox multi.
3. Per `LookupOption { value, label }`, usare sempre:
   - `Select.value = getLookupSelectValue(recordValue, options, EMPTY_SELECT_VALUE)`.
   - su `onValueChange`, salvare label quando il componente mantiene stato locale, oppure lasciare che `update-record` normalizzi e aggiornare lo stato locale con la label ritornata.
4. Sostituire i punti a rischio sopra, non solo `tipo_rapporto`.
5. Tenere `npm run audit:lookup` come controllo prima di chiudere modifiche lookup: se compare un punto nuovo, va corretto o classificato esplicitamente.
6. Dopo il fix, verificare con un valore dove key e label differiscono, almeno:
   - `rapporti_lavorativi.tipo_rapporto`: `part_time` / `Part time`.
   - `processi_matching.tipo_incontro_famiglia_lavoratore`: se key e label differiscono.
   - `selezioni_lavoratori.stato_selezione`: se key e label differiscono.
   - `lavoratori.nazionalita` o `sesso`: se key e label differiscono.
