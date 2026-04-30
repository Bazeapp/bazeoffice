# Roadmap

Fonte aggiornata da `ISSUES (1).txt`.

## Legenda

- `✅ Fatto`: issue implementata/chiusa secondo lo stato operativo attuale.
- `❌ Non chiuso`: issue iniziata ma non conclusa, regressione aperta, oppure lasciata fuori per scelta/necessita decisione prodotto o dati.
- `⬜ Backlog`: issue non ancora implementata.

## Stato Sintetico

- `✅ Fatto`: 115
- `❌ Non chiuso`: 9
- `⬜ Backlog`: 13

## Sequenza Consigliata

1. Chiudere i parziali dati/payroll: `RAP-005`, `RAP-012`, `CED-001`, `CED-005`, `CED-008`.
2. Rifinire flussi contrattuali già avviati: `ASN-008`, `CHI-005`, `VAR-004`, `VAR-005`.
3. Proseguire sui backlog Ricerca/Lavoratori ancora aperti: `RIC-030`, `RIC-031`.
4. Riprendere CRM backlog: `CRM-013`, `CRM-014`, `CRM-016`, `CRM-017`.

## Roadmap Per Area

### Globali

#### ✅ [G-001] Aggiungere campi ruolo (multi-valore) e attivo alla tabella operatori

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** schema DB — tabella operatori (nome esatto da verificare); prerequisito per filtri utenti in tutte le pagine che assegnano/filtrano per utente interno | **Effort:** S


### Anagrafiche

#### ✅ [ANA-001] Aggiungere operatore has any of per enum singoli nel query builder

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** high | **Area:** componente filtri avanzati condivisa (tutte le pagine Anagrafiche) | **Effort:** S

#### ✅ [ANA-002] Filtri su campi enum restituiscono sempre 0 record

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** blocker | **Area:** componente filtri avanzati condivisa (tutte le pagine Anagrafiche) | **Effort:** S-M (dipende dalla causa effettiva)

#### ✅ [ANA-003] Componente filtri si corrompe quando la query restituisce 0 record

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** componente filtri avanzati condivisa (tutte le pagine Anagrafiche) | **Effort:** M

#### ✅ [ANA-004] Tipizzazione dei campi nel query builder si perde dopo navigazione e dopo aver applicato un filtro

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** componente filtri avanzati condivisa (tutte le pagine Anagrafiche) | **Effort:** M

#### ✅ [ANA-005] Operatore between nel query builder accetta solo un valore invece di due

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** medium | **Area:** componente filtri avanzati condivisa (tutte le pagine Anagrafiche) | **Effort:** S

#### ✅ [ANA-006] Operatori is e is not sui campi testuali sono case-sensitive (incoerenti con gli altri operatori testuali)

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** componente filtri avanzati condivisa (tutte le pagine Anagrafiche) | **Effort:** S

#### ✅ [ANA-007] Ripristinare panel laterale di dettaglio record (read-only) al click sulla riga

- **Stato:** Fatto
- **Tag:** [MISSING] (regressione) | **Severity:** medium | **Area:** tutte le pagine Anagrafiche (Lavoratori, Famiglie, Processi) | **Effort:** M (dipende da quanto del vecchio codice è recuperabile dalla history)

#### ✅ [ANA-008] Export CSV della vista filtrata sulle pagine Anagrafiche

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** tutte le pagine Anagrafiche (Lavoratori, Famiglie, Processi) | **Effort:** M

#### ✅ [ANA-009] Aggiungere visualizzazioni anagrafiche per Mesi Lavorati, Pagamenti, Selezioni Lavoratori e Rapporti Lavorativi

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** nuove pagine sotto Anagrafiche (4 pagine), condividono il componente tabella e il query builder già esistente | **Effort:** L (4 pagine × effort per pagina; il SWE valuterà se rilasciabili insieme o in batch separati)

#### ✅ [ANA-010] Search bar della pagina Processi cerca solo per ID, non per identificativi famiglia

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** medium | **Area:** Anagrafiche — pagina Processi (/anagrafiche/processi) | **Effort:** S


### CRM Famiglie

#### ✅ [CRM-001] Scroll verticale della pipeline famiglie avviene a livello di board invece che dentro le singole colonne

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** medium | **Area:** Pipeline Famiglie (/crm/pipeline-famiglie o path equivalente) | **Effort:** S

#### ✅ [CRM-002] Dopo un drag di una card tra colonne, il click sulle card non apre più il modale di dettaglio

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** Pipeline Famiglie (/crm/pipeline-famiglie) | **Effort:** S

#### ✅ [CRM-003] Mostrare data e ora della call prenotata sulla card della Pipeline Famiglie

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Pipeline Famiglie — card della kanban (/crm/pipeline-famiglie) | **Effort:** S

#### ✅ [CRM-004] Mostrare tentativi di chiamata senza risposta sulla card della Pipeline Famiglie (solo nella colonna "HOT - In attesa di primo contatto")

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Pipeline Famiglie — card della kanban (/crm/pipeline-famiglie) | **Effort:** S

#### ✅ [CRM-005] Mostrare stato "Preventivo accettato" come checkbox sulla card della Pipeline Famiglie

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Pipeline Famiglie — card della kanban (/crm/pipeline-famiglie) | **Effort:** S

#### ✅ [CRM-006] Ordinamento delle card nelle colonne della Pipeline Famiglie

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** medium | **Area:** Pipeline Famiglie (/crm/pipeline-famiglie) | **Effort:** S

#### ✅ [CRM-007] Mostrare data di ricontatto futuro sulla card della Pipeline Famiglie

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** low | **Area:** Pipeline Famiglie — card della kanban (/crm/pipeline-famiglie) | **Effort:** S

#### ✅ [CRM-008] Header sticky ricco nel detail sheet della Pipeline Famiglie (allineare al pattern già usato in altre sezioni)

- **Stato:** Fatto
- **Tag:** [UX] (regressione/inconsistenza) | **Severity:** medium | **Area:** Pipeline Famiglie — detail sheet di dettaglio famiglia (/crm/pipeline-famiglie) | **Effort:** S

#### ✅ [CRM-009] Riorganizzare la gerarchia delle sezioni del detail sheet della Pipeline Famiglie

- **Stato:** Fatto
- **Tag:** [REFACTOR] | **Severity:** medium | **Area:** Pipeline Famiglie — detail sheet di dettaglio famiglia (/crm/pipeline-famiglie) | **Effort:** S

#### ✅ [CRM-010] Tabs di navigazione nel detail sheet della Pipeline Famiglie (allineare al pattern già usato in altre sezioni)

- **Stato:** Fatto
- **Tag:** [UX] (regressione/inconsistenza) | **Severity:** medium | **Area:** Pipeline Famiglie — detail sheet di dettaglio famiglia (/crm/pipeline-famiglie) | **Effort:** M

#### ✅ [CRM-011] Semplificare la sezione "Creazione annuncio" con un bottone unico e workflow di automazione unificato

- **Stato:** Fatto
- **Tag:** [REFACTOR] | **Severity:** low | **Area:** Pipeline Famiglie — detail sheet di dettaglio famiglia, sezione "Creazione annuncio" (/crm/pipeline-famiglie) | **Effort:** M (include lavoro backend di orchestrazione delle automazioni)

#### ✅ [CRM-012] Sezione "Onboarding" contestuale dinamica nel detail sheet della Pipeline Famiglie

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Pipeline Famiglie — detail sheet di dettaglio famiglia (/crm/pipeline-famiglie) | **Effort:** M

#### ✅ [CRM-013] Aggiungere "Monza e della Brianza" alla lookup table delle province nel matching

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Pipeline Famiglie — detail sheet, sezione Onboarding / campo Provincia (/crm/pipeline-famiglie) | **Effort:** XS
- **Nota:** Verificato via Supabase MCP: `lookup_values` contiene già `lavoratori.provincia = Monza e della Brianza`; il frontend usava hardcode Milano/Roma/Torino. Ora il campo Provincia usa la lookup.

#### ✅ [CRM-014] Aggiungere opzione "Indifferente" al radio del genere nella sezione Onboarding

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Pipeline Famiglie — detail sheet, sezione Onboarding, card decisione lavoro (src/components/crm/cards/onboarding-decisione-lavoro-card.tsx) | **Effort:** XS

#### ✅ [CRM-015] Date picker della deadline non salva la data e l'input manuale si auto-svuota

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** Pipeline Famiglie — campo "Deadline" nel detail sheet (/crm/pipeline-famiglie) | **Effort:** XS (fix già identificato)

#### ✅ [CRM-016] Rimuovere il bottone "Copia" sul link Google Maps nella sezione Onboarding

- **Stato:** Fatto
- **Tag:** [CLEANUP] | **Severity:** low | **Area:** Pipeline Famiglie — detail sheet, sezione Onboarding, card anagrafica (src/components/crm/cards/onboarding-card.tsx) | **Effort:** XS

#### ❌ [CRM-017] Workflow SEO/slug e creazione annuncio: validazione prerequisiti e riordino azioni

- **Stato:** Non chiuso
- **Tag:** [FEATURE] [REFACTOR] | **Severity:** medium | **Area:** Pipeline Famiglie — detail sheet, sezione "Creazione annuncio" (/crm/pipeline-famiglie) | **Effort:** M
- **Nota:** Frontend riordinato e mock rimosso, ma manca ancora il webhook backend per pubblicare su Webflow/generare annuncio. Configurato solo `workflow-create-job-offer-seo`.


### Assegnazione

#### ✅ [ASS-001] Dropdown "Tutti i recruiter" nella pagina Assegnazione mostra tutti gli operatori invece dei soli recruiter attivi

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** medium | **Area:** Pagina Assegnazione (/crm-famiglie/assegnazione) — dropdown "Tutti i recruiter" in alto a sinistra | **Effort:** S

#### ✅ [ASS-002] Scroll verticale della kanban di Assegnazione avviene a livello di board invece che dentro le singole colonne

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** medium | **Area:** Assegnazione (/crm-famiglie/assegnazione) | **Effort:** S

#### ✅ [ASS-003] Ridurre le colonne giorno visibili da 5 a 3 con navigazione per frecce

- **Stato:** Fatto
- **Tag:** [UX] | **Severity:** medium | **Area:** Assegnazione (/crm-famiglie/assegnazione) | **Effort:** M

#### ✅ [ASS-004] Colonna "Da assegnare" mostra 239 ricerche invece del sottoinsieme atteso

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** Assegnazione (/crm-famiglie/assegnazione) — colonna "Da assegnare" | **Effort:** S (investigazione) + dipende dal risultato

#### ✅ [ASS-005] Aggiungere link "Vai alla ricerca" nel detail sheet della pagina Assegnazione

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Assegnazione — detail sheet (/crm-famiglie/assegnazione) | **Effort:** S

#### ✅ [ASS-006] Colore delle card nella colonna "Da assegnare" basato sulla deadline, non sull'assegnatario

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** medium | **Area:** Assegnazione — colonna "Da assegnare" (/crm-famiglie/assegnazione) | **Effort:** S

#### ✅ [ASS-007] Ordinamento delle card nelle colonne giorno per recruiter (con grouping collassabile come nice-to-have)

- **Stato:** Fatto
- **Tag:** [UX] | **Severity:** medium | **Area:** Assegnazione — colonne giorno del calendario (/crm-famiglie/assegnazione) | **Effort:** S


### Ricerca

#### ✅ [RIC-001] Fissare orizzontalmente la colonna info ricerca nella kanban Ricerche attive

- **Stato:** Fatto
- **Tag:** [UX] | **Severity:** low | **Area:** Ricerca → Ricerche attive (detail ricerca) — colonna sinistra info ricerca + kanban stages | **Effort:** S (<1h)

#### ✅ [RIC-002] Filtrare il dropdown "Operatori" ai soli recruiter attivi

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** medium | **Area:** Ricerca → Ricerche attive — dropdown filtro operatori (kanban ricerche) | **Effort:** S (<1h)

#### ✅ [RIC-003] Aggiungere bottone "Smart Matching" nell'header della pagina detail ricerca

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive (detail ricerca) — header pagina | **Effort:** M (1-4h)

#### ✅ [RIC-004] Aggiungere bottone "+ Aggiungi" per inserire un lavoratore nella ricerca

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive (detail ricerca) — header pagina / sezione "Lavoratori per questa ricerca" | **Effort:** M (1-4h)

#### ✅ [RIC-005] Mostrare il travel time nella card lavoratore della kanban

- **Stato:** Fatto
- **Tag:** [MISSING] (regressione) | **Severity:** medium | **Area:** Ricerca → Ricerche attive (detail ricerca) — card lavoratore negli stage della kanban | **Effort:** S (<1h)

#### ❌ [RIC-006] Mostrare indicatore availability score sulla card lavoratore

- **Stato:** Non chiuso
- **Tag:** [MISSING] (regressione) | **Severity:** medium | **Area:** Ricerca → Ricerche attive (detail ricerca) — card lavoratore negli stage della kanban | **Effort:** S (<1h)
- **Nota:** Non chiuso / lasciato fuori per scelta nel file issue.

#### ✅ [RIC-007] Mostrare sulla card lavoratore il coinvolgimento in altre selezioni attive

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** high | **Area:** Ricerca → Ricerche attive (detail ricerca) — card lavoratore negli stage della kanban | **Effort:** L (>4h)

#### ✅ [RIC-008] Esporre stato ricerca (processo_res) editabile in cima alla colonna info famiglia

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** high | **Area:** Ricerca → Ricerche attive (detail ricerca) — colonna sinistra info famiglia | **Effort:** S (<1h)

#### ❌ [RIC-009] Esporre tipologia incontro editabile nella colonna info famiglia

- **Stato:** Non chiuso
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive (detail ricerca) — colonna sinistra info famiglia | **Effort:** S (<1h)
- **Nota:** Non chiuso / lasciato fuori per scelta nel file issue.

#### ✅ [RIC-010] Riorganizzare e completare la colonna famiglia nel detail ricerca con tutti i campi matchmaking della sales pipeline

- **Stato:** Fatto
- **Tag:** [MISSING] (regressione) + [UX] | **Severity:** high | **Area:** Ricerca → Ricerche attive (detail ricerca) — colonna sinistra info famiglia | **Effort:** L (>4h)

#### ✅ [RIC-011] Aggiungere sezione "Annuncio" con brief copiabile nella colonna info famiglia

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive (detail ricerca) — colonna sinistra info famiglia | **Effort:** S (<1h)

#### ✅ [RIC-012] Esporre label e valore dei dropdown "Stato lavoratore" e "Disponibile" nel detail lavoratore

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — colonna profilo lavoratore, dropdown accanto a email/telefono | **Effort:** S (<1h)

#### ✅ [RIC-013] Aggiungere sezione "Altre ricerche attive" nel detail lavoratore con navigazione cross-ricerca

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** high | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — colonna destra (sezione LAVORATORE) | **Effort:** L (>4h)

#### ✅ [RIC-014] Mostrare per intero il campo "Orario di lavoro" nel sheet lavoratore senza troncamento

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — colonna famiglia, sezione Orari e frequenza | **Effort:** S (<1h)

#### ❌ [RIC-015] Aggiungere campo "Riassunto esperienze AI" nel detail lavoratore con bottone genera/rigenera

- **Stato:** Non chiuso
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — colonna destra, sezione "Esperienza" | **Effort:** S (<1h)
- **Nota:** Non chiuso / lasciato fuori per scelta nel file issue.

#### ✅ [RIC-016] Mostrare la colonna famiglia completa anche nel detail lavoratore

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** high | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — colonna sinistra famiglia | **Effort:** S (<1h) se RIC-010 è già implementato come componente riusabile, M altrimenti

#### ✅ [RIC-017] Aggiungere bottone "Genera con AI" per il campo "Crea feedback Baze"

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — sezione centrale, blocco "Lavoratore selezionato – finalizza la scheda colloquio", campo "Crea feedback Baze" | **Effort:** S (<1h)

#### ✅ [RIC-018] La textarea "Crea feedback Baze" non occupa il 100% della larghezza del container

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** low | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — sezione centrale, blocco "Lavoratore selezionato – finalizza la scheda colloquio", campo "Crea feedback Baze" | **Effort:** S (<1h)

#### ✅ [RIC-019] Correggere copy dell'header della sezione esperienze

- **Stato:** Fatto
- **Tag:** [UX] | **Severity:** low | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — colonna destra, sezione "Esperienza", sottosezione lista esperienze | **Effort:** S (<1h)

#### ✅ [RIC-020] Aggiungere bottone "+ Aggiungi esperienza" con modale nella sezione esperienze del detail lavoratore

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — colonna destra, sezione "Esperienza", sottosezione lista esperienze di lavoro | **Effort:** M (1-4h)

#### ✅ [RIC-021] Aggiungere icona cestino per cancellare esperienza in modalità edit della sezione esperienze

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — colonna destra, sezione "Esperienza", sottosezione lista esperienze di lavoro | **Effort:** S (<1h)

#### ✅ [RIC-022] Esporre campo "Lavori accettabili" multi-select nella sezione Calendario disponibilità

- **Stato:** Fatto
- **Tag:** [MISSING] (regressione) | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — colonna destra, sezione "Calendario disponibilità" | **Effort:** S (<1h)

#### ✅ [RIC-023] Aggiungere sezione "Documenti" come ultima sezione della colonna destra del detail lavoratore

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — colonna destra, in coda alle sezioni esistenti | **Effort:** S (<1h)

#### ✅ [RIC-024] Aggiungere sezione "Preferenze e vincoli" con check accetta/non accetta nel detail lavoratore

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — colonna destra, sopra la sezione "Skill e competenze" | **Effort:** M (1-4h)

#### ✅ [RIC-025] Esporre campo "Tipo di rapporto" nella sezione Calendario disponibilità

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — colonna destra, sezione "Calendario disponibilità" | **Effort:** S (<1h)

#### ✅ [RIC-026] Esporre campo "Tipo di lavoro" nella sezione Esperienza sopra gli anni di esperienza

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — colonna destra, sezione "Esperienza" | **Effort:** S (<1h)

#### ✅ [RIC-027] Mostrare campo "Motivo non selezionato" quando lo stato selezione è "Non selezionato"

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — sezione centrale "Scheda colloquio", sotto il dropdown "Stato selezione" | **Effort:** S (<1h)

#### ✅ [RIC-028] Mostrare campo "Motivo no match" quando lo stato selezione è "No match"

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — sezione centrale "Scheda colloquio", sotto il dropdown "Stato selezione" | **Effort:** S (<1h)

#### ✅ [RIC-029] Mostrare campi "Data/ora colloquio famiglia lavoratore" e "Colloquio effettuato" negli stati colloquio/prova

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore (aperto da card kanban) — sezione centrale "Scheda colloquio", sotto il dropdown "Stato selezione" | **Effort:** S (<1h)

#### ✅ [RIC-030] Aggiungere nella colonna famiglia i campi check richiesti in fase di sales (esigenza, nazionalità, flag richieste)

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** high | **Area:** Ricerca → Ricerche attive (detail ricerca) — colonna sinistra info famiglia, sezione "Richieste" | **Effort:** S (se RIC-010 è implementato, i campi sono già previsti nella sezione Richieste — verificare che siano tutti effettivamente esposti)
- **Nota:** Segnata fatta su indicazione prodotto/QA: già implementata.

#### ✅ [RIC-031] Rimuovere il campo SRC Maps dalla sezione "Luogo di lavoro" nella colonna famiglia

- **Stato:** Fatto
- **Tag:** [CLEANUP] | **Severity:** low | **Area:** Ricerca → Ricerche attive (detail ricerca) — colonna sinistra info famiglia, sezione "Luogo di lavoro" | **Effort:** XS

#### ✅ [RIC-032] Correggere la logica dei pallini "selezioni attive" sulla card lavoratore: escludere selezioni non in conflitto

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** Ricerca → Ricerche attive (detail ricerca) — card lavoratore nella kanban | **Effort:** M

#### ✅ [RIC-033] Mostrare la sezione "Colloquio famiglia lavoratore" anche quando il lavoratore è nello stato "Inviato al cliente"

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore — sezione centrale "Scheda colloquio" | **Effort:** S

#### ✅ [RIC-034] Sostituire i valori Sì/No del campo "Colloquio effettuato" con stati granulari

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore — campo "Colloquio effettuato" nella sezione Scheda colloquio | **Effort:** S

#### ✅ [RIC-035] Sostituire il campo testo libero "Mobilità" con un multi-select combobox nel blocco Travel Time

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore — colonna destra, blocco "Travel Time", campo "Mobilità" | **Effort:** S

#### ✅ [RIC-036] Aggiungere il civico e tutti i campi indirizzo prenotazione prova nel blocco Travel Time della famiglia

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Ricerca → Ricerche attive → detail lavoratore — colonna destra, blocco "Travel Time", sotto-sezione dati indirizzo famiglia | **Effort:** S
- **Nota:** Il blocco Travel Time espone già indirizzo lavoratore e famiglia; origine indirizzo lavoratore verificata su DB: `lavoratori.indirizzo_residenza_completo`, `cap`, `provincia`, con indirizzi normalizzati nella tabella `indirizzi` dove disponibili.

#### ✅ [RIC-037] Correggere il combobox "Tipo di lavoro": impedire duplicati e mostrare checkbox selezionate nel dropdown

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** Ricerca → Ricerche attive → detail lavoratore — campo "Tipo di lavoro" (e tutti i combobox multi-select con lo stesso comportamento) | **Effort:** S-M

#### ✅ [RIC-038] Ridurre la dimensione del testo e aggiungere troncamento nel titolo delle card esperienza

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** low | **Area:** Ricerca → Ricerche attive → detail lavoratore — sezione "Esperienze di lavoro", card singola esperienza | **Effort:** XS

#### ✅ [RIC-039] Correggere la logica della sezione "Altre ricerche attive": mostrare solo selezioni in potenziale conflitto

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** Ricerca → Ricerche attive → detail lavoratore — sezione "Altre ricerche attive" (introdotta da RIC-013) | **Effort:** M


### Lavoratori

#### ✅ [LAV-001] Mostrare città + CAP del lavoratore nella card

- **Stato:** Fatto
- **Tag:** BUG | **Severity:** high | **Area:** Lavoratori → Cerca Lavoratori (card lavoratore) | **Effort:** S

#### ✅ [LAV-002] Mostrare sulla card lavoratore il coinvolgimento in altre selezioni attive

- **Stato:** Fatto
- **Tag:** MISSING | **Severity:** high | **Area:** Lavoratori → Cerca Lavoratori (card lavoratore) | **Effort:** M

#### ✅ [LAV-003] Esporre label e valore dei dropdown "Stato lavoratore" e "Disponibile" nel detail lavoratore

- **Stato:** Fatto
- **Tag:** BUG | **Severity:** high | **Area:** Lavoratori → Cerca Lavoratori → detail lavoratore (aperto da card) — dropdown accanto a email/telefono | **Effort:** S

#### ✅ [LAV-004] Mostrare il campo "Motivazione" solo quando stato_lavoratore = "Non idoneo"

- **Stato:** Fatto
- **Tag:** BUG | **Severity:** medium | **Area:** Lavoratori → Cerca Lavoratori → detail lavoratore — header sticky, accanto al dropdown stato_lavoratore | **Effort:** S

#### ✅ [LAV-005] Header sticky del detail lavoratore coperto dalle sezioni in scroll (z-index)

- **Stato:** Fatto
- **Tag:** BUG | **Severity:** medium | **Area:** Lavoratori → Cerca Lavoratori → detail lavoratore — header sticky | **Effort:** S

#### ✅ [LAV-007] Rimuovere tab "Disponibilità" e mostrare "ritorno disponibilità" condizionalmente nell'header

- **Stato:** Fatto
- **Tag:** UX | **Severity:** medium | **Area:** Lavoratori → Cerca Lavoratori → detail lavoratore — tab "Disponibilità" + header sticky | **Effort:** S

#### ✅ [LAV-008] Spostare icona X di chiusura fuori dall'header sticky in una barra superiore dedicata

- **Stato:** Fatto
- **Tag:** UX | **Severity:** low | **Area:** Lavoratori → Cerca Lavoratori → detail lavoratore — header sticky | **Effort:** S

#### ✅ [LAV-009] Aggiungere bottone "Elimina" nelle singole esperienze del detail lavoratore

- **Stato:** Fatto
- **Tag:** MISSING | **Severity:** medium | **Area:** Lavoratori → Cerca Lavoratori → detail lavoratore — tab "Esperienze", singola card esperienza | **Effort:** S

#### ✅ [LAV-010] Aggiungere sezione "Ricerche coinvolte" con tab Attivi/Tutti nel detail lavoratore

- **Stato:** Fatto
- **Tag:** MISSING | **Severity:** high | **Area:** Lavoratori → Cerca Lavoratori → detail lavoratore — sezione "Ricerche coinvolte" | **Effort:** L

#### ✅ [LAV-011] Rinominare la tab "Documenti" in "Documenti e dati amministrativi" con sezione dedicata ai dati amministrativi

- **Stato:** Fatto
- **Tag:** UX | **Severity:** low | **Area:** Lavoratori → Cerca Lavoratori → detail lavoratore — tab "Documenti" | **Effort:** S

#### ✅ [LAV-012] Aggiungere campo IBAN nella sezione "Dati amministrativi"

- **Stato:** Fatto
- **Tag:** MISSING | **Severity:** medium | **Area:** Lavoratori → Cerca Lavoratori → detail lavoratore — tab "Documenti e dati amministrativi", sezione "Dati amministrativi" | **Effort:** S

#### ✅ [LAV-013] Aggiungere campo ID account Stripe nella sezione "Dati amministrativi"

- **Stato:** Fatto
- **Tag:** MISSING | **Severity:** medium | **Area:** Lavoratori → Cerca Lavoratori → detail lavoratore — tab "Documenti e dati amministrativi", sezione "Dati amministrativi" | **Effort:** S

#### ❌ [LAV-014] Mostrare bottone "Genera account Stripe" quando IBAN è valorizzato e ID Stripe è vuoto

- **Stato:** Non chiuso
- **Tag:** MISSING | **Severity:** medium | **Area:** Lavoratori → Cerca Lavoratori → detail lavoratore — tab "Documenti e dati amministrativi", sezione "Dati amministrativi" | **Effort:** M
- **Nota:** Non chiuso / lasciato fuori per scelta nel file issue.

#### ✅ [LAV-015] Rimuovere tab/sezione "Questo lavoratore non è idoneo" ridondante con l'header sticky

- **Stato:** Fatto
- **Tag:** UX | **Severity:** low | **Area:** Lavoratori → Cerca Lavoratori → detail lavoratore — tab/sezione "Non qualifica..." (visibile nella tab bar) | **Effort:** S

#### ✅ [LAV-016] Aggiungere bottone "+ Aggiungi ad una ricerca" con flusso di ricerca via email e check idempotenza

- **Stato:** Fatto
- **Tag:** MISSING | **Severity:** medium | **Area:** Lavoratori → Cerca Lavoratori → detail lavoratore — sezione "Ricerche coinvolte", bottone in header | **Effort:** M

#### ✅ [LAV-017] Gestione allegati: impossibile cancellare un allegato caricato, sovrascrittura al secondo upload, e supporto multi-file per documenti con più pagine

- **Stato:** Fatto
- **Tag:** [BUG] [MISSING] | **Severity:** low | **Area:** Lavoratori → Cerca Lavoratori → detail lavoratore — blocco allegati (UI distribuita: tab Documenti e dati amministrativi + eventuali altri punti dove il blocco allegati è esposto) | **Effort:** M

#### ✅ [LAV-018] Il filtro "Attivi" della sezione "Ricerche coinvolte" mostra sempre vuoto

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** Lavoratori → Cerca Lavoratori → detail lavoratore — sezione "Ricerche coinvolte", tab "Attivi" | **Effort:** M

#### ✅ [GT1-009] Edge Function 'update-record' restituisce errore 500 al salvataggio del referente idoneità

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** blocker | **Area:** Lavoratori → Gate 1 — detail lavoratore, campo "Referente idoneità" | **Effort:** S
- **Nota:** Il DB espone `referente_idoneita_id` e `referente_certificazione_id`; il FE ora legge/salva questi campi ASCII/id e `table-query` li espone nella whitelist.

#### ✅ [GT1-010] Aggiungere tre bottoni di prenotazione colloquio in presenza (Milano / Torino / Monza) nell'header di Gate 1

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Lavoratori → Gate 1 — header pagina | **Effort:** XS

#### ✅ [GT1-011] Il filtro base sulla disponibilità non esclude i lavoratori "Non disponibili" dalla lista Gate 1

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** Lavoratori → Gate 1 — lista lavoratori | **Effort:** M
- **Nota:** La lista applica anche un guard client-side sul filtro rolling: `Disponibile` oppure `Non disponibile` con `data_ritorno_disponibilita <= oggi + 2 giorni`.

#### ✅ [GT2-012] Campo IBAN non editabile nel detail lavoratore di Gate 2

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** Lavoratori → Gate 2 — detail lavoratore, sezione "Dati amministrativi", campo IBAN | **Effort:** S
- **Nota:** IBAN resta editabile inline con salvataggio al blur; ID account Stripe resta read-only.


### Rapporti Lavorativi

#### ✅ [RAP-001] Correggere il tag di stato del rapporto che risulta sempre "Sconosciuto"

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** src/pages/RapportiLavorativi (list card + detail header) | **Effort:** S (<1h)

#### ✅ [RAP-002] Definire semantica e sorgente di verità di stato_rapporto dopo la rimozione di gestione_contrattuale

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** high | **Area:** rapporti_lavorativi (schema DB) + logica di derivazione frontend/backend | **Effort:** L (>4h)

#### ✅ [RAP-003] Rendere read-only i campi del rapporto che richiedono variazione contrattuale, tranne i codici WebColf

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** src/pages/RapportiLavorativi — sezione "Caratteristiche del rapporto" (detail) | **Effort:** S (<1h)

#### ✅ [RAP-004] Ripristinare linked record e dati di contatto nei rapporti lavorativi reali

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** src/pages/RapportiLavorativi — sezione "Datore e Lavoratore" (detail) | **Effort:** M (1-4h)
- **Nota:** Storicamente chiuso, ma da rivalidare con RAP-014 che riapre la regressione.

#### ❌ [RAP-005] Investigare e rimuovere i rapporti "fantasma" con famiglia/lavoratore non associato[d][e][f]

- **Stato:** Non chiuso
- **Tag:** [BUG] | **Severity:** high | **Area:** src/pages/RapportiLavorativi + tabella rapporti_lavorativi (DB) + query detail | **Effort:** L (>4h) — include investigazione
- **Nota:** Non chiuso: serve decisione/cleanup dati; non basta fallback UI.

#### ✅ [RAP-006] Rimuovere le icone edit dalle sezioni del detail rapporto sotto "Caratteristiche del rapporto"

- **Stato:** Fatto
- **Tag:** [UX] | **Severity:** low | **Area:** src/pages/RapportiLavorativi — detail rapporto, sezioni sotto "Caratteristiche del rapporto" | **Effort:** S (<1h)

#### ✅ [RAP-007] Mostrare il cognome del lavoratore nel label rapporto in tutte le viste

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** medium | **Area:** src/pages/RapportiLavorativi + tutti i punti del backoffice in cui è mostrato il label di un rapporto lavorativo | **Effort:** M (1-4h)
- **Nota:** Storicamente chiuso, ma da rivalidare con RAP-014 che riapre la regressione.

#### ✅ [RAP-008] Ordinare i rapporti lavorativi per data di inizio decrescente

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** medium | **Area:** src/pages/RapportiLavorativi — lista rapporti (sidebar sinistra) | **Effort:** S (<1h)

#### ✅ [RAP-009] Aggiungere bottone per aprire l'area privata famiglia autenticata dell'utente dal detail rapporto

- **Stato:** Fatto
- **Tag:** [MISSING] (regressione) | **Severity:** medium | **Area:** src/pages/RapportiLavorativi — detail rapporto | **Effort:** S (<1h)

#### ✅ [RAP-010] Aggiungere sezione "Tickets" nel detail rapporto lavorativo

- **Stato:** Fatto
- **Tag:** [MISSING] (regressione) | **Severity:** medium | **Area:** src/pages/RapportiLavorativi — detail rapporto | **Effort:** M (1-4h)

#### ✅ [RAP-011] Gestire con grazia gli errori 503 di Supabase Edge Functions in Rapporti lavorativi

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** medium | **Area:** src/pages/RapportiLavorativi — gestione errori della query lista | **Effort:** S (<1h)

#### ❌ [RAP-012] Caricamento del detail rapporto lavorativo lento (20+ secondi) con dati stale del rapporto precedente durante il loading

- **Stato:** Non chiuso
- **Tag:** [BUG] [PERFORMANCE] | **Severity:** high | **Area:** Rapporti lavorativi → detail rapporto — sezione "Datore / Lavoratore" e sezioni downstream (Cedolini, Contributi, ecc.) | **Effort:** M-L
- **Nota:** Parziale: risolto reset dati stale al cambio rapporto e ridotte alcune ricerche; resta da validare/profilare il target performance <3s.

#### ✅ [RAP-013] Click sui ticket nella sezione "Tickets" del detail rapporto non apre il modale del ticket

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** Rapporti lavorativi → detail rapporto — sezione "Tickets" (introdotta da RAP-010) | **Effort:** S

#### ✅ [RAP-014] Regressione RAP-004 e RAP-007: dati lavoratore assenti nella sezione "Datore e Lavoratore", cognome mancante, ricerca per email e altri campi non funzionante

- **Stato:** Fatto
- **Tag:** [BUG] [REGRESSIONE] | **Severity:** high | **Area:** Rapporti lavorativi → detail rapporto — sezione "Datore e Lavoratore" + barra di ricerca lista rapporti | **Effort:** M
- **Nota:** Riapre formalmente RAP-004/RAP-007 come issue attivo.

#### ✅ [RAP-015] Sostituire il filtro "stato assunzione" con un filtro select per "stato rapporto" nella lista rapporti lavorativi

- **Stato:** Fatto
- **Tag:** [BUG] [MISSING] | **Severity:** high | **Area:** Rapporti lavorativi → lista rapporti (colonna sinistra) — filtro select in alto | **Effort:** S

#### ✅ [RAP-016] Ordinare la lista rapporti per stato rapporto (primario) e data inizio decrescente (secondario)

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** Rapporti lavorativi → lista rapporti (colonna sinistra) — ordinamento default | **Effort:** S


### Assunzioni

#### ✅ [ASN-001] Aggiungere fallback sul nome anagrafico nel label delle card di Assunzioni

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** src/pages/Assunzioni — card kanban / componente di composizione label rapporto | **Effort:** S (<1h)

#### ✅ [ASN-002] Rinominare il campo "Deadline" in "Data di assunzione" nel modale di Assunzioni

- **Stato:** Fatto
- **Tag:** [UX] | **Severity:** low | **Area:** src/pages/Assunzioni — modale detail, sezione "Contesto pratica" | **Effort:** S (<1h)

#### ✅ [ASN-003] Rendere visibili famiglia e lavoratore collegati nel detail di Assunzioni anche prima della compilazione dei moduli

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** src/pages/Assunzioni — modale detail | **Effort:** M (1-4h)

#### ✅ [ASN-004] Le modifiche fatte nel detail panel di Assunzioni non vengono salvate

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** blocker | **Area:** src/pages/Assunzioni — modale detail | **Effort:** M (1-4h)

#### ✅ [ASN-005] Aggiungere i campi ID rapporto INPS, Cod. Rapporto WebColf, Cod. Lavoratore WebColf nel modale Assunzioni

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** Blocker | **Area:** src/pages/Assunzioni — modale detail | **Effort:** S (<1h)

#### ✅ [ASN-006] Aggiungere il campo "Tipologia contratto" nel modale Assunzioni

- **Stato:** Fatto
- **Tag:** [MISSING] (regressione) | **Severity:** blocker | **Area:** src/pages/Assunzioni — modale detail | **Effort:** S (<1h)

#### ✅ [ASN-007] Aggiungere controllo "luogo residenza = luogo lavoro" e campi condizionali nei dati assunzione datore

- **Stato:** Fatto
- **Tag:** [MISSING] (regressione) | **Severity:** high | **Area:** src/pages/Assunzioni — modale detail, sezione "Informazioni generali" del datore | **Effort:** M (1-4h)

#### ✅ [ASN-008] Rimuovere il bottone con freccina (link esterno) dalla card assunzione nella lista

- **Stato:** Fatto
- **Tag:** [CLEANUP] | **Severity:** low | **Area:** Assunzioni → lista assunzioni — card singola assunzione | **Effort:** XS

#### ✅ [ASN-009] Convertire "Tipologia contratto" e "Tipologia rapporto" da testo libero a select con opzioni prestabilite nel modale assunzione

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** Assunzioni → modale detail — sezione "Tipologia contratto e rapporto" | **Effort:** S

#### ✅ [ASN-010] Convertire il campo "Tipo utente" da testo libero a single select nella sezione "Informazioni generali" del riepilogo assunzione

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** medium | **Area:** Assunzioni → modale detail — sezione "Informazioni generali" (riepilogo, dopo i blocchi datore e lavoratore) | **Effort:** S


### Chiusure

#### ✅ [CHI-001] Aggiungere tre bottoni di apertura chiusura nell'header della pagina Chiusure

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** high | **Area:** src/pages/Chiusure — header pagina | **Effort:** M (1-4h)

#### ✅ [CHI-002] Aggiungere il link al rapporto nella card "Rapporto collegato" del modale Chiusure

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** medium | **Area:** src/pages/Chiusure — modale detail, card "Rapporto collegato" | **Effort:** S (<1h)

#### ✅ [CHI-003] Rendere editabili le sezioni del modale Chiusure tramite il pattern matita → edit fields

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** src/pages/Chiusure — modale detail, sezioni popolate dai moduli utente | **Effort:** M (1-4h)

#### ✅ [CHI-004] Aggiungere sezione per upload documenti di chiusura nel modale Chiusure

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** high | **Area:** src/pages/Chiusure — modale detail | **Effort:** M (1-4h)

#### ✅ [CHI-005] Collegare i tre bottoni di apertura chiusura ai moduli Airtable e spostarli nel section header in alto a destra

- **Stato:** Fatto
- **Tag:** [BUG] [UX] | **Severity:** high | **Area:** src/pages/Chiusure — toolbar e section header | **Effort:** S


### Variazioni

#### ✅ [VAR-001] Aggiungere bottone "Apri una variazione" con modale di creazione

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** high | **Area:** src/pages/Variazioni — header pagina + nuovo modale di creazione | **Effort:** M (1-4h)

#### ✅ [VAR-002] Le sezioni del modale Variazioni non sono editabili tramite il pattern matita

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** src/pages/Variazioni — modale detail | **Effort:** M (1-4h)

#### ✅ [VAR-003] La matita sui "Dati rapporto lavorativo" nel modale variazione non apre la modalità edit

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** src/pages/Variazioni — modale detail, sezione "Dati rapporto lavorativo" | **Effort:** S

#### ✅ [VAR-004] Aggiungere le sezioni "Dati assunzione lavoratore" e "Dati famiglia" nel modale variazione

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** src/pages/Variazioni — modale detail | **Effort:** M
- **Nota:** Aggiunte sezioni editabili "Dati lavoratore" e "Dati famiglia"; il salvataggio aggiorna i record anagrafici `lavoratori` e `famiglie`, non il record variazione.

#### ✅ [VAR-005] Spostare il bottone "Apri una variazione" dalla toolbar al section header in alto a destra

- **Stato:** Fatto
- **Tag:** [UX] | **Severity:** low | **Area:** src/pages/Variazioni — toolbar sopra la search bar + section header | **Effort:** XS


### Cedolini

#### ❌ [CED-001] Indagare i cedolini con famiglia e/o lavoratore "non disponibile" nella pagina Cedolini

- **Stato:** Non chiuso
- **Tag:** [BUG] | **Severity:** high | **Area:** src/pages/Cedolini (o equivalente, sotto Payroll) — lista cedolini | **Effort:** L (>4h) — include investigazione
- **Nota:** Parziale: fatta diagnosi DB, manca decisione cleanup/fix finale.

#### ✅ [CED-002] Aggiungere "Chiusura rapporto" come terza opzione al campo tipo cedolino

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** high | **Area:** src/pages/Cedolini — campo tipo/categoria del cedolino | **Effort:** S (<1h)

#### ✅ [CED-003] Aggiungere accent visivi ai cedolini "caso particolare" e "chiusura rapporto"

- **Stato:** Fatto
- **Tag:** [UX] | **Severity:** medium | **Area:** src/pages/Cedolini — card cedolino in lista | **Effort:** S (<1h)

#### ✅ [CED-004] Rendere editabili le presenze del mese nel calendario del cedolino

- **Stato:** Fatto
- **Tag:** [BUG] | **Severity:** high | **Area:** src/pages/Cedolini — sezione presenze / calendario presenze del cedolino | **Effort:** L (>4h)

#### ❌ [CED-005] Aggiungere bottone "Reset presenze del mese" nella sezione presenze del cedolino

- **Stato:** Non chiuso
- **Tag:** [MISSING] | **Severity:** medium | **Area:** src/pages/Cedolini — sezione presenze del cedolino | **Effort:** S (<1h)
- **Nota:** Non implementato per scelta tecnica: manca regola prodotto sicura per rigenerare template presenze senza sovrascrivere dati.

#### ✅ [CED-006] Esporre link URL del cedolino nel detail, modificabile dall'operatore

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** high | **Area:** src/pages/Cedolini — detail cedolino | **Effort:** S (<1h)

#### ✅ [CED-007] Mostrare il codice lavoratore WebColf nei dettagli del rapporto del cedolino

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** medium | **Area:** src/pages/Cedolini — sezione dettagli rapporto del cedolino | **Effort:** S (<1h)

#### ❌ [CED-008] Mostrare la sezione Pagamento del cedolino anche prima dell'effettivo pagamento[g][h]

- **Stato:** Non chiuso
- **Tag:** [BUG] | **Severity:** high | **Area:** src/pages/Cedolini — sezione "Pagamento" nel detail cedolino | **Effort:** L (>4h) — include allineamento tecnico col team
- **Nota:** Parziale/fallback implementato, ma non chiuso finché non è chiarita/esposta la pratica pagamento pre-success.

#### ✅ [CED-009] Aggiungere dialog di conferma ai bottoni "Chiedi dati" e "Fatturare" nella sezione Pagamento

- **Stato:** Fatto
- **Tag:** [UX] | **Severity:** high | **Area:** src/pages/Cedolini — sezione "Pagamento" nel detail cedolino | **Effort:** S (<1h)


### Ticket

#### ✅ [TKT-001] Permettere di collegare manualmente un rapporto lavorativo a un ticket esistente

- **Stato:** Fatto
- **Tag:** [MISSING] | **Severity:** high | **Area:** src/pages/Customer Support — detail ticket | **Effort:** M (1-4h)
