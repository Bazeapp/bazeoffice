# FE readonly control map

Data: 2026-05-20

Scopo: mappare i punti FE dove l'utente puo incontrare select, radio, chip, multienum, combobox o testi collegati a dati operativi/lookup. La navigazione e' stata solo read-only: apertura pagine e lettura DOM/codice, nessuna selezione, nessun salvataggio, nessun blur intenzionale su campi editabili.

## Regole di lettura

- `Osservato in pagina`: controllo visibile navigando la route senza aprire record o menu.
- `Da sorgente`: controllo presente dentro card, sheet, detail panel, drawer o stato condizionale.
- `Lookup-backed`: opzioni provenienti da `lookup_values` o mappe `lookupOptions`.
- `Enum/local`: opzioni hardcoded/locali, non necessariamente lookup DB.
- `Testo/data/numero`: input o textarea con salvataggio operativo, spesso su blur/change.

## Navigazione readonly eseguita

| Route | Controlli visibili senza aprire record |
| --- | --- |
| `/bazeoffice/pipeline` | Search input; select `Periodo`; input datetime `Creato da`; input datetime `Creato a`; select `Preventivo`; select `Chiamata` |
| `/bazeoffice/assegnazione` | Select recruiter `Tutti i recruiter`; select tipo ricerca `Tutte le ricerche` |
| `/bazeoffice/ricerca` | Select recruiter; search input |
| `/bazeoffice/cerca-lavoratori` | Search input; bottoni toolbar `Preferiti`, ordinamento, filtri |
| `/bazeoffice/gate-1` | Search input; toolbar; select `Provincia` disabilitata; select `Follow-up` disabilitata |
| `/bazeoffice/gate-2` | Search input; toolbar; select `Stato Gate 2`; select `Provincia` disabilitata |
| `/bazeoffice/gestione-contrattuale/rapporti-lavorativi` | Search input; toolbar; select `Stato rapporto` |
| `/bazeoffice/gestione-contrattuale/assunzioni` | Search input |
| `/bazeoffice/gestione-contrattuale/chiusure` | Search input |
| `/bazeoffice/gestione-contrattuale/variazioni` | Search input |
| `/bazeoffice/payroll/cedolini` | Search input |
| `/bazeoffice/payroll/contributi-inps` | Search input; select `Tutti gli stati` |
| `/bazeoffice/customer-support/prove-e-colloqui` | Search input |
| `/bazeoffice/customer-support/ticket-customer` | Search input; select `Tutti gli stati` |
| `/bazeoffice/customer-support/ticket-payroll` | Search input; select `Tutti gli stati` |
| `/bazeoffice/customer-support/riattivazioni` | Search input |
| `/bazeoffice/famiglie` | Search input; gruppo/filtri tabella |
| `/bazeoffice/processi` | Search input; gruppo/filtri tabella |
| `/bazeoffice/lavoratori` | Search input; gruppo/filtri tabella |
| `/bazeoffice/selezioni_lavoratori` | Search input; gruppo/filtri tabella |
| `/bazeoffice/rapporti_lavorativi` | Search input; gruppo/filtri tabella |

## CRM pipeline

| Area | Componente | Controllo | Campo/label | Tipo | Note rischio |
| --- | --- | --- | --- | --- | --- |
| Pipeline toolbar | `src/components/crm/crm-pipeline-famiglie-view.tsx` | Select | Periodo | Enum/local | filtro, non persiste lookup |
| Pipeline toolbar | `src/components/crm/crm-pipeline-famiglie-view.tsx` | Date/time input | Creato da/a | Testo/data | filtro, non lookup |
| Pipeline toolbar | `src/components/crm/crm-pipeline-famiglie-view.tsx` | Select | Preventivo | Enum/local | filtro, non persiste lookup |
| Pipeline toolbar | `src/components/crm/crm-pipeline-famiglie-view.tsx` | Select | Chiamata | Enum/local | filtro, non persiste lookup |
| Card/kanban | `src/components/crm/cards/stato-lead-card.tsx` | Radio/select stage | Stato lead/sales | Lookup-backed | usa normalizzazione key/label |
| Campi contestuali | `src/components/crm/cards/onboarding-context-card.tsx` | Checkbox chip sequenziali | Tentativi di chiamata | Lookup-backed multivalue | campi `sales_cold_call_followup`, `sales_no_show_followup`; fix gia applicato per normalizzare checked key/label |
| Campi contestuali | `src/components/crm/cards/onboarding-context-card.tsx` | Date/time input | Data chiamata prenotata / Data e ora callback | Testo/data | scrive su famiglia/processo |
| Campi contestuali | `src/components/crm/cards/onboarding-context-card.tsx` | Date input | Data ricontatto | Testo/data | scrive `data_per_ricerca_futura` |
| Campi contestuali | `src/components/crm/cards/onboarding-context-card.tsx` | Textarea | Note | Testo | scrive `appunti_chiamata_sales` |
| Campi contestuali | `src/components/crm/cards/onboarding-context-card.tsx` | Select | Stato operativo | Lookup-backed | campo `stato_res` |
| Campi contestuali | `src/components/crm/cards/onboarding-context-card.tsx` | Choice/radio | Motivazione lost | Lookup-backed | campo `motivazione_lost` |
| Campi contestuali | `src/components/crm/cards/onboarding-context-card.tsx` | Choice/radio | Motivazione out of target | Lookup-backed | campo `motivazione_oot` |
| Dettaglio famiglia/processo | `src/components/crm/famiglia-processo-detail-content.tsx` | Select | Stato | Lookup-backed | campo `stato_sales` |
| Dettaglio famiglia/processo | `src/components/crm/famiglia-processo-detail-content.tsx` | Multi badge/chip | Tipo lavoro | Lookup-backed multi | campo `tipo_lavoro` |
| Dettaglio famiglia/processo | `src/components/crm/famiglia-processo-detail-content.tsx` | Select | Tipo rapporto | Lookup-backed | campo `tipo_rapporto` |
| Onboarding - orari | `src/components/crm/cards/onboarding-card.tsx` | Text input | Orario di lavoro | Testo | input operativo |
| Onboarding - orari | `src/components/crm/cards/onboarding-card.tsx` | Number input | Ore settimanali | Numero | input operativo |
| Onboarding - orari | `src/components/crm/cards/onboarding-card.tsx` | Number input | Giorni settimanali | Numero | input operativo |
| Onboarding - orari | `src/components/crm/cards/onboarding-card.tsx` | Multi combobox/chip | Giornate preferite | Enum/local multivalue | weekdays locali |
| Onboarding - luogo | `src/components/crm/cards/onboarding-card.tsx` | Select | Provincia | Lookup-backed | `indirizzo_prova_provincia` / `provincia` |
| Onboarding - luogo | `src/components/crm/cards/onboarding-card.tsx` | Text input | CAP, Via, Quartiere, SRC Maps URL | Testo | patch indirizzo/processo |
| Onboarding - tempistiche | `src/components/crm/cards/onboarding-card.tsx` | Date picker | Deadline | Testo/data | patch `deadline_mobile` |
| Onboarding - tempistiche | `src/components/crm/cards/onboarding-card.tsx` | Text input | Inserire 3 disponibilita di giorno e fascia oraria | Testo | patch `disponibilita_colloqui_in_presenza` |
| Onboarding - tempistiche | `src/components/crm/cards/onboarding-card.tsx` | Select | Seleziona la tipologia del primo incontro | Lookup-backed | campo `tipo_incontro_famiglia_lavoratore`; incluso nel fix key/label |
| Onboarding - tempistiche | `src/components/crm/cards/onboarding-card.tsx` | Number input | Fee concordata | Numero | non lookup |
| Onboarding - tempistiche | `src/components/crm/cards/onboarding-card.tsx` | Readonly/copy URL | Link preventivo, Link area privata, URL origine | Testo/readonly | non lookup |
| Onboarding - tempistiche | `src/components/crm/cards/onboarding-card.tsx` | Select | Sconto applicato | Lookup-backed | campo `offerta`; incluso nel fix key/label |
| Decisione lavoro | `src/components/crm/cards/onboarding-decisione-lavoro-card.tsx` | Text/number inputs | famiglia, casa, animali, mansioni, eta, ferie/trasferte, note | Testo/numero | vari campi processo |
| Decisione lavoro | `src/components/crm/cards/onboarding-decisione-lavoro-card.tsx` | Select | Patente/sesso/nazionalita dove presenti | Lookup-backed o label-valued | verificato: selezioni label-valued o boolean |
| Decisione lavoro | `src/components/crm/cards/onboarding-decisione-lavoro-card.tsx` | Checkbox | richieste specifiche, animali, mansioni | Boolean/local | non key/label lookup |
| Assegnazione | `src/components/crm/crm-assegnazione-view.tsx` | Select | Recruiter, tipo ricerca, stato/assegnazione card | Enum/local/operatori | filtri e assegnazioni |

## Ricerca e selezioni

| Area | Componente | Controllo | Campo/label | Tipo | Note rischio |
| --- | --- | --- | --- | --- | --- |
| Board ricerca | `src/components/ricerca/ricerca-board-view.tsx` | Select | Operatore/recruiter | Enum/operatori | filtro |
| Detail ricerca header | `src/components/ricerca/ricerca-detail-view.tsx` | Select | Stato | Lookup-backed | campo `stato_res` |
| Detail ricerca header | `src/components/ricerca/ricerca-detail-view.tsx` | Select avatar | Recruiter assegnato | Operatori | non lookup_values |
| Detail ricerca header | `src/components/ricerca/ricerca-detail-view.tsx` | Select | Tipologia di incontro | Lookup-backed | campo `tipo_incontro_famiglia_lavoratore`; va verificato insieme all'analogo CRM |
| Detail ricerca header | `src/components/ricerca/ricerca-detail-view.tsx` | Select | Motivo no match | Lookup-backed | campo `motivo_no_match` |
| Summary famiglia ricerca | `src/components/ricerca/ricerca-family-summary-card.tsx` | Select | Stato ricerca | Lookup-backed | selected value key/label normalizzato |
| Pipeline worker | `src/components/ricerca/ricerca-workers-pipeline-view.tsx` | Header worker selects | Stato, disponibile, motivazione | Lookup-backed | passa da `WorkerProfileHeader` |
| Pipeline worker | `src/components/ricerca/worker-pipeline-summary-cards.tsx` | Select/combobox/radio | sezioni worker riassunto | Lookup-backed/local | include mobilita, disponibilita, scelte competenze |
| Scheda colloquio | `src/components/ricerca/scheda-colloquio-panel.tsx` | Combobox | lavoratore/record collegato | Entity select | non lookup_values |
| Scheda colloquio | `src/components/ricerca/scheda-colloquio-panel.tsx` | Select | Esito / stato colloquio | Enum/local o lookup secondo campo | verificato nel fix per campi lookup |
| Scheda colloquio | `src/components/ricerca/scheda-colloquio-panel.tsx` | Select | Motivo no match | Lookup-backed | normalizzato |
| Scheda colloquio | `src/components/ricerca/scheda-colloquio-panel.tsx` | Select/multi | Motivo non selezionato | Lookup-backed multi | normalizzato |
| Scheda colloquio | `src/components/ricerca/scheda-colloquio-panel.tsx` | Input score | punteggi/valutazioni | Numero/testo | non lookup |
| Scheda colloquio | `src/components/ricerca/scheda-colloquio-panel.tsx` | Textarea | note colloquio | Testo | non lookup |
| Selection details | `src/components/ricerca/selection-details-card.tsx` | Select | Followup senza risposta | Lookup-backed | campo `followup_senza_risposta` |
| Selection details | `src/components/ricerca/selection-details-card.tsx` | Select | Motivazione archivio | Lookup-backed | campo `motivo_archivio` |
| Selection details | `src/components/ricerca/selection-details-card.tsx` | Multi lookup field/chip | Motivazione non selezionato | Lookup-backed multi | campo `motivo_non_selezionato` |
| Selection details | `src/components/ricerca/selection-details-card.tsx` | Select | Motivazione no match | Lookup-backed | campo `motivo_no_match` |
| Selection details | `src/components/ricerca/selection-details-card.tsx` | Textarea | motivo inserimento manuale / note | Testo | non lookup |

## Lavoratori, cerca lavoratori, Gate 1, Gate 2

| Area | Componente | Controllo | Campo/label | Tipo | Note rischio |
| --- | --- | --- | --- | --- | --- |
| Cerca lavoratori toolbar | `src/components/lavoratori/lavoratori-cerca-view.tsx` | Search/filter toolbar | search, preferiti, filtri | Filtro | nessuna scrittura |
| Cerca lavoratori detail | `src/components/lavoratori/lavoratori-cerca-view.tsx` | Select | esperienze tipo lavoro, tipo rapporto, referenze, documenti, sesso, nazionalita, stato, provincia, disponibilita, accettabilita, spostamento | Lookup-backed | opzioni caricate via `lookupOptionsByDomain`; child normalizzati |
| Header lavoratore | `src/components/lavoratori/worker-profile-header.tsx` | Select inline | Motivazione | Lookup-backed | normalizzato key/label |
| Header lavoratore | `src/components/lavoratori/worker-profile-header.tsx` | Select inline | Stato | Lookup-backed | campo `stato_lavoratore` |
| Header lavoratore | `src/components/lavoratori/worker-profile-header.tsx` | Select inline | Disponibile | Lookup-backed | campo `disponibilita`; correlato al bug segnalato e gia coperto dal fix |
| Header lavoratore | `src/components/lavoratori/worker-profile-header.tsx` | Date input | Ritorno disponibilita | Data | non lookup |
| Header lavoratore edit | `src/components/lavoratori/worker-profile-header.tsx` | Text input | nome, cognome, email, telefono | Testo | patch worker |
| Header lavoratore edit | `src/components/lavoratori/worker-profile-header.tsx` | Textarea | descrizione pubblica | Testo | patch worker |
| Header lavoratore edit | `src/components/lavoratori/worker-profile-header.tsx` | Select | Sesso | Lookup-backed | normalizzato |
| Header lavoratore edit | `src/components/lavoratori/worker-profile-header.tsx` | Select | Nazionalita | Lookup-backed | normalizzato |
| Header lavoratore edit | `src/components/lavoratori/worker-profile-header.tsx` | Date input | Data di nascita | Data | non lookup |
| Availability card | `src/components/lavoratori/availability-status-card.tsx` | Select | Disponibilita | Lookup-backed | normalizzato key/label |
| Availability card | `src/components/lavoratori/availability-status-card.tsx` | Date input | Data ritorno disponibilita | Data | non lookup |
| Address card | `src/components/lavoratori/address-section-card.tsx` | Select/combobox | Provincia/comune | Lookup/entity | provincia usa label-valued address section |
| Documents card | `src/components/lavoratori/documents-card.tsx` | Select | Stato verifica documenti | Lookup-backed | display normalizzato |
| Documents card | `src/components/lavoratori/documents-card.tsx` | Select | Documenti in regola | Lookup-backed | display normalizzato |
| Documents card | `src/components/lavoratori/documents-card.tsx` | Input | scadenze/documenti | Testo/data | non lookup |
| Job search card | `src/components/lavoratori/job-search-card.tsx` | Radio | preferenze ricerca lavoro | Local/label-valued | non key-backed |
| Skills/competenze | `src/components/lavoratori/skills-competenze-card.tsx` | Select | competenze e livelli per dominio lookup | Lookup-backed | usare audit per nuovi domini |
| Skills matrix | `src/components/lavoratori/skills-choice-matrix.tsx` | Radio | scelte competenze | Local/label-valued | non key-backed |
| Experience/references | `src/components/lavoratori/experience-references-card.tsx` | Combobox/select | tipo lavoro, tipo rapporto, referenze verificate | Lookup-backed/entity | da testare su record clone/staging, perche molti blur salvano |
| Shift preferences | `src/components/lavoratori/worker-shift-preferences-fields.tsx` | Combobox | preferenze orarie/giorni | Lookup/local multivalue | chips/combobox |
| Gate 1 toolbar | `src/components/lavoratori/gate1-view.tsx` | Select | Provincia, Follow-up | Lookup-backed filtro | osservati disabilitati se dati/opzioni assenti |
| Gate 1 card/detail | `src/components/lavoratori/gate1-view.tsx` | Radio/select | idoneita, documenti, referenze, disponibilita, provincia, sesso, follow-up, stato verifica | Lookup-backed/local | fix applicato su select/radio key/label |
| Gate 1 card/detail | `src/components/lavoratori/gate1-view.tsx` | Textarea/input | note, date follow-up, contatti, anagrafica | Testo/data | non lookup |
| Gate 2 toolbar | `src/components/lavoratori/gate2-view.tsx` | Select | Stato Gate 2, Provincia | Lookup-backed filtro/local | non scrive senza edit record |

## Prove, colloqui, customer support

| Area | Componente | Controllo | Campo/label | Tipo | Note rischio |
| --- | --- | --- | --- | --- | --- |
| Prove e colloqui sheet | `src/components/prove-colloqui/prove-colloqui-view.tsx` | Select | Stato CS Prova | Lookup-backed | campo `prova_stato_cs` |
| Prove e colloqui sheet | `src/components/prove-colloqui/prove-colloqui-view.tsx` | Textarea | Priorita famiglia | Testo | patch rapporto |
| Prove e colloqui sheet | `src/components/prove-colloqui/prove-colloqui-view.tsx` | Select | Feedback Famiglia | Lookup-backed | campo `prova_feedback_famiglia` |
| Prove e colloqui sheet | `src/components/prove-colloqui/prove-colloqui-view.tsx` | Select | Feedback Lavoratore | Lookup-backed | campo `prova_feedback_lavoratore` |
| Prove e colloqui sheet | `src/components/prove-colloqui/prove-colloqui-view.tsx` | Select | Ramificazione D2 | Lookup-backed | campo `prova_ramo_d2` |
| Prove e colloqui sheet | `src/components/prove-colloqui/prove-colloqui-view.tsx` | Select | Tipo incontro famiglia/lavoratore | Lookup-backed | campo `tipo_incontro_famiglia_lavoratore` |
| Prove e colloqui sheet | `src/components/prove-colloqui/prove-colloqui-view.tsx` | Checkbox chip | check D0/D1/D2 | Boolean/local | non lookup key/label |
| Ticket create | `src/components/support/support-ticket-create-dialog.tsx` | Radio | tipo ticket | Enum/local | non lookup_values |
| Ticket create | `src/components/support/support-ticket-create-dialog.tsx` | Select | rapporto collegato | Entity select | id rapporto, non lookup |
| Ticket create | `src/components/support/support-ticket-create-dialog.tsx` | Select | tag | Enum/local | `SupportTicketTag` |
| Ticket create | `src/components/support/support-ticket-create-dialog.tsx` | Radio | priorita/stato iniziale | Enum/local | non lookup_values |
| Ticket create | `src/components/support/support-ticket-create-dialog.tsx` | Textarea | descrizione | Testo | crea ticket, non usare su prod |
| Ticket detail | `src/components/support/support-ticket-detail-sheet.tsx` | Select | rapporto collegato | Entity select | id rapporto |
| Ticket detail | `src/components/support/support-ticket-detail-sheet.tsx` | Select | stage ticket | Enum/local | sposta ticket |
| Ticket detail | `src/components/support/support-ticket-detail-sheet.tsx` | Select | altri campi ticket | Enum/local | non lookup_values salvo nuove integrazioni |
| Ticket views | `src/components/support/support-tickets-view.tsx` | Select | Tutti gli stati | Enum/local | filtro |

## Gestione contrattuale

| Area | Componente | Controllo | Campo/label | Tipo | Note rischio |
| --- | --- | --- | --- | --- | --- |
| Rapporti list | `src/components/gestione-contrattuale/rapporti-list-panel.tsx` | Select | Stato rapporto | Enum/lookup-like filtro | lista rapporti |
| Rapporto detail | `src/components/gestione-contrattuale/rapporto-detail-panel.tsx` | Select | tipo/stato rapporto e campi contratto | Lookup-backed/local | dettaglio rapporto, da verificare con audit se nuovi campi |
| Rapporto detail | `src/components/gestione-contrattuale/rapporto-detail-panel.tsx` | Input | Distribuzione ore settimanali | Testo | campo `distribuzione_ore_settimana`; parte da domenica |
| Rapporto detail | `src/components/gestione-contrattuale/rapporto-detail-panel.tsx` | Number input | Ore di lavoro a settimana | Numero | campo `ore_a_settimana`; autosave contratto |
| Assunzioni sheet | `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx` | Select | Stato assunzione | Lookup-backed | campo `stato_assunzione`; normalizzato |
| Assunzioni sheet | `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx` | Select | Tipologia contratto | Enum/local | `TIPO_CONTRATTO_OPTIONS` |
| Assunzioni sheet | `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx` | Select | Tipo rapporto | Lookup-backed | campo `tipo_rapporto`; bug originale, normalizzato |
| Assunzioni sheet | `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx` | Date/input | data assunzione, ID rapporto INPS, codici WebColf, fee | Testo/data/numero | non lookup |
| Assunzioni sheet | `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx` | Select | Sconto applicato | Lookup-backed | campo `offerta`; normalizzato |
| Assunzioni sheet | `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx` | Number/input | Totale ore lavorative, distribuzione ore settimanali, ore lunedi-sabato | Testo/numero | salva su `rapporti_lavorativi` e `assunzioni`; non lookup |
| Assunzioni sheet | `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx` | Radio | sezioni yes/no | Boolean/local | non lookup |
| Chiusure board | `src/components/gestione-contrattuale/chiusure-board-view.tsx` | Select | stage chiusura | Enum/local/board stage | sposta card, non testare su prod |
| Chiusure board | `src/components/gestione-contrattuale/chiusure-board-view.tsx` | Input/textarea | note, date, dati pratica | Testo/data | blur/change puo salvare |
| Variazioni board | `src/components/gestione-contrattuale/variazioni-board-view.tsx` | Select | stage/valori variazione | Enum/local | sposta card, non testare su prod |
| Variazioni board | `src/components/gestione-contrattuale/variazioni-board-view.tsx` | Input/textarea | dati variazione, note | Testo/data/numero | blur/change puo salvare |
| Variazioni sheet | `src/hooks/use-variazioni-board.ts` | Display | Dati lavoratore > Indirizzo residenza | `indirizzi` | read-only; preferisce `residenza`, poi `domicilio`, poi primo indirizzo |
| Variazioni sheet | `src/components/gestione-contrattuale/variazioni-board-view.tsx` | Display | Dati rapporto lavorativo > Indirizzo | Rimosso | non aveva fonte DB ed era vuoto |
| Riattivazioni board | `src/components/gestione-contrattuale/riattivazioni-board-view.tsx` | Select | stage riattivazione | Enum/local/board stage | sposta card, non testare su prod |
| Riattivazioni board | `src/components/gestione-contrattuale/riattivazioni-board-view.tsx` | Input/select | campi riattivazione | Testo/enum | blur/change puo salvare |

## Payroll

| Area | Componente | Controllo | Campo/label | Tipo | Note rischio |
| --- | --- | --- | --- | --- | --- |
| Cedolini | `src/components/payroll/payroll-overview-view.tsx` | Select | mese/stato/filtri e campi giornata presenza | Enum/local | presence day selects sono hardcoded, non `lookup_values` |
| Cedolini | `src/components/payroll/payroll-overview-view.tsx` | Input/textarea | importi, note, ore/giorni | Testo/numero | non lookup |
| Contributi INPS | `src/components/payroll/contributi-inps-view.tsx` | Select | Tutti gli stati / stage contributo | Enum/local | filtro e stage pratica |
| Contributi INPS | `src/components/payroll/contributi-inps-view.tsx` | Input | importi, date, codici | Testo/data/numero | non lookup |

## Anagrafiche e data table generiche

| Area | Componente | Controllo | Campo/label | Tipo | Note rischio |
| --- | --- | --- | --- | --- | --- |
| Data table toolbar | `src/components/data-table/data-table-toolbar.tsx` | Select | campo gruppo/filtro | Enum/multi_enum aware | filtro, non editing lookup |
| Data table filter builder | `src/components/data-table/data-table-filter-builder.tsx` | Select/combobox/input | filtri `enum`, `multi_enum`, text, date | Enum/multi_enum aware | query builder espande alias key/label |
| Anagrafiche tables | `src/components/anagrafiche/anagrafiche-tables-view.tsx` | Select | raggruppamento/filtro | Enum/multi_enum aware | non editing lookup |
| Anagrafiche query builder | `src/components/anagrafiche/anagrafiche-query-builder.tsx` | Select/combobox/input | operatori e valori enum/multi_enum | Enum/multi_enum aware | query builder, non persistenza record |
| AG Grid | `src/components/anagrafiche/anagrafiche-ag-grid.tsx` | Input/filter | ricerca tabellare | Testo/filtro | non lookup persistence |

## Punti da non testare su produzione con click

- Qualsiasi `Select` dentro detail sheet/card con `onValueChange` diretto: spesso salva subito.
- Checkbox chip contestuali CRM: `Tentativi di chiamata` salva al click.
- Board stage select: sposta pratiche/card.
- Input con `onBlur`: anche solo entrare nel campo e uscire dopo modifica salva.
- Textarea operative: spesso salvano su blur.

## Copertura tecnica gia presente

- Audit automatico: `npm run audit:lookup`.
- Build: `npm run build`.
- Il fix scelto mantiene il DB/API canonico su label, mentre il FE normalizza il valore visualizzato verso key e salva label.
- Lo script audit fallisce se compare un nuovo pattern lookup rischioso non recensito.

## Gap residuo

Questa mappa non sostituisce un test E2E di salvataggio perche l'ambiente usa dati di produzione. Per test automatici senza rischio serve una delle seguenti condizioni:

- ambiente staging con copia dati anonima;
- fixture record dedicati e cancellabili;
- mock API/service worker che intercetta `update-record`;
- test solo DOM con network write bloccate.
