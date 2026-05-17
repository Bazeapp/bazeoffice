# BazeOffice Issue Backlog From `ISSUES (1).docx`

Fonte originale: `/Users/danielenebbiai/Downloads/ISSUES (1).docx`

Scopo: trasformare il documento in una task list lavorabile senza perdere il riferimento agli ID, alle descrizioni e alle correlazioni originali. Ogni task mantiene l'ID del documento come chiave primaria.

Legenda priorità:
- `P0` blocca un flusso operativo core o rischia perdita/invisibilità dati.
- `P1` impatto alto su operatività, dati o produttività, ma con workaround.
- `P2` UX o completezza funzionale importante.
- `P3` polish, rinomina o miglioramento minore.

## Epic 1 - Fondamenta dati, filtri e lookup globali

- [ ] `P0` `G-006` Sistemare elenco recruiter nei dropdown globali.
  - Documento: `[G-006]`, sezione `Globali`, blocker.
  - Problema: i dropdown "assegna recruiter" mostrano solo Nicolo, Daniele e Davide; i recruiter reali non sono selezionabili.
  - Da verificare: dati `operatori` con `ruolo` recruiter e `attivo = true`; query frontend dei dropdown recruiter.
  - File probabili: `src/hooks/use-operatori-options.ts`, `src/components/crm/*`, `src/components/ricerca/*`.
  - Dipendenze/correlazioni: `G-007`, `RIC-047`, `RIC-048`, `ASS-009`, issue pre-release `G-001`, `ASS-001`, `ASS-008`, `GT1-012`.

- [ ] `P0` `G-007` Ripristinare collegamenti recruiter-ricerca e filtro recruiter nella pagina Ricerche.
  - Documento: `[G-007]`, sezione `Globali`, blocker.
  - Problema: ricerche storiche mostrano recruiter vuoto o "Sconosciuto"; manca o non funziona il filtro per recruiter.
  - Da verificare: migrazione legami Airtable, campo recruiter su ricerca/processo, lookup operatori.
  - File probabili: `src/hooks/use-ricerca-board.ts`, `src/components/ricerca/ricerca-board-view.tsx`, `src/components/ricerca/ricerca-detail-view.tsx`.
  - Dipendenze/correlazioni: `G-006`, `RIC-047`, `RIC-048`.

- [ ] `P0` `G-011` Correggere la logica "ricerche coinvolte" del lavoratore.
  - Documento: `[G-011]`, sezione `Globali`, blocker.
  - Problema: vengono mostrate come attive anche ricerche/match churnati con `stato_situazione_lavorativa = Non attivo`.
  - Da verificare: filtro applicato nei pallini, nella scheda lavoratore e nella colonna destra del detail candidatura.
  - File probabili: `src/components/lavoratori/job-search-card.tsx`, `src/components/lavoratori/worker-detail-composite.tsx`, `src/components/ricerca/*`, `src/hooks/use-lavoratori-data.ts`.
  - Dipendenze/correlazioni: `RIC-045`, `LAV-021`.

- [ ] `P1` `G-004` Correggere filtri AG Grid su campi enum/select nelle pagine Anagrafiche.
  - Documento: `[G-004]`, sezione `Globali`, high.
  - Problema: filtri enum/select restituiscono sempre 0 risultati, mentre numerici/testuali funzionano.
  - Da verificare: mapping label/value, type coercion, encoding, operatori `is`, `is not`, `in`, `not in`.
  - File probabili: `src/components/anagrafiche/anagrafiche-query-builder.tsx`, `src/components/anagrafiche/anagrafiche-query-utils.ts`, `src/components/anagrafiche/anagrafiche-ag-grid.tsx`, `src/lib/anagrafiche-api.ts`.
  - Dipendenze/correlazioni: `G-008`, tutti gli issue `ANA-*` impliciti nel documento.

- [ ] `P1` `G-008` Correggere filtri enum con valori contenenti virgola.
  - Documento: `[G-008]`, sezione `Globali`, high.
  - Problema: valori enum come `selezione inviata, in attesa di feedback` vengono splittati come multi-valore e non matchano.
  - Da verificare: serializzazione dei valori filtro, separatori per `in/not in`, parsing nel query builder.
  - File probabili: `src/components/anagrafiche/anagrafiche-query-utils.ts`, `src/components/data-table/data-table-filter-builder.tsx`.
  - Dipendenze/correlazioni: `G-004`.

- [ ] `P1` `G-010` Riparare campi vuoti nel detail lavoratore in Gate 1 e Gate 2.
  - Documento: `[G-010]`, sezione `Globali`, blocker.
  - Problema: Gate 1/2 mostrano vuoti campi popolati a DB e visibili in Lavoratori: indirizzo, sesso, livello italiano, documenti autocertificazione, referenze verificabili.
  - Da verificare: shape RPC `gate1_lavoratori` / `gate2_lavoratori`, mapping verso detail component.
  - File probabili: `src/components/lavoratori/gate1-view.tsx`, `src/components/lavoratori/gate2-view.tsx`, `src/lib/anagrafiche-api.ts`, `src/components/lavoratori/worker-detail-*`.

- [ ] `P2` `G-005` Tipizzare correttamente i campi data nel filter builder.
  - Documento: `[G-005]`, sezione `Globali`, medium.
  - Problema: alcuni campi data appaiono come testo, con operatori testuali invece di date picker/operatori temporali.
  - Esempi doc: `data_assegnazione`, `data_limite_invio_selezione`, `data_per_ricerca_futura`, `deadline_mobile`.
  - Da verificare: tipi DB vs column definition frontend.
  - File probabili: `src/components/data-table/*`, `src/components/anagrafiche/*`, `src/hooks/use-table-query-state.ts`.

- [ ] `P2` `G-009` Sbloccare stato "salvataggio automatico" quando un modale detail viene chiuso in edit mode.
  - Documento: `[G-009]`, sezione `Globali`, medium.
  - Problema: chiudere il modale con matita attiva lascia lo stato auto-save bloccato e può interferire con update successivi.
  - Da verificare: pattern comune detail/edit/auto-save.
  - File probabili: `src/components/shared-next/record-detail-shell.tsx`, `src/components/shared-next/detail-section-card.tsx`, detail CRM/Ricerca/Lavoratori.

## Epic 2 - Assegnazione e pipeline Ricerche

- [ ] `P0` `ASS-009` Risolvere definitivamente la riapertura Assegnazione: tutte le ricerche `stato_res = da assegnare` devono essere visibili.
  - Documento: `[ASS-009]`, `[ASS-009] [RIAPERTURA]`, `[ASS-009 - RIAPERTURA #2]`, sezione `Pagina Assegnazione`, blocker.
  - Problema: discrepanze tra numero ricerche reali, colonna "Da assegnare" e calendario; alcune ricerche spariscono al refresh.
  - Da verificare: query board, stati legacy, filtro recruiter, mapping `stato_res`, condizioni di esclusione silenziose.
  - File probabili: `src/hooks/use-crm-assegnazione.ts`, `src/components/crm/crm-assegnazione-view.tsx`, `src/lib/anagrafiche-api.ts`.
  - Nota: trattare le tre voci del doc come un'unica task con regression test dati.

- [ ] `P1` `ASS-011` Popolare il campo "Luogo" in Assegnazione dal quartiere/luogo Sales Pipeline.
  - Documento: `[ASS-011]`, high.
  - Problema: campo sempre vuoto `-`, impedisce smistamento per zona.
  - File probabili: `src/hooks/use-crm-assegnazione.ts`, `src/components/crm/crm-assegnazione-view.tsx`, `src/lib/anagrafiche-api.ts`.

- [ ] `P3` `ASS-010` Aggiungere email lead nel detail panel Assegnazione.
  - Documento: `[ASS-010]`, low.
  - Problema: identificazione/comunicazione team più lenta.
  - File probabili: `src/components/crm/crm-assegnazione-view.tsx`.

- [ ] `P0` `RIC-055` Allineare stati e colonne della kanban Ricerche attive.
  - Documento: `[RIC-055]`, sezione `Pagina Ricerche`, blocker.
  - Problema: mancano colonne per `in preparazione per invio` e `inviare selezione`; dropdown stato contiene valori legacy da rimuovere.
  - File probabili: `src/components/ricerca/ricerca-board-view.tsx`, `src/components/ricerca/ricerca-active-search-card.tsx`, `src/hooks/use-ricerca-board.ts`, `src/types/entities/processi-matching.ts`.

- [ ] `P1` `RIC-056` Rendere editabile la colonna sinistra del detail Ricerca.
  - Documento: `[RIC-056]`, high.
  - Problema: non si possono modificare campi operativi quando una ricerca deve ripartire: deadline, orari, luogo, famiglia, mansioni, richieste, tempistiche, recruiter.
  - File probabili: `src/components/ricerca/ricerca-detail-view.tsx`, `src/components/ricerca/ricerca-family-summary-card.tsx`.

- [ ] `P1` `RIC-053` Propagare CAP e indirizzo Sales Pipeline al detail Ricerca.
  - Documento: `[RIC-053]`, high.
  - Problema: recruiter vede indirizzo legacy/errato, con impatto su calcolo distanza.
  - Da verificare: sorgente dati luogo lavoro tra CRM e Ricerca.
  - File probabili: `src/components/crm/*`, `src/components/ricerca/*`, `src/lib/anagrafiche-api.ts`.

- [ ] `P1` `RIC-057` Mostrare/modificare "Indirizzo di prenotazione prova/colloquio" nel detail Ricerca.
  - Documento: `[RIC-057]`, high.
  - Problema: indirizzo schedulazione famiglia distinto dall'indirizzo iniziale sales non è visibile.
  - File probabili: `src/components/ricerca/ricerca-detail-view.tsx`, `src/components/ricerca/ricerca-family-summary-card.tsx`.

- [x] `P1` `RIC-058` Aggiungere stati mancanti nella Scheda Colloquio.
  - Documento: `[RIC-058]`, high.
  - Stati mancanti: `Colloquio rimandato`, `Prova schedulata`, `Prova rimandata`.
  - File probabili: `src/components/ricerca/scheda-colloquio-panel.tsx`, lookup/enums.
  - Fix: migration Supabase `add_missing_selection_status_lookup_values` su `lookup_values` (`lavoratori.stato_selezione`).
  - Verifica DB: i tre stati sono presenti, attivi e ordinati tra `Colloquio schedulato` e `Prova in corso`.

- [ ] `P1` `RIC-061` Migliorare ricerca lavoratore nel modale "Aggiungi lavoratore".
  - Documento: `[RIC-061]`, high.
  - Problema: cercando solo per nome di battesimo non trova match; funziona con cognome o email.
  - File probabili: `src/components/ricerca/ricerca-workers-pipeline-view.tsx`, `src/hooks/use-ricerca-workers-pipeline.ts`, `src/lib/search-utils.ts`.

- [ ] `P1` `RIC-062` Mostrare campo "Link videocall" quando modalità colloquio = Videocolloquio.
  - Documento: `[RIC-062]`, high.
  - Problema: campo backend esistente non renderizzato condizionalmente in UI.
  - File probabili: `src/components/ricerca/scheda-colloquio-panel.tsx`.

- [ ] `P1` `RIC-045` Ripristinare pallino "altre selezioni attive" sulle card lavoratore in kanban Ricerca.
  - Documento: `[RIC-045]`, high.
  - Problema: dato esiste ed è visibile altrove, ma non sulle card nella kanban.
  - File probabili: `src/components/ricerca/worker-pipeline-summary-cards.tsx`, `src/components/ricerca/selection-details-card.tsx`.
  - Dipendenze/correlazioni: `G-011`.

- [ ] `P1` `RIC-047` Mostrare recruiter nel detail della singola ricerca.
  - Documento: `[RIC-047]`, high.
  - Problema: non è visibile chi sta seguendo la ricerca.
  - File probabili: `src/components/ricerca/ricerca-detail-view.tsx`.
  - Dipendenze/correlazioni: `G-006`, `G-007`, `RIC-048`.

- [ ] `P2` `RIC-048` Mostrare recruiter assegnato sulle card kanban Ricerche.
  - Documento: `[RIC-048]`, medium.
  - File probabili: `src/components/ricerca/ricerca-active-search-card.tsx`.
  - Dipendenze/correlazioni: `RIC-047`.

- [ ] `P2` `RIC-046` Aggiornare counter colonne kanban in base ai filtri applicati.
  - Documento: `[RIC-046]`, low.
  - Problema: counter mostrano il totale non filtrato.
  - File probabili: `src/components/ricerca/ricerca-board-view.tsx`, `src/hooks/use-ricerca-board.ts`.

- [ ] `P2` `RIC-049` Impedire duplicati nel multi-select "Tipo Lavoro" del detail lavoratore.
  - Documento: `[RIC-049]`, medium.
  - File probabili: `src/components/lavoratori/skills-choice-matrix.tsx`, `src/components/ricerca/*`.

- [ ] `P2` `RIC-050` Rendere modificabile "Riassunto esperienze AI" o non mostrarlo come input.
  - Documento: `[RIC-050]`, medium.
  - File probabili: `src/components/lavoratori/experience-references-card.tsx`, `src/components/lavoratori/worker-detail-composite.tsx`.

- [ ] `P1` `RIC-051` Correggere indirizzo vuoto nel popup "Riassunto profilo".
  - Documento: `[RIC-051]`, high.
  - Problema: indirizzo lavoratore a volte vuoto nonostante popolato su Airtable.
  - File probabili: `src/components/ricerca/*`, `src/components/lavoratori/address-section-card.tsx`.

- [ ] `P2` `RIC-052` Chiarire formato "Tempo di viaggio dichiarato".
  - Documento: `[RIC-052]`, medium.
  - Problema: stringa `60 min per 5 | 5g a settimana` sembra "5,5 giorni" invece di "5 ore x 1 giorno".
  - File probabili: `src/components/ricerca/selection-details-card.tsx`, `src/components/ricerca/ricerca-workers-map-view.tsx`.

- [ ] `P2` `RIC-054` Aggiungere campo derivato "Avviso" su card e header detail Ricerca.
  - Documento: `[RIC-054]`, medium.
  - Problema: manca stato + countdown deadline, calcolato frontend da `stato_res` e date evento.
  - File probabili: `src/components/ricerca/ricerca-active-search-card.tsx`, `src/components/ricerca/ricerca-detail-view.tsx`.

- [ ] `P2` `RIC-059` Spostare "Colloquio famiglia lavoratore" in cima alla scheda colloquio.
  - Documento: `[RIC-059]`, medium.
  - File probabili: `src/components/ricerca/scheda-colloquio-panel.tsx`.

- [ ] `P2` `RIC-060` Aggiungere select "Modalità colloquio".
  - Documento: `[RIC-060]`, medium.
  - Opzioni: `In presenza`, `Videocolloquio`.
  - File probabili: `src/components/ricerca/scheda-colloquio-panel.tsx`.
  - Dipendenze/correlazioni: `RIC-062`.

## Epic 3 - CRM / Sales Pipeline famiglie

- [ ] `P0` `CRM-018` Correggere conteggi drasticamente inferiori ad Airtable nella Sales Pipeline.
  - Documento: `[CRM-018]`, blocker.
  - Problema: DB corretto, frontend mostra conteggi molto inferiori.
  - File probabili: `src/hooks/use-crm-pipeline-preview.ts`, `src/components/crm/crm-pipeline-famiglie-view.tsx`, `src/lib/anagrafiche-api.ts`.

- [ ] `P0` `CRM-020` Rendere cliccabili i tag motivazione nel detail OUT OF TARGET.
  - Documento: `[CRM-020]`, blocker.
  - Problema: impossibile registrare ragione out-of-target.
  - File probabili: `src/components/crm/famiglia-processo-detail-content.tsx`, `src/components/crm/cards/stato-lead-card.tsx`.

- [ ] `P0` `CRM-029` Audit e fix persistenza di tutti i "campi nuovi" del modale detail Sales Pipeline.
  - Documento: `[CRM-029]`, blocker.
  - Problema: l'utente scrive, ricarica, dati spariscono.
  - Da fare: audit completo campi nuovi, payload patch, RPC/update, mapping response.
  - File probabili: `src/components/crm/famiglia-processo-detail-content.tsx`, `src/hooks/use-crm-pipeline-preview.ts`, `src/lib/anagrafiche-api.ts`.

- [ ] `P1` `CRM-019` Aggiungere colonna "WON - In attesa di conferma".
  - Documento: `[CRM-019]`, high.
  - File probabili: `src/components/crm/crm-pipeline-famiglie-view.tsx`, lookup stati pipeline.

- [ ] `P1` `CRM-022` Popolare CAP nel detail Sales Pipeline per famiglie recenti.
  - Documento: `[CRM-022]`, high.
  - Problema: CAP compilato in iscrizione ma vuoto nel detail.
  - File probabili: `src/components/crm/famiglia-processo-detail-content.tsx`, `src/lib/anagrafiche-api.ts`.

- [ ] `P1` `CRM-023` Aggiungere bottone "Copia link preventivo" sulla card Sales Pipeline.
  - Documento: `[CRM-023]`, high.
  - File probabili: `src/components/crm/famiglia-processo-card.tsx`, `src/components/crm/crm-pipeline-famiglie-view.tsx`.

- [ ] `P1` `CRM-024` Rendere editabili contatti famiglia nel detail Sales Pipeline.
  - Documento: `[CRM-024]`, high.
  - Campi: email, telefono, nome referente.
  - File probabili: `src/components/crm/famiglia-processo-detail-content.tsx`.

- [ ] `P1` `CRM-027` Rendere multi-select il campo "Tipo lavoro" nel detail Sales Pipeline.
  - Documento: `[CRM-027]`, high.
  - Problema: UI single select su campo multi-valore.
  - File probabili: `src/components/crm/famiglia-processo-detail-content.tsx`.

- [ ] `P2` `CRM-021` Mostrare "Creata il" sulle card Sales Pipeline.
  - Documento: `[CRM-021]`, medium.
  - Problema: sempre `Creata il -` anche con data DB popolata.
  - File probabili: `src/components/crm/famiglia-processo-card.tsx`.

- [ ] `P2` `CRM-028` Mostrare tentativi no-response nella colonna "HOT - No-show".
  - Documento: `[CRM-028]`, medium.
  - File probabili: `src/components/crm/famiglia-processo-card.tsx`.

- [ ] `P3` `CRM-026` Sistemare input numerici eta min/max e default.
  - Documento: `[CRM-026]`, low.
  - Problema: input forza 20 o 80 e non consente intermedi; default attesi 24 e 60.
  - File probabili: `src/components/crm/famiglia-processo-detail-content.tsx`.

## Epic 4 - Assunzioni e dati contrattuali

- [ ] `P0` `ASN-010` Risolvere riapertura collegamenti dati datore/lavoratore nelle card Assunzioni.
  - Documento: `[ASN-010]` + `[ASN-010] [RIAPERTURA]`, blocker.
  - Problema: card in "In attesa di dati lavoratore" e "Dati pronti per assunzione" mostrano dati non collegati nonostante compilazione Airtable/fix precedente.
  - File probabili: `src/hooks/use-assunzioni-board.ts`, `src/components/gestione-contrattuale/assunzioni-board-view.tsx`, `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx`.

- [x] `P0` `ASN-011` Mostrare tutti gli allegati caricati dal datore.
  - Documento: `[ASN-011]`, blocker.
  - Problema: se vengono caricati piu file, nel detail Assunzione ne appare solo uno.
  - File probabili: `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx`, `src/lib/attachments.ts`.
  - Fix: `AttachmentUploadSlot` mostra la lista completa dei file multipli anche in sola lettura; il detail Assunzione ora aggrega fronte/retro e permesso/ricevuta invece di prendere solo il primo allegato.
  - Verifica DB: trovati record `assunzioni` con array multipli su documento identita, codice fiscale, permesso e ricevuta.
  - Verifica tecnica: `npm run build` completato con successo.

- [ ] `P0` `ASN-012` Popolare distribuzione ore settimanali nel detail Assunzione.
  - Documento: `[ASN-012]`, blocker.
  - Campi: ore lun/mar/mer/gio/ven/sab + giorno di riposo.
  - File probabili: `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx`, `src/hooks/use-assunzioni-board.ts`.

- [x] `P0` `ASN-013` Correggere enum "Tipologia contratto".
  - Documento: `[ASN-013]`, blocker.
  - Atteso: `A`, `B`, `BS`, `C`, `CS`, `D`, `DS`; attuale: `A`, `B`, `C`, `I`.
  - File probabili: `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx`, lookup valori.
  - Fix: aggiornate le opzioni hardcoded in Assunzioni e nello stesso select duplicato in Variazioni.
  - Fix dati: migration Supabase `add_tipo_contratto_lookup_values` su `lookup_values` (`rapporti_lavorativi.tipo_contratto`).
  - Verifica DB: `rapporti_lavorativi.tipo_contratto` usa gia valori reali `B`, `BS`, `CS`, `DS`, `C`; lookup attivo creato per `A`, `B`, `BS`, `C`, `CS`, `D`, `DS`.
  - Verifica tecnica: `npm run build` completato con successo.

- [ ] `P0` `ASN-015` Salvare/leggere "Ore di lavoro a settimana" dal flow form assunzione famiglie.
  - Documento: `[ASN-015]`, blocker.
  - Problema: campo editabile ma sempre vuoto dal form, vanifica la compilazione.
  - File probabili: `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx`, `src/hooks/use-assunzioni-board.ts`.

- [ ] `P0` `ASN-017` Aggiungere collegamento manuale dati assunzione datore/lavoratore.
  - Documento: `[ASN-017]`, blocker.
  - Problema: se il pairing automatico via email fallisce, record resta spaiato senza rimedio UI.
  - File probabili: `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx`.

- [ ] `P0` `ASN-018` Aggiungere bottoni form assunzione datore/lavoratore nell'header Assunzioni.
  - Documento: `[ASN-018]`, blocker.
  - Problema: operatore non puo aprire/condividere moduli.
  - File probabili: `src/components/gestione-contrattuale/assunzioni-board-view.tsx`.
  - Stato: pulsanti aggiunti in header Assunzioni, disabilitati finche non vengono configurati gli URL canonici.

- [ ] `P1` `ASN-014` Riallineare "Tipologia rapporto" alle esigenze CCNL Domestico.
  - Documento: `[ASN-014]`, high.
  - Problema: campo separato dalla tipologia contratto ma con valori non standard/coerenti.
  - File probabili: `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx`, lookup valori.

- [ ] `P2` `ASN-016` Aggiungere loading state alla sezione "Documenti del rapporto".
  - Documento: `[ASN-016]`, medium.
  - Problema: allegati appaiono con circa 4s di latenza e sembrano mancanti.
  - File probabili: `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx`, `src/components/ui/skeleton.tsx`.

## Epic 5 - Lavoratori, Gate e dati amministrativi

- [ ] `P0` `LAV-020` Ripristinare campo IBAN in "Dati amministrativi" lavoratore.
  - Documento: `[LAV-020]`, blocker.
  - Problema: IBAN vuoto per tutti i lavoratori anche con account Stripe attivo; dato non migrato/collegato.
  - File probabili: `src/components/lavoratori/documents-card.tsx`, `src/lib/stripe-connect-api.ts`, `src/components/lavoratori/worker-detail-composite.tsx`.

- [ ] `P2` `LAV-021` Spostare "Ricerche coinvolte" subito sotto header detail lavoratore.
  - Documento: `[LAV-021]`, medium.
  - File probabili: `src/components/lavoratori/worker-detail-composite.tsx`, `src/components/lavoratori/job-search-card.tsx`.
  - Dipendenze/correlazioni: `G-011`.

- [ ] `P2` `GT2-014` Rimuovere duplicazione "Dati amministrativi" in Gate 2.
  - Documento: `[GT2-014]`, sezione `Pagine Gate`.
  - Problema: sezione IBAN + ID account Stripe duplicata; tenere solo quella sotto "Verifica anagrafica".
  - File probabili: `src/components/lavoratori/gate2-view.tsx`, `src/components/lavoratori/worker-detail-composite.tsx`.

## Epic 6 - Prove, colloqui e customer support

- [ ] `P0` `PRV-002` Riparare single select D1 Feedback.
  - Documento: `[PRV-002]`, blocker.
  - Problema: valori storici migrati non mostrati e dropdown vuoto eccetto "Nessuna selezione".
  - File probabili: `src/components/prove-colloqui/prove-colloqui-view.tsx`, `src/hooks/use-prove-colloqui-data.ts`.

- [ ] `P1` `PRV-001` Aggiungere upload registrazioni chiamate nel detail Monitoraggio rapporti in prova.
  - Documento: `[PRV-001]`, high.
  - Problema: funzionalita Airtable non migrata per lavoratore e famiglia.
  - File probabili: `src/components/prove-colloqui/prove-colloqui-view.tsx`, `src/components/shared-next/attachment-upload-slot.tsx`.

- [ ] `P2` `PRV-003` Mostrare data check-in sulle card "Check-in programmato".
  - Documento: `[PRV-003]`, medium.
  - File probabili: `src/components/prove-colloqui/prove-colloqui-view.tsx`.

- [ ] `P1` `TKT-003` Aggiungere card chiusura collegata cliccabile nel detail ticket.
  - Documento: `[TKT-003]`, high.
  - Problema: impossibile eseguire flow di risoluzione del ticket di chiusura.
  - File probabili: `src/components/support/support-ticket-detail-sheet.tsx`, `src/hooks/use-support-tickets-board.ts`.

- [ ] `P2` `TKT-004` Rendere leggibile titolo lungo ticket.
  - Documento: `[TKT-004]`, medium.
  - Problema: header tronca il titolo; serve fallback in "Categoria e urgenza".
  - File probabili: `src/components/support/support-ticket-detail-sheet.tsx`.

- [ ] `P3` `TKT-002` Rinominare menu "Ticket colloqui" in "Ticket customer".
  - Documento: `[TKT-002]`, low.
  - File probabili: `src/components/layout/app-sidebar.tsx`, `src/routes/app-routes.ts`.

- [ ] `P3` `REA-001` Aggiungere filtro "data di fine rapporto" in Riattivazioni.
  - Documento: `[REA-001]`, low.
  - File probabili: `src/components/gestione-contrattuale/riattivazioni-board-view.tsx`, `src/hooks/use-riattivazioni-board.ts`.

## Epic 7 - Rapporti lavorativi

- [ ] `P1` `RAP-019` Ottimizzare ricerca testuale Rapporti lavorativi.
  - Documento: `[RAP-019]`, high.
  - Problema: circa 40s per lista filtrata + 22s detail, totale circa 60s.
  - File probabili: `src/components/gestione-contrattuale/rapporti-lavorativi-view.tsx`, `src/components/gestione-contrattuale/rapporti-list-panel.tsx`, `src/hooks/use-rapporti-lavorativi-data.ts`, `src/lib/anagrafiche-api.ts`.

- [ ] `P2` `RAP-018` Correggere bottone "Apri URL origine" in Preventivo collegato.
  - Documento: `[RAP-018]`, medium.
  - Problema: link porta a 404.
  - File probabili: `src/components/gestione-contrattuale/rapporto-detail-panel.tsx`.

## Ordine consigliato di lavorazione

1. `P0` dati/lookup che sbloccano piu flussi: `G-006`, `G-007`, `ASS-009`, `G-011`.
2. `P0` perdita o invisibilita dati su Assunzioni: `ASN-010`, `ASN-011`, `ASN-012`, `ASN-015`, `ASN-017`, `ASN-018`.
3. `P0/P1` pipeline core: `CRM-018`, `CRM-020`, `CRM-029`, `RIC-055`, `RIC-056`.
4. `P1` filtri globali e ricerca: `G-004`, `G-008`, `RAP-019`.
5. `P1/P2` completamento UI operativa: recruiter visibili, indirizzi, link videocall, stati colloquio, allegati, loading state.

## Checklist di verifica da riusare

- [ ] Ogni fix dati deve avere query di audit prima/dopo, con conteggi record affetti.
- [ ] Ogni fix su dropdown/enum deve verificare sia valori storici migrati sia nuovi salvataggi.
- [ ] Ogni fix su detail deve verificare apertura, modifica, salvataggio, refresh pagina e riapertura record.
- [ ] Ogni fix kanban deve verificare conteggi, card visibili, filtri applicati e refresh.
- [ ] Ogni fix allegati deve verificare 0, 1 e piu file.
- [ ] Ogni fix cross-page deve verificare almeno le pagine citate nel documento originale.
