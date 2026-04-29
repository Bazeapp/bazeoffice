# Roadmap

## Criteri

- **P0:** blocker operativo, impedisce di completare un flusso core.
- **P1:** bug o mancanza ad alto impatto operativo.
- **P2:** miglioramento importante o regressione non bloccante.
- **P3:** pulizia UX o coerenza secondaria.
- **Stato:** Backlog, salvo diversa indicazione.

## Sequenza Consigliata

1. **Stabilizzare i salvataggi nei detail panel:** `ASN-004`, poi verificare pattern comune con `CHI-003` e `VAR-002`.
2. **Sbloccare Assunzioni:** `ASN-005`, `ASN-006`, `ASN-001`, `ASN-003`, `ASN-007`.
3. **Pulire fonte dati e label rapporto:** `RAP-002`, `RAP-001`, `RAP-004`, `RAP-005`, `RAP-007`, con ricadute su `CED-001`.
4. **Completare flussi operativi mancanti:** `VAR-001`, `CHI-001`, `TKT-001`, `RAP-010`.
5. **Payroll/Cedolini:** `CED-001`, `CED-002`, `CED-004`, `CED-008`, poi i task UX collegati.

## Roadmap Per Area

### Rapporti Lavorativi

#### [RAP-002] Definire sorgente di verita di `stato_rapporto`

- **Priorita:** P1
- **Tag:** MISSING
- **Severity:** High
- **Effort:** L
- **Area:** `rapporti_lavorativi`, schema DB, logica derivazione frontend/backend
- **Obiettivo:** decidere se `stato_rapporto` vive come colonna persistita o come valore derivato, formalizzando regole per `In attivazione`, `Attivo`, `Terminato`, `Sconosciuto`.
- **Acceptance:** regola documentata, funzione/query centralizzata se derivata, distinzione chiara tra `stato_rapporto` e `stato_servizio`, conteggi rapporti attivi coerenti.
- **Dipendenze:** blocca `RAP-001`; decisione da prendere con team prodotto/tech.

#### [RAP-001] Correggere badge stato rapporto sempre "Sconosciuto"

- **Priorita:** P1
- **Tag:** BUG
- **Severity:** High
- **Effort:** S
- **Area:** Rapporti lavorativi, card lista e detail header
- **Obiettivo:** mostrare il vero stato del rapporto invece del fallback fisso "Sconosciuto".
- **Acceptance:** badge coerente su lista e detail; fallback usato solo quando lo stato e realmente indeterminabile.
- **Dipendenze:** richiede decisione `RAP-002`.

#### [RAP-003] Limitare editing caratteristiche rapporto ai codici WebColf

- **Priorita:** P1
- **Tag:** BUG
- **Severity:** High
- **Effort:** S
- **Area:** Detail rapporto, sezione "Caratteristiche del rapporto"
- **Obiettivo:** mantenere editabili solo `Cod. Rapporto WebColf` e `Cod. Lavoratore WebColf`; gli altri campi restano read-only perche richiedono variazione contrattuale.
- **Acceptance:** matita presente; in edit mode solo i due codici sono modificabili e persistono.

#### [RAP-004] Ripristinare linked record e contatti nei rapporti reali

- **Priorita:** P1
- **Tag:** BUG
- **Severity:** High
- **Effort:** M
- **Area:** Detail rapporto, sezione "Datore e Lavoratore"
- **Obiettivo:** mostrare link alle anagrafiche e contatti email/telefono per rapporti validi.
- **Acceptance:** icone di navigazione presenti per datore e lavoratore; contatti letti dalle anagrafiche collegate; comportamento coerente tra rapporti reali e fallback.
- **Note:** investigare join o foreign key incoerenti post-refactor.

#### [RAP-005] Investigare e rimuovere rapporti "fantasma"

- **Priorita:** P1
- **Tag:** BUG
- **Severity:** High
- **Effort:** L
- **Area:** Rapporti lavorativi, DB, query detail
- **Obiettivo:** capire e risolvere i record "Famiglia senza nome / Lavoratore non associato" che aprono detail incoerenti.
- **Acceptance:** quantificazione record impattati; diagnosi DB; cleanup dati se seed/test; fallback UI coerente se record orfani legittimi.
- **Note:** possibile causa condivisa con `RAP-004` e `CED-001`.

#### [RAP-006] Rimuovere matite inutili dalle sezioni sotto "Caratteristiche"

- **Priorita:** P3
- **Tag:** UX
- **Severity:** Low
- **Effort:** S
- **Area:** Detail rapporto
- **Obiettivo:** eliminare edit section-level da Datore/Lavoratore, Cedolini, Contributi, Documenti quando la modifica avviene altrove o in-place.
- **Acceptance:** solo "Caratteristiche del rapporto" mantiene la matita prevista da `RAP-003`.

#### [RAP-007] Mostrare cognome lavoratore nel label rapporto

- **Priorita:** P2
- **Tag:** BUG
- **Severity:** Medium
- **Effort:** M
- **Area:** Rapporti lavorativi e viste che mostrano label rapporto
- **Obiettivo:** usare formato `Cognome Nome Datore - Cognome Nome Lavoratore` in modo coerente.
- **Acceptance:** card, detail e viste correlate mostrano anche il cognome lavoratore; helper centralizzato se esiste.
- **Dipendenze:** da verificare insieme a `ASN-001`, `ASN-003`, `CED-001`.

#### [RAP-008] Ordinare rapporti per data inizio decrescente

- **Priorita:** P2
- **Tag:** BUG
- **Severity:** Medium
- **Effort:** S
- **Area:** Lista rapporti
- **Obiettivo:** default sort per `data_inizio` desc.
- **Acceptance:** rapporti piu recenti in alto; record senza `data_inizio` gestiti in modo definito, preferibilmente in fondo.

#### [RAP-009] Bottone per aprire area privata famiglia autenticata

- **Priorita:** P2
- **Tag:** MISSING, regressione
- **Severity:** Medium
- **Effort:** S
- **Area:** Detail rapporto
- **Obiettivo:** aggiungere azione che apre in nuova tab la redirect autenticata dell'area privata famiglia.
- **Acceptance:** URL composto come nel flusso Airtable esistente; accesso diretto senza login manuale.

#### [RAP-010] Aggiungere sezione "Tickets" nel detail rapporto

- **Priorita:** P2
- **Tag:** MISSING, regressione
- **Severity:** Medium
- **Effort:** M
- **Area:** Detail rapporto
- **Obiettivo:** mostrare ticket collegati e azione "Apri un ticket".
- **Acceptance:** sezione con lista ticket, stato/data/oggetto minimo, apertura ticket collegata al rapporto.
- **Da confermare:** scope ticket, campi da mostrare, destinazione del bottone.

#### [RAP-011] Gestire errori 503 di `table-query`

- **Priorita:** P2
- **Tag:** BUG
- **Severity:** Medium
- **Effort:** S
- **Area:** Rapporti lavorativi, error handling query lista
- **Obiettivo:** non mostrare messaggi tecnici raw e gestire errori transienti con retry/fallback.
- **Acceptance:** messaggio human-readable, bottone "Riprova", eventuale retry con backoff, logging diagnostico.
- **Note:** candidato a pattern globale per tutte le pagine che usano `table-query`.

### Assunzioni

#### [ASN-004] Salvare modifiche fatte nel detail panel Assunzioni

- **Priorita:** P0
- **Tag:** BUG
- **Severity:** Blocker
- **Effort:** M
- **Area:** Assunzioni, modale detail
- **Obiettivo:** rendere persistenti le modifiche ai campi del detail, non solo il drag and drop kanban.
- **Acceptance:** cambio stato da dropdown sposta la card e persiste; altri campi salvano su DB e restano valorizzati alla riapertura.
- **Note:** verificare se mutation/form shared impatta `CHI-003` e `VAR-002`.

#### [ASN-005] Aggiungere identificativi INPS/WebColf nel modale

- **Priorita:** P0
- **Tag:** MISSING
- **Severity:** Blocker
- **Effort:** S
- **Area:** Assunzioni, modale detail
- **Obiettivo:** esporre e rendere editabili `ID rapporto INPS`, `Cod. Rapporto WebColf`, `Cod. Lavoratore WebColf`.
- **Acceptance:** campi presenti, modificabili, persistenti e coerenti con nomenclatura Rapporti.
- **Da confermare:** schema DB e momento in cui i campi sono editabili.

#### [ASN-006] Aggiungere "Tipologia contratto" nel modale

- **Priorita:** P0
- **Tag:** MISSING, regressione
- **Severity:** Blocker
- **Effort:** S
- **Area:** Assunzioni, modale detail
- **Obiettivo:** aggiungere campo necessario alla generazione contratto via API e-signatures.
- **Acceptance:** campo presente con valori corretti; valore usato dal flusso contratto; valutata rimozione UI di "Tipologia di rapporto" legacy.
- **Da confermare:** sorgente di verita tra assunzione e rapporto.

#### [ASN-001] Fallback su nome anagrafico nel label card Assunzioni

- **Priorita:** P1
- **Tag:** BUG
- **Severity:** High
- **Effort:** S
- **Area:** Assunzioni, card kanban
- **Obiettivo:** evitare "Famiglia non trovata - Lavoratore non associato" quando esistono anagrafiche linked ma moduli non compilati.
- **Acceptance:** label usa dati modulo se presenti, altrimenti nome famiglia/lavoratore linked; card sempre identificabili.
- **Dipendenze:** cluster con `ASN-003` e `RAP-007`.

#### [ASN-003] Mostrare famiglia/lavoratore linked nel detail Assunzioni

- **Priorita:** P1
- **Tag:** BUG
- **Severity:** High
- **Effort:** M
- **Area:** Assunzioni, modale detail
- **Obiettivo:** distinguere dati anagrafici linked da dati di assunzione compilati tramite moduli.
- **Acceptance:** detail mostra sempre famiglia e lavoratore collegati con contatti; dati modulo restano in sezione separata e progressiva.
- **Da confermare:** se sostituire o affiancare la card "Rapporto collegato".

#### [ASN-007] Esporre luogo lavoro diverso da residenza nei dati datore

- **Priorita:** P1
- **Tag:** MISSING, regressione
- **Severity:** High
- **Effort:** M
- **Area:** Assunzioni, dati datore
- **Obiettivo:** aggiungere controllo "residenza = luogo lavoro" e campi condizionali luogo lavoro.
- **Acceptance:** toggle valorizzato da DB; se false mostra indirizzo, civico, CAP, provincia luogo lavoro; campi editabili e persistenti.
- **Da confermare:** nomi campo DB e gestione provincia.

#### [ASN-002] Rinominare "Deadline" in "Data di assunzione"

- **Priorita:** P3
- **Tag:** UX
- **Severity:** Low
- **Effort:** S
- **Area:** Assunzioni, modale detail
- **Obiettivo:** correggere label semantica del campo data.
- **Acceptance:** label aggiornata nel modale e in eventuali componenti condivisi.

### Chiusure

#### [CHI-001] Aggiungere bottoni apertura chiusura

- **Priorita:** P1
- **Tag:** MISSING
- **Severity:** High
- **Effort:** M
- **Area:** Chiusure, header pagina
- **Obiettivo:** aggiungere `Apri un licenziamento`, `Apri una dimissione`, `Apri un annullamento`.
- **Acceptance:** ogni bottone apre il flusso corretto per tipologia.
- **Da confermare:** se i wizard esistono gia o vanno progettati.

#### [CHI-003] Rendere editabili sezioni modale Chiusure

- **Priorita:** P1
- **Tag:** BUG
- **Severity:** High
- **Effort:** M
- **Area:** Chiusure, modale detail
- **Obiettivo:** applicare pattern matita -> edit fields alle sezioni popolate da moduli utente.
- **Acceptance:** campi editabili, salvataggio persistente, comportamento coerente con Assunzioni.
- **Dipendenze:** verificare fix comune con `ASN-004`.

#### [CHI-004] Aggiungere upload documenti di chiusura

- **Priorita:** P1
- **Tag:** MISSING
- **Severity:** High
- **Effort:** M
- **Area:** Chiusure, modale detail
- **Obiettivo:** aggiungere sezione per documenti finali di chiusura oltre alla lettera di avvio.
- **Acceptance:** slot upload documenti definiti, file persistenti e visualizzabili.
- **Da confermare:** elenco documenti per licenziamento, dimissione e annullamento.

#### [CHI-002] Link al rapporto nella card "Rapporto collegato"

- **Priorita:** P2
- **Tag:** BUG
- **Severity:** Medium
- **Effort:** S
- **Area:** Chiusure, modale detail
- **Obiettivo:** aggiungere azione "Vai al rapporto".
- **Acceptance:** link presente e funzionante come in Assunzioni; gestito caso rapporto mancante.

### Variazioni

#### [VAR-001] Bottone "Apri una variazione" con modale creazione

- **Priorita:** P1
- **Tag:** MISSING
- **Severity:** High
- **Effort:** M
- **Area:** Variazioni, header e modale creazione
- **Obiettivo:** creare variazione collegata a un rapporto selezionato.
- **Acceptance:** bottone in header; autocomplete rapporto per famiglia/lavoratore; textarea descrizione; creazione record persistente.
- **Note:** autocomplete rapporto da riusare con `TKT-001`.

#### [VAR-002] Rendere editabili sezioni modale Variazioni

- **Priorita:** P1
- **Tag:** BUG
- **Severity:** High
- **Effort:** M
- **Area:** Variazioni, modale detail
- **Obiettivo:** far funzionare pattern matita -> edit fields e persistenza modifiche.
- **Acceptance:** sezioni editabili definite; modifiche salvate; comportamento coerente con Assunzioni/Chiusure.
- **Da confermare:** elenco sezioni editabili e causa specifica del bug.

### Cedolini

#### [CED-001] Indagare cedolini con famiglia/lavoratore non disponibile

- **Priorita:** P1
- **Tag:** BUG
- **Severity:** High
- **Effort:** L
- **Area:** Cedolini, lista
- **Obiettivo:** diagnosticare se i cedolini anonimi sono dati sporchi, rapporti orfani o bug di label/query.
- **Acceptance:** analisi DB su `rapporto_id`; quantificazione; fix rendering o cleanup dati; card riconducibili a famiglia/lavoratore.
- **Dipendenze:** cluster con `RAP-005`, `ASN-001`, `RAP-007`.

#### [CED-002] Aggiungere tipo cedolino "Chiusura rapporto"

- **Priorita:** P1
- **Tag:** MISSING
- **Severity:** High
- **Effort:** S
- **Area:** Cedolini, tipo/categoria
- **Obiettivo:** aggiungere terzo valore oltre a `Regolare` e `Caso particolare`.
- **Acceptance:** valore disponibile in UI/DB; compatibile con logiche e filtri esistenti.
- **Dipendenze:** collegato a `CED-003`.

#### [CED-004] Rendere editabile calendario presenze

- **Priorita:** P1
- **Tag:** BUG
- **Severity:** High
- **Effort:** L
- **Area:** Cedolini, sezione presenze
- **Obiettivo:** permettere modifica giornaliera di ore, evento e codice PNR.
- **Acceptance:** modifiche persistono; template da distribuzione ore resta valido; definito eventuale ricalcolo valori cedolino.
- **Da confermare:** set eventi, significato PNR, UX edit.

#### [CED-006] Esporre URL cedolino modificabile

- **Priorita:** P1
- **Tag:** MISSING
- **Severity:** High
- **Effort:** S
- **Area:** Cedolini, detail
- **Obiettivo:** mostrare e permettere modifica manuale del link Google Drive/URL cedolino.
- **Acceptance:** campo URL visibile, editabile, persistente, con eventuale azione apri link.

#### [CED-008] Mostrare sezione Pagamento anche prima del pagamento riuscito

- **Priorita:** P1
- **Tag:** BUG
- **Severity:** High
- **Effort:** L
- **Area:** Cedolini, sezione Pagamento
- **Obiettivo:** mostrare link Stripe, importo, fee, stato e ID pagamento anche in stati intermedi.
- **Acceptance:** dati visibili da quando esiste pratica pagamento; stati `pending/succeeded/failed` o equivalenti gestiti; schema tecnico chiarito.
- **Da confermare:** modello dati pagamento attuale e sorgente link Stripe.

#### [CED-009] Conferma per "Chiedi dati" e "Fatturare"

- **Priorita:** P1
- **Tag:** UX
- **Severity:** High
- **Effort:** S
- **Area:** Cedolini, sezione Pagamento
- **Obiettivo:** evitare azioni irreversibili con click singolo.
- **Acceptance:** `AlertDialog` prima dell'esecuzione; wording specifico; azione parte solo dopo conferma.

#### [CED-003] Accent visivi per "Caso particolare" e "Chiusura rapporto"

- **Priorita:** P2
- **Tag:** UX
- **Severity:** Medium
- **Effort:** S
- **Area:** Cedolini, card lista
- **Obiettivo:** distinguere cedolini speciali con badge/accent.
- **Acceptance:** caso particolare evidenziato warning; chiusura rapporto evidenziata destructive/rosso; regolare default.
- **Dipendenze:** completa dopo `CED-002`.

#### [CED-005] Bottone reset presenze mese

- **Priorita:** P2
- **Tag:** MISSING
- **Severity:** Medium
- **Effort:** S
- **Area:** Cedolini, presenze
- **Obiettivo:** ripristinare template presenze del mese da distribuzione ore rapporto.
- **Acceptance:** bottone con conferma distruttiva; reset sovrascrive modifiche manuali; applicato al mese del cedolino.
- **Dipendenze:** utile dopo `CED-004`.

#### [CED-007] Mostrare Cod. Lavoratore WebColf nel cedolino

- **Priorita:** P2
- **Tag:** MISSING
- **Severity:** Medium
- **Effort:** S
- **Area:** Cedolini, dettagli rapporto
- **Obiettivo:** esporre codice lavoratore WebColf dal rapporto collegato.
- **Acceptance:** campo read-only visibile nella sezione rapporto.
- **Da confermare:** se aggiungere anche Cod. Rapporto WebColf e ID rapporto INPS.

### Ticket

#### [TKT-001] Collegare manualmente un rapporto a un ticket

- **Priorita:** P1
- **Tag:** MISSING
- **Severity:** High
- **Effort:** M
- **Area:** Customer Support, detail ticket
- **Obiettivo:** permettere collegamento manuale quando il matching automatico fallisce.
- **Acceptance:** se assente mostra "Collega rapporto"; se presente permette sostituire o rimuovere; autocomplete su famiglia/lavoratore; persistenza immediata.
- **Da confermare:** posizione campo, conferma su sostituzione, eventuale associazione automatica allegati al rapporto.
- **Note:** condividere autocomplete rapporto con `VAR-001`.

### Contributi INPS

- Nessun issue aperto in `task.md`.
