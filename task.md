Pagina Rapporti lavorativi
[RAP-001] Correggere il tag di stato del rapporto che risulta sempre "Sconosciuto"
Tag: [BUG] Severity: high Page/Component: src/pages/RapportiLavorativi (list card + detail header) Effort: S (<1h)
Sintomo / Cosa succede ora Nella lista dei rapporti lavorativi, tutte le card visibili in pagina 1 mostrano il tag di stato "Sconosciuto", indipendentemente dai dati del rapporto. Lo stesso tag compare anche nell'header del detail a destra, accanto a "NON attivo".
Atteso / Cosa dovrebbe succedere Il tag di stato deve riflettere dinamicamente lo stato reale del rapporto. "Sconosciuto" dovrebbe essere un fallback effettivo, non il valore mostrato di default su rapporti che hanno uno stato determinabile.
Come riprodurre
Aprire la pagina Rapporti lavorativi.
Osservare le card in lista: ognuna mostra il badge "Sconosciuto" a destra del nome famiglia.
Cliccare su un rapporto qualsiasi: nel detail header, sotto al titolo, compare di nuovo il badge "Sconosciuto" vicino a "NON attivo".

[RAP-002] Definire semantica e sorgente di verità di stato_rapporto dopo la rimozione di gestione_contrattuale
Tag: [MISSING] Severity: high Page/Component: rapporti_lavorativi (schema DB) + logica di derivazione frontend/backend Effort: L (>4h)
Sintomo / Cosa succede ora Pre-refactor: gestione_contrattuale (1 per famiglia) teneva lo stato lato cliente, rapporti_lavorativi (N contratti per famiglia) teneva lo stato del singolo contratto. Una famiglia poteva essere "Attivo" anche con un rapporto storico "Terminato", purché ne avesse un altro attivo. Post-refactor: gestione_contrattuale è stata eliminata, il suo ruolo assorbito da famiglie. stato_servizio (Attivo | Non attivo) vive ora sulla famiglia. Su rapporti_lavorativi non esiste una colonna stato_rapporto: il valore che la UI dovrebbe mostrare (In attivazione | Attivo | Terminato | Sconosciuto) non ha una sorgente di verità definita. Conseguenze operative: (a) non sappiamo con certezza quanti rapporti siano attivi in un dato momento perché il conteggio dipende da una derivazione non formalizzata; (b) stato_rapporto e stato_servizio sono concetti diversi ma nel detail header compaiono affiancati senza distinzione chiara, creando ambiguità.
Atteso / Cosa dovrebbe succedere Va presa e documentata una decisione architetturale su:
Dove vive stato_rapporto: colonna persistita su rapporti_lavorativi, oppure derivato a runtime. Entrambe le opzioni sono legittime ma vanno scelte esplicitamente, non per inerzia.
Regola di derivazione: da quali campi (es. data_inizio, data_fine, presenza cedolini, ecc.) si ricavano In attivazione | Attivo | Terminato, e in quali casi si cade nel fallback Sconosciuto.
Se derivato a frontend: la funzione deve essere centralizzata (non duplicata tra list card, detail header, conteggi, eventuali dashboard) ed essere la singola fonte di verità per "rapporti attivi" usata ovunque nell'app.
Disambiguazione UI tra stato_rapporto e stato_servizio della famiglia nel detail header, dove oggi compaiono vicini senza etichette che chiariscano a cosa si riferisce ciascuno.
Note
Blocca: RAP-001. Finché la regola non è definita, la fix del badge è cieca.
Contesto storico rilevante per chi riceve il ticket: il cambio deriva dalla rimozione della tabella gestione_contrattuale. Il fatto che stato_attivo fosse prima su quella tabella (sul "cliente") e non sui singoli contratti spiega perché oggi manca una colonna equivalente su rapporti_lavorativi — non è una dimenticanza, è il risultato del refactor.
Da decidere con il team (Nicolò + SWE esterno + eventuale input CEO): non è una decisione puramente tecnica, ha impatto su come leggiamo le metriche di business ("rapporti attivi").
Una volta decisa la regola, verificare che tutti i punti dell'app che contano/filtrano rapporti attivi usino la stessa funzione/query.

[RAP-003] Rendere read-only i campi del rapporto che richiedono variazione contrattuale, tranne i codici WebColf
Tag: [BUG] Severity: high Page/Component: src/pages/RapportiLavorativi — sezione "Caratteristiche del rapporto" (detail) Effort: S (<1h)
Sintomo / Cosa succede ora Nella pagina detail di un rapporto lavorativo, nella sezione "Caratteristiche del rapporto", cliccando sul bottone edit (matita) in alto a destra tutti i campi della sezione diventano editabili: tipo durata, tipo contratto, tipo rapporto, ore settimanali, data inizio, stato assunzione, relazione lavorativa, distribuzione ore, paga oraria lorda, paga mensile lorda, cod. rapporto WebColf, cod. lavoratore WebColf.
Atteso / Cosa dovrebbe succedere Il bottone edit deve restare disponibile, ma in modalità edit i soli campi editabili devono essere:
Cod. Rapporto WebColf
Cod. Lavoratore WebColf
Tutti gli altri campi devono restare read-only anche in modalità edit. La loro modifica richiede formalmente l'apertura di una variazione contrattuale (con relativa comunicazione INPS, aggiornamento documenti, ecc.), e modificarli direttamente dalla UI bypasserebbe il flusso contrattuale.
Come riprodurre
Aprire la pagina Rapporti lavorativi.
Selezionare un rapporto dalla lista.
Nel detail, cliccare sul bottone edit (matita) in alto a destra della sezione "Caratteristiche del rapporto".
Tutti i campi diventano editabili, inclusi quelli che dovrebbero richiedere variazione contrattuale.
Note
La matita non va rimossa (diversamente da quanto avviene per le altre sezioni, v. RAP-006): serve proprio per editare i due codici WebColf.
Se è più semplice lato implementazione, i due codici WebColf potrebbero essere editabili direttamente in-place senza passare per la modalità edit generale — da valutare con SWE.

[RAP-004] Ripristinare linked record e dati di contatto nei rapporti lavorativi reali
Tag: [BUG] Severity: high Page/Component: src/pages/RapportiLavorativi — sezione "Datore e Lavoratore" (detail) Effort: M (1-4h)
Sintomo / Cosa succede ora Nella pagina detail di un rapporto lavorativo reale (es. Saccardo Emanuele – Annie Rocio, screenshot 1), nella sezione Datore e Lavoratore:
Non compaiono le icone di navigazione (↗) accanto ai nomi di datore e lavoratore: non è possibile aprire da qui l'anagrafica del soggetto.
Email e telefono di entrambi risultano vuoti (-), anche se i dati esistono sulle anagrafiche di riferimento.
Al contrario, nei rapporti "rotti" / fantasma (RAP-005, screenshot 2) le icone ↗ sono presenti e i contatti sono popolati correttamente. Il comportamento è invertito rispetto a quello atteso.
Atteso / Cosa dovrebbe succedere Per tutti i rapporti lavorativi validi:
L'icona ↗ deve essere presente accanto al nome del datore e del lavoratore e portare alla rispettiva anagrafica.
Email e telefono devono essere letti dalle anagrafiche collegate e mostrati correttamente.
Come riprodurre
Aprire la pagina Rapporti lavorativi.
Selezionare un rapporto reale (con famiglia e lavoratore associati — es. Saccardo Emanuele – Annie Rocio).
Nel detail a destra, tab Contratto o sezione "Datore e Lavoratore": osservare assenza delle icone ↗ e dei dati di contatto.
Confrontare con un rapporto "rotto" (famiglia senza nome, v. RAP-005): le icone e i dati sono presenti.
Note
Il fatto che il comportamento sia invertito (funziona sui rotti, non sui reali) suggerisce che la query o il join usato per recuperare i dati del datore e del lavoratore punti a un campo/relazione sbagliato. Ipotesi non confermate: (a) join su un foreign key errato o deprecato post-refactor gestione_contrattuale; (b) query che funziona solo per il caso di fallback sbagliato (RAP-005) e fallisce per il caso normale.
Verificare quale hook/query alimenta la sezione "Datore e Lavoratore" nel detail e se è lo stesso usato per la card list (che mostra correttamente "Saccardo Emanuele – Annie Rocio" come header, quindi qualche relazione viene recuperata).
Potenziale collegamento con RAP-001/RAP-002: se il sistema di derivazione dati post-refactor è rotto in più punti, la causa radice potrebbe essere condivisa.

[RAP-005] Investigare e rimuovere i rapporti "fantasma" con famiglia/lavoratore non associato
Tag: [BUG] Severity: high Page/Component: src/pages/RapportiLavorativi + tabella rapporti_lavorativi (DB) + query detail Effort: L (>4h) — include investigazione
Sintomo / Cosa succede ora Nella lista Rapporti lavorativi compaiono numerose card etichettate come "Famiglia senza nome – Lavoratore non associato – 0h/sett" (visibile anche in pagina 1 dello screenshot originale RAP-001 e in screenshot 2). Cliccando su uno di questi record:
Il detail a destra carica un rapporto con datore = Laura Piacentino (stesso nome su tutti i rotti visti finora) e lavoratore = nome variabile.
Paradossalmente, questi rapporti "rotti" mostrano i dati correttamente (icone ↗, email, telefono) mentre i rapporti reali no (v. RAP-004).
Non è chiaro:
Da dove arrivino questi rapporti (seed di test mai rimosso? Import sbagliato? Bug di creazione?).
Se siano record realmente con datore_id = Laura Piacentino, oppure record orfani che cadono su un fallback che carica sempre quel cliente.
Se la card list sia corretta (e sono davvero rapporti senza associazione) mentre il detail mente, oppure viceversa.
Atteso / Cosa dovrebbe succedere
Non devono esistere rapporti "Famiglia senza nome / Lavoratore non associato" a meno che non corrispondano a un caso d'uso legittimo (da identificare e documentare).
Se sono dati sporchi da seed/test: vanno puliti dal DB.
Se sono record legittimamente orfani: la UI deve rappresentarli come tali in modo coerente tra card e detail, senza cadere su fallback che mostrano un cliente casuale.
Come riprodurre
Aprire la pagina Rapporti lavorativi.
Ordinare la lista: compaiono numerosi record con header "Famiglia senza nome – Lavoratore non associato – 0h/sett".
Cliccare su uno qualsiasi: il detail carica "Laura Piacentino" come datore.
Cliccare su un altro dello stesso tipo: stesso pattern — datore = Laura Piacentino, lavoratore diverso.
Note
Da fare per prima cosa: verificare a DB cosa contengono realmente questi record (valori di famiglia_id, lavoratore_id, datore_id/collegamento famiglia).
Tre ipotesi diagnostiche da scartare o confermare (nessuna confermata):
(a) Dati di seed/test mai puliti, tutti creati con riferimento a Laura Piacentino come datore fittizio. La card list li mostra come "senza nome" per un bug di rendering (non legge il nome del datore pur esistendo); il detail carica il vero datore.
(b) Record con foreign key null che cadono su un fallback errato lato detail (primo record in DB? ultimo? hardcoded?) che recupera Laura Piacentino.
(c) Record legittimi ma con struttura dati diversa dai rapporti reali (es. creati da un flusso diverso) che la UI non sa rappresentare coerentemente.
Quantificare: quanti sono questi rapporti sul totale di 809? Il dato aiuta a capire se è un problema di pulizia dati (si risolve con DELETE) o di bug sistemico di creazione.
Possibile collegamento con RAP-004: il fatto che su questi "rotti" le relazioni funzionino mentre sui reali no suggerisce una query/schema di relazioni incoerente tra i due tipi di record.

[RAP-006] Rimuovere le icone edit dalle sezioni del detail rapporto sotto "Caratteristiche del rapporto"
Tag: [UX] Severity: low Page/Component: src/pages/RapportiLavorativi — detail rapporto, sezioni sotto "Caratteristiche del rapporto" Effort: S (<1h)
Sintomo / Cosa succede ora Nella pagina detail di un rapporto lavorativo, le sezioni Datore e Lavoratore, Cedolini e Contributi INPS mostrano tutte un'icona matita in alto a destra per aprire una modalità di editing.
Atteso / Cosa dovrebbe succedere L'icona matita deve essere rimossa da tutte queste sezioni perché non serve:
Datore e Lavoratore: i dati sono linked record verso le anagrafiche di famiglia e lavoratore. La modifica avviene sull'anagrafica del soggetto, navigando tramite l'icona ↗ accanto al nome.
Cedolini: i cedolini si gestiscono in-place nella sezione stessa o dal flusso Payroll dedicato, non serve una modalità edit separata.
Contributi INPS: stesso ragionamento dei cedolini.
Documenti del rapporto (Accordo di lavoro, Ricevuta INPS, Delega INPS, se posizionati in una sezione con matita): sono già editabili in-place con i bottoni upload (+) sulle card documento.
La pagina detail del rapporto, sotto "Caratteristiche del rapporto", deve essere di sola consultazione a livello di sezione — le editabilità puntuali restano gestite dai componenti interni (upload, linked record, ecc.).
Note
La sezione "Caratteristiche del rapporto" mantiene la matita con logica dedicata (v. RAP-003), non rientra in questo ticket.
Verificare se la matita è un componente condiviso tra sezioni o replicata. In caso di componente condiviso, la rimozione va fatta a livello di configurazione della singola sezione, non del componente.

[RAP-007] Mostrare il cognome del lavoratore nel label rapporto in tutte le viste
Tag: [BUG] Severity: medium Page/Component: src/pages/RapportiLavorativi + tutti i punti del backoffice in cui è mostrato il label di un rapporto lavorativo Effort: M (1-4h)
Sintomo / Cosa succede ora Il label di un rapporto lavorativo viene composto come Cognome Nome Datore – Solo nome del lavoratore. Il cognome del lavoratore non compare mai:
Nelle card della lista Rapporti lavorativi (es. "Annie" invece di "Rocio Annie").
Nel titolo del detail rapporto.
Nei dati di assunzione (sezione Assunzioni).
In tutti gli altri punti del backoffice dove compare il label del rapporto.
Atteso / Cosa dovrebbe succedere Il label rapporto deve essere composto come: Cognome Nome Datore – Cognome Nome Lavoratore
Il cognome del lavoratore deve essere sempre presente, coerentemente con come viene trattato il datore.
Come riprodurre
Aprire la pagina Rapporti lavorativi.
Osservare le card in lista: per il datore compare "Cognome Nome" (es. "Saccardo Emanuele"), per il lavoratore compare solo il nome (es. "Annie Rocio" visualizzato come "Annie Rocio" o simile — verificare sul campo specifico).
Stesso comportamento nel titolo del detail e nella pagina Assunzioni.
Note
Da verificare in prima battuta: il campo cognome del lavoratore è valorizzato in DB o manca a monte? Se manca, il bug è di popolamento, non di rendering.
Se il campo esiste ma non viene letto, il bug è probabilmente nella funzione di composizione del label rapporto, che va identificata e corretta. Da verificare se è un helper/util condiviso oppure replicato in più componenti.
Scope da confermare durante la fix: se il bug si manifesta non solo nel label rapporto ma anche nell'anagrafica Lavoratori, nei processi matching, ecc., allora il problema è sistemico sul rendering del nome lavoratore e questo ticket va promosso a globale (G-XXX). Da rivalutare a fine giro review.
Ipotesi alternativa (non confermata): il dato potrebbe essere mostrato correttamente come "Nome Cognome" in alcuni punti e "Cognome Nome" in altri, con incoerenza — controllare durante la fix.

[RAP-008] Ordinare i rapporti lavorativi per data di inizio decrescente
Tag: [BUG] Severity: medium Page/Component: src/pages/RapportiLavorativi — lista rapporti (sidebar sinistra) Effort: S (<1h)
Sintomo / Cosa succede ora Nella lista Rapporti lavorativi, l'ordinamento di default dei record non segue un criterio riconoscibile. Le date di inizio rapporto visibili nello screenshot mostrano un ordine non monotono: 11/02/2026, 11/02/2026, 04/02/2026, 16/01/2026, 10/12/2025, 10/11/2025, 27/10/2025, 15/10/2025, 03/10/2025 — l'ordine sembra decrescente per data di inizio in questo tratto, ma nelle pagine iniziali compaiono record con date molto recenti mescolate a record con famiglia/lavoratore non associato (v. RAP-005), e non è chiaro quale sia il criterio effettivo.
Atteso / Cosa dovrebbe succedere La lista deve essere ordinata per data di inizio rapporto in ordine decrescente (dal più recente al più lontano nel tempo) come ordinamento di default. I controlli di sort utente (icona ↑↓ in alto) possono permettere modifiche, ma il default deve essere quello.
Come riprodurre
Aprire la pagina Rapporti lavorativi senza applicare filtri o ordinamenti personalizzati.
Scorrere la lista e osservare le date di inizio delle card: l'ordine non corrisponde a un criterio chiaro e soprattutto non riflette l'ordine per data decrescente atteso.
Note
Verificare quale sia il criterio di ordinamento attualmente applicato (probabile: created_at del record in DB, o ID, o ordine naturale della query). Da confermare.
I rapporti "fantasma" con famiglia/lavoratore non associato (v. RAP-005) possono confondere la diagnosi perché spesso hanno data_inizio null o uguale alla data di creazione record. Quando verrà risolto RAP-005 la verifica dell'ordinamento sarà più pulita.
Da decidere: comportamento per rapporti senza data_inizio valorizzata — in fondo alla lista o in testa? Suggerisco in fondo, ma da confermare.

[RAP-009] Aggiungere bottone per aprire l'area privata famiglia autenticata dell'utente dal detail rapporto
Tag: [MISSING] (regressione) Severity: medium Page/Component: src/pages/RapportiLavorativi — detail rapporto Effort: S (<1h)
Sintomo / Cosa succede ora Nel detail del rapporto lavorativo non è presente un bottone che permetta all'operatore di aprire direttamente l'area privata autenticata dell'utente associato al rapporto.
Atteso / Cosa dovrebbe succedere Aggiungere un bottone (posizionabile nella shell del detail, es. accanto al titolo) che apre in nuova tab l'URL composto per accedere direttamente all'area privata autenticata dell'utente, come già esiste oggi su Airtable. L'URL è una redirect composta del tipo [base]?id=[id] (o equivalente) che autentica e porta l'operatore all'area privata senza dover fare login manualmente. Serve all'operatore per vedere o intervenire sull'area privata del cliente durante la gestione operativa.
Note
Funzionalità già esistente nell'implementazione Airtable corrente, regressione nel port a BazeOffice.
URL di redirect e meccanismo di autenticazione automatica: riutilizzare l'implementazione Airtable come riferimento, non reinventare.

[RAP-010] Aggiungere sezione "Tickets" nel detail rapporto lavorativo
Tag: [MISSING] (regressione) Severity: medium Page/Component: src/pages/RapportiLavorativi — detail rapporto Effort: M (1-4h)
Sintomo / Cosa succede ora Nel detail del rapporto lavorativo non è presente una sezione che raccolga i ticket aperti relativi a quel rapporto.
Atteso / Cosa dovrebbe succedere Aggiungere una sezione "Tickets" al detail del rapporto, coerente con le altre sezioni presenti (Cedolini, Contributi INPS, ecc.), con:
Header: titolo "Tickets" + bottone di azione "Apri un ticket" (riferimento: screenshot allegato da Airtable).
Corpo: lista dei ticket collegati al rapporto. Per ogni ticket almeno: identificativo, stato, data apertura, oggetto (da definire con Nicolò in fase di implementazione o con riferimento all'implementazione Airtable).
Note
Feature già presente in Airtable, regressione nel port a BazeOffice. Screenshot Airtable allegato come riferimento visivo.
Da confermare con Nicolò:
Scope dei ticket da mostrare: solo ticket direttamente legati al rapporto, oppure anche ticket della famiglia/lavoratore filtrati per correlazione con il rapporto?
Comportamento di "Apri un ticket": apre un form interno a BazeOffice oppure redirige a un sistema esterno di ticketing (es. Respond.io o altro)?
Campi esatti da mostrare per ogni ticket nella lista.
Possibile componente condiviso con altre viste (detail famiglia, detail lavoratore) se la sezione Tickets è presente anche lì: da valutare a fine giro review.

[RAP-011] Gestire con grazia gli errori 503 di Supabase Edge Functions in Rapporti lavorativi
Tag: [BUG] Severity: medium Page/Component: src/pages/RapportiLavorativi — gestione errori della query lista Effort: S (<1h)
Sintomo / Cosa succede ora In modo intermittente, aprendo o interagendo con la pagina Rapporti lavorativi compare al posto della lista un messaggio di errore raw in rosso:
table-query(rapporti_lavorativi) failed: Edge function 'table-query' failed (503):
{"code":"SUPABASE_EDGE_RUNTIME_ERROR","m... is temporarily unavailable"}
Il counter della lista mostra "0-0 di 0 rapporti" e l'area di dettaglio a destra mostra lo stato vuoto standard. Un refresh della pagina tipicamente risolve e la lista si carica correttamente.
Atteso / Cosa dovrebbe succedere Quando la Edge Function table-query risponde con un errore transiente (503 o altri errori di infrastruttura Supabase), la UI deve:
Non mostrare mai lo stack trace / messaggio tecnico raw all'utente.
Mostrare un messaggio human-readable (es. "Impossibile caricare i rapporti, riprova tra qualche secondo") e un bottone "Riprova".
Idealmente implementare un retry automatico con backoff (es. 2-3 tentativi a 1s, 3s, 5s) prima di mostrare l'errore all'utente.
Come riprodurre Difficile da riprodurre in modo deterministico. Osservato intermittentemente. Sospetti trigger non confermati:
Cambio rapido tra record nella lista.
Refresh / remount del componente lista.
Cold start della Edge Function dopo un periodo di inattività.
Note
La causa radice (perché la Edge Function risponde 503) è verosimilmente lato infrastruttura Supabase, non bug in BazeOffice — questo ticket riguarda solo la gestione lato client di quell'errore.
Da decidere con SWE se implementare solo il fallback UX o anche il retry automatico. Il retry automatico risolve la maggior parte dei casi transienti senza che l'utente si accorga del problema.
Pattern da applicare probabilmente anche altrove: se la stessa Edge Function table-query è usata in altre pagine (Anagrafiche, CRM, ecc.), la stessa gestione errori va estesa. Da valutare come componente/hook condiviso → candidato per issue globale (G-XXX) a fine giro review, se il pattern si ripete.
Utile per la diagnosi futura: instrumentare l'errore con logging (console + eventuale Sentry) per capire con quale frequenza succede e se correla con azioni specifiche dell'utente.

Pagina Assunzioni

[ASN-001] Aggiungere fallback sul nome anagrafico nel label delle card di Assunzioni
Tag: [BUG] Severity: high Page/Component: src/pages/Assunzioni — card kanban / componente di composizione label rapporto Effort: S (<1h)
Sintomo / Cosa succede ora Nelle colonne kanban della pagina Assunzioni (in particolare "Dati pronti per assunzione" e gli stati precedenti), tutte le card che riguardano processi in cui famiglia e lavoratore non hanno ancora compilato i moduli dei documenti di assunzione mostrano come titolo "Famiglia non trovata – Lavoratore non associato". Questo accade anche se la famiglia e il lavoratore sono già linked al record dell'assunzione (i loro dati anagrafici esistono e sono accessibili).
Impatto operativo: l'operatore non riesce a capire di chi sia il processo che sta guardando finché non vengono compilati i moduli. Questo blocca direttamente le attività di follow-up: non è possibile identificare a quali famiglie o lavoratori manca la compilazione dei dati e a chi quindi va sollecitato il completamento. La vista perde valore proprio nella fase in cui dovrebbe essere più utile.
Atteso / Cosa dovrebbe succedere Il label del rapporto deve replicare il comportamento già presente nella formula Airtable, con fallback in cascata:
[Parte famiglia] – [Parte lavoratore]

Parte famiglia =
IF(cognome_nome_datore_PROPER, cognome_nome_datore_PROPER, nome_cognome_famiglia)

Parte lavoratore =
IF(nome_cognome_lavoratore_da_assunzione, nome_cognome_lavoratore_da_assunzione, nome_cognome_lavoratore)
In sintesi: usa prima i dati del modulo di assunzione se compilati, altrimenti fallback sul nome anagrafico della famiglia/lavoratore linked al record. In questo modo l'operatore vede sempre un identificativo umano e può fare follow-up mirato sui processi incompleti.
Come riprodurre
Aprire la pagina Assunzioni.
Osservare la colonna "Dati pronti per assunzione": tutte e 3 le card mostrano "Famiglia non trovata – Lavoratore non associato" pur avendo i tag "Famiglia" e "Lavoratore" presenti (= linked record esiste).
Confrontare con la colonna "Documenti assunzione inviati": le card lì mostrano correttamente "Cognome Nome Datore – Nome Lavoratore" perché i moduli sono stati compilati.
Note
Funzionalità già presente nell'implementazione Airtable corrente, regressione nel port a BazeOffice. Riferimento: screenshot della formula Airtable allegato.
Possibile collegamento con RAP-007 (cognome lavoratore non visibile nel label rapporto su Rapporti lavorativi). Se la funzione/componente di composizione del label rapporto è condivisa tra Rapporti lavorativi, Assunzioni e altre pagine, i due issue potrebbero essere due sintomi dello stesso bug — una fix unica della funzione di composizione potrebbe risolvere entrambi. Da verificare durante l'implementazione.
Nomi esatti dei campi (cognome_nome_datore_PROPER, nome_cognome_famiglia, nome_cognome_lavoratore_da_assunzione, nome_cognome_lavoratore) sono da Airtable. Il SWE deve mappare ai campi Supabase equivalenti — alcuni potrebbero non esistere o avere nomi diversi.
Se durante l'implementazione si scopre che il campo "fallback" (es. nome_cognome_famiglia) anche su Supabase non è popolato, il bug è a monte (popolamento dati / sync dei record famiglia-assunzione) e va riaperto come issue separato.

[ASN-002] Rinominare il campo "Deadline" in "Data di assunzione" nel modale di Assunzioni
Tag: [UX] Severity: low Page/Component: src/pages/Assunzioni — modale detail, sezione "Contesto pratica" Effort: S (<1h)
Sintomo / Cosa succede ora Nel modale di detail di un'assunzione, sezione "Contesto pratica", il campo data in fondo alla riga (a destra di "Stato assunzione" e "Tipo rapporto") è etichettato come "DEADLINE".
Atteso / Cosa dovrebbe succedere L'etichetta deve essere "DATA DI ASSUNZIONE". Il valore semantico del campo è la data di assunzione del rapporto, non una scadenza generica.
Note
Verifica nelle stesse posizioni in altre viste (CRM Famiglie, Pipeline, ecc.) se compare un'etichetta "Deadline" sullo stesso campo: in caso, da rinominare anche lì per coerenza. Probabilmente il rename è di un singolo label statico nel componente, ma se è etichettato anche su un campo DB / model, va valutato l'impatto.

[ASN-003] Rendere visibili famiglia e lavoratore collegati nel detail di Assunzioni anche prima della compilazione dei moduli
Tag: [BUG] Severity: high Page/Component: src/pages/Assunzioni — modale detail Effort: M (1-4h)
Sintomo / Cosa succede ora Nel modale detail di un processo di assunzione, finché la famiglia e il lavoratore non hanno compilato i rispettivi moduli di dati assunzione, le card "DATORE" e "LAVORATORE" mostrano "FAMIGLIA NON TROVATA" e "LAVORATORE NON ASSOCIATO" con stato di errore (icona rossa). Email e telefono risultano vuoti (-).
Questo accade anche quando il rapporto lavorativo collegato (visibile nella sezione "Rapporto collegato" in alto) ha già famiglia e lavoratore linked correttamente: i dati anagrafici esistono, semplicemente non vengono mostrati in questa modale finché i moduli di assunzione non sono compilati.
Impatto operativo: l'operatore non riesce a identificare chi è la famiglia e chi è il lavoratore per il processo che sta gestendo, e non può fare follow-up mirato (chiamare la famiglia, contattare il lavoratore) finché qualcun altro non ha completato i moduli — esattamente nella fase in cui dovrebbe poter agire per sbloccare la situazione.
Atteso / Cosa dovrebbe succedere Famiglia e lavoratore collegati al rapporto devono essere sempre visibili nel detail dell'assunzione, indipendentemente dalla compilazione dei moduli. Sono due concetti separati e la presenza dell'uno non esclude l'altro:
Famiglia/Lavoratore collegati = anagrafiche linked al rapporto al momento della creazione (sempre presenti)
Dati di assunzione datore/lavoratore = informazioni raccolte tramite moduli compilati dagli utenti, necessarie per avviare la pratica di assunzione (popolate progressivamente)
Soluzione proposta: avere due sezioni distinte e indipendenti nel detail panel:
Una sezione che mostra famiglia e lavoratore collegati al rapporto, con i dati anagrafici disponibili (nome, cognome, email, telefono presi dalle anagrafiche linked).
Una sezione "Riepilogo datore / Informazioni generali" che mostra i dati raccolti dai moduli di assunzione (come oggi).
La prima è sempre popolata (se il rapporto ha famiglia e lavoratore collegati), la seconda è popolata progressivamente man mano che i moduli vengono compilati.
Come riprodurre
Aprire la pagina Assunzioni.
Aprire una card di un processo nelle colonne "In attesa di dati lavoratore" o "Dati pronti per assunzione" (cioè processi in cui i moduli non sono ancora completi).
Nel modale: le card DATORE e LAVORATORE mostrano errore "non trovata / non associato" anche se il rapporto ha famiglia e lavoratore linked (visibile nella sezione "Rapporto collegato" in alto, e cliccando "Vai al rapporto").
Note
Contesto di dominio rilevante per chi riceve il ticket: i "dati di assunzione" sono raccolti tramite moduli compilati da famiglia e lavoratore e contengono informazioni necessarie alla pratica di assunzione che non sempre sono presenti nelle anagrafiche. La doppia sorgente esiste per scelta legacy ed è prevista da deprecare in futuro, ma per la migrazione attuale resta. Quindi: la soluzione non è "fondere i dati di assunzione con l'anagrafica", ma "mostrare anche i dati anagrafici a fianco dei dati di assunzione".
Collegamento con ASN-001: stesso pattern (mancato fallback sui dati anagrafici quando i dati di assunzione sono vuoti) ma su superficie UI diversa. Se la funzione di rendering del label/dati di famiglia-lavoratore è condivisa tra card kanban e detail panel, una fix unica risolve entrambi. Da verificare durante l'implementazione.
Collegamento con RAP-007 (cognome lavoratore non visibile nel label rapporto). Tutti e tre gli issue (ASN-001, ASN-003, RAP-007) potrebbero condividere la stessa funzione di composizione/rendering — vale la pena trattarli come cluster nella roadmap di sviluppo.
La sezione "Rapporto collegato" attualmente in alto al detail svolge parzialmente questa funzione ma mostra solo il label del rapporto e un link, non i dati di contatto di famiglia e lavoratore. Va decisa se mantenere quella sezione, sostituirla, o aggiungere accanto la sezione richiesta da questo ticket (decisione di design da definire con Nicolò in fase di implementazione).

[ASN-004] Le modifiche fatte nel detail panel di Assunzioni non vengono salvate
Tag: [BUG] Severity: blocker Page/Component: src/pages/Assunzioni — modale detail Effort: M (1-4h)
Sintomo / Cosa succede ora Le modifiche fatte ai campi del detail panel di un processo di assunzione non vengono salvate:
Cambiando il valore di "Stato Assunzione" dal dropdown nel detail (es. da "In attesa di dati lavoratore" a "Dati pronti per assunzione"), la card nella kanban non si sposta nella nuova colonna. Riaprendo il detail, il campo è tornato al valore originale.
Stesso comportamento aggiornando altri campi della scheda (es. "Totale ore lavorative", "Tipologia di rapporto", "Regime di convivenza", ecc.): le modifiche non persistono.
Per contro, il drag & drop della card nella kanban funziona correttamente: trascinare una card in una colonna diversa aggiorna lo stato e persiste.
Impatto operativo: bloccante. Il detail panel è inutilizzabile per modificare i dati del processo. L'unica azione di update funzionante (cambio stato via drag) è limitata a un singolo campo. Tutti gli altri campi del detail (ore, tipologia, convivenza, note, riepilogo datore, informazioni generali) non sono editabili in pratica.
Atteso / Cosa dovrebbe succedere Tutte le modifiche fatte ai campi del detail panel devono essere salvate (al blur, al click di un eventuale "Salva", o con altro pattern coerente con il resto del backoffice — da decidere) e riflettersi sia nel DB sia nella UI (kanban, riapertura del detail).
Come riprodurre
Aprire la pagina Assunzioni.
Cliccare su una card per aprire il detail panel.
Cambiare il valore del dropdown "Stato Assunzione".
Chiudere il detail.
Verificare nella kanban: la card è ancora nella colonna originale.
Riaprire il detail della stessa card: il campo "Stato Assunzione" è tornato al valore originale.
Ripetere con altri campi (Totale ore lavorative, ecc.): stesso comportamento.
Per contro: 8. Trascinare la stessa card da una colonna all'altra nella kanban: il cambio di stato persiste correttamente.
Note
Il fatto che il drag & drop funzioni mentre la modifica via dropdown nel detail no, suggerisce due code path distinti per l'update: uno via componente kanban (funzionante), uno via form del detail (rotto). Il bug è probabilmente nel secondo, non nella logica generale di update sullo stato.
Direzione di investigazione suggerita (ipotesi non confermate): (a) la mutation/update del form non è cablata al hook che chiama l'Edge Function; (b) la chiamata parte ma non si attende il risultato e viene scartata; (c) c'è un problema di riconciliazione dello stato locale che mostra il valore vecchio anche se il nuovo è stato salvato (meno probabile, perché tu hai detto che riaprendo il dato è quello vecchio — quindi non è solo display).
Verificare se lo stesso bug si manifesta in altri detail panel del backoffice (es. Rapporti lavorativi, Lavoratori, ecc.) — potrebbe essere un pattern condiviso. In tal caso candidato per issue globale (G-XXX) o per fix unica del componente form. Da rivalutare a fine giro review.

[ASN-005] Aggiungere i campi ID rapporto INPS, Cod. Rapporto WebColf, Cod. Lavoratore WebColf nel modale Assunzioni
Tag: [MISSING] Severity: Blocker Page/Component: src/pages/Assunzioni — modale detail Effort: S (<1h)
Sintomo / Cosa succede ora Nel modale detail di un'assunzione mancano tre campi tecnici operativi:
ID rapporto INPS
Cod. Rapporto WebColf
Cod. Lavoratore WebColf
Questi sono identificatori esterni necessari per la gestione operativa della pratica di assunzione (comunicazione INPS, sincronizzazione con WebColf).
Atteso / Cosa dovrebbe succedere I tre campi devono essere presenti nel modale, editabili dall'operatore. Posizionamento da definire — possibili scelte: dentro la sezione "Contesto pratica" (accanto agli altri campi tecnici) oppure in una sezione dedicata tipo "Identificativi esterni". Da concordare in fase di implementazione.
Note
I due campi WebColf sono gli stessi presenti nel detail di Rapporti lavorativi (v. RAP-003). I nomi devono essere identici tra le due viste per coerenza: "Cod. Rapporto WebColf" e "Cod. Lavoratore WebColf".
Da confermare con Nicolò: se i campi devono essere editabili anche prima dell'effettiva assunzione (es. compilabili dall'operatore in fase preparatoria) o solo dopo che lo stato passa a "Assunzione fatta" / "Documenti assunzione inviati".
Se i tre campi non esistono ancora nello schema DB su rapporti_lavorativi o processi_matching, va aggiunta la colonna prima di esporre il campo nel modale. Da verificare lato schema.

[ASN-006] Aggiungere il campo "Tipologia contratto" nel modale Assunzioni
Tag: [MISSING] (regressione) Severity: blocker Page/Component: src/pages/Assunzioni — modale detail Effort: S (<1h)
Sintomo / Cosa succede ora Nel modale detail di un'assunzione, nella sezione "Tipologia di rapporto", è presente solo il campo "Tipologia di rapporto" (con valori CS, B, BS, A, C, ecc.). Manca completamente il campo "Tipologia contratto".
Atteso / Cosa dovrebbe succedere Aggiungere il campo "Tipologia contratto" nel modale, con i valori previsti (lo stesso set utilizzato in Airtable / nelle integrazioni esistenti — riferimento screenshot allegato).
Questo campo è bloccante per l'operatività: viene utilizzato dall'API di e-signatures per generare e stampare il contratto. Senza questo campo nel modale, non è possibile completare il flusso di assunzione fino alla firma del contratto.
Note
Funzionalità presente nell'implementazione Airtable corrente, regressione nel port a BazeOffice.
Cleanup correlato: il campo "Tipologia di rapporto" attualmente presente nel modale può essere eliminato. Era un campo legacy con scopo solo analytics, oggi non più utilizzato. Da rimuovere sia dalla UI sia eventualmente dallo schema (decisione lato SWE: se la rimozione dallo schema impatta migrazioni o dati storici, vale la pena tenere la colonna ma rimuoverla dalla UI). Da confermare con Nicolò se il cleanup va fatto contestualmente o in un issue separato.
Verificare quali altre viste / componenti di BazeOffice mostrano "Tipologia di rapporto": se è esposto altrove (es. detail Rapporti lavorativi, card kanban, ecc.) il cleanup va esteso. Probabile candidato per audit a fine giro review.
Da confermare: il valore di "Tipologia contratto" è propagato al rapporto lavorativo collegato e/o usato direttamente in fase di chiamata all'API e-signatures? Da capire chi è la sorgente di verità del valore (assunzione o rapporto) per evitare desync futuri.

[ASN-007] Aggiungere controllo "luogo residenza = luogo lavoro" e campi condizionali nei dati assunzione datore
Tag: [MISSING] (regressione) Severity: high Page/Component: src/pages/Assunzioni — modale detail, sezione "Informazioni generali" del datore Effort: M (1-4h)
Sintomo / Cosa succede ora Nel modale di detail di un'assunzione, sezione "Informazioni generali" del datore di lavoro, sono presenti i campi di residenza (Indirizzo, Civico, Località, CAP) ma manca il controllo (checkbox o toggle) "il luogo di residenza corrisponde al luogo di lavoro".
Questo controllo è invece presente nel form compilato dall'utente finale (datore) e governa la raccolta condizionale dei dati di luogo di lavoro: se "no", l'utente compila anche indirizzo, civico, CAP e provincia del luogo di lavoro (separati dalla residenza).
Nel modale operatore questi dati condizionali non sono visibili né modificabili: l'operatore non può vedere se l'utente ha indicato un luogo di lavoro distinto, né correggere quei campi se necessario.
Atteso / Cosa dovrebbe succedere Nella sezione "Informazioni generali" del datore, aggiungere:
Un controllo (checkbox/toggle) "Il luogo di residenza corrisponde al luogo di lavoro" con il valore già impostato secondo quanto compilato dall'utente nel form.
Se il controllo è impostato a "no" (luogo di lavoro diverso dalla residenza), mostrare in modo condizionale i campi del luogo di lavoro: Indirizzo, Civico, CAP, Provincia.
Il controllo e i campi condizionali devono essere editabili dall'operatore, coerentemente con il resto della sezione.
Questo comportamento si applica solo alla parte datore, non alla parte lavoratore (che non ha la stessa logica).
Come riprodurre
Aprire una card di assunzione che ha già i dati datore compilati dal form.
Scorrere fino alla sezione "Informazioni generali" del datore.
Verificare l'assenza del controllo "luogo residenza = luogo lavoro".
Verificare che, anche se l'utente nel form ha indicato un luogo di lavoro diverso dalla residenza, questi dati non sono visibili nel modale.
Note
Funzionalità presente nell'implementazione Airtable corrente, regressione nel port a BazeOffice.
Il controllo logico esiste già nel form lato utente: il valore booleano e gli eventuali dati del luogo di lavoro sono presumibilmente già salvati nel record assunzione (o in tabella collegata). Non si tratta quindi di reimplementare la logica, ma di esporre nel modale operatore lo stato già raccolto. Da verificare lato schema dove è memorizzato.
Da confermare con Nicolò:
Nome esatto del campo booleano (es. luogo_lavoro_uguale_residenza o simile) nel form/DB di riferimento.
Provincia: nel modale attuale non compare nemmeno per la residenza — verificare se va aggiunta anche lì o solo in sezione luogo di lavoro.
Asimmetria datore/lavoratore: questo controllo si applica solo al datore. La sezione lavoratore ha logica diversa (non deve avere questo controllo né i campi condizionali). Da non replicare.

Pagina Chiusure

[CHI-001] Aggiungere tre bottoni di apertura chiusura nell'header della pagina Chiusure
Tag: [MISSING] Severity: high Page/Component: src/pages/Chiusure — header pagina Effort: M (1-4h)
Sintomo / Cosa succede ora Nell'header della pagina Chiusure non sono presenti azioni per aprire una chiusura di rapporto. L'operatore non ha un punto di accesso esplicito nella UI per avviare il flusso.
Atteso / Cosa dovrebbe succedere Aggiungere nell'header della pagina tre bottoni, ciascuno per una tipologia distinta di chiusura:
Apri un licenziamento
Apri una dimissione
Apri un annullamento
Le tre tipologie hanno flussi di apertura e di gestione separati (confermato): ciascun bottone deve aprire il flusso/wizard specifico per quella tipologia.
Note
Da confermare con Nicolò:
Significato esatto delle tre tipologie nel dominio Baze. Ipotesi non confermate: licenziamento = chiusura iniziata dal datore, dimissione = chiusura iniziata dal lavoratore, annullamento = rapporto mai effettivamente attivato. Da validare prima dell'implementazione perché incide sui campi del wizard.
Se i tre flussi esistono già nell'implementazione Airtable corrente (e quindi questo è un porting) o se vanno disegnati ex novo. L'effort cambia significativamente.
Coerenza con altri pattern di apertura nella UI: stesso stile dei bottoni "Apri un ticket" (v. RAP-010) e simili. Candidato per design system globale a fine giro review.
Effort stimato M assumendo che i flussi/wizard siano già esistenti e da collegare. Se vanno costruiti ex novo, l'effort va riallocato per tipologia (L per ciascuno).

[CHI-002] Aggiungere il link al rapporto nella card "Rapporto collegato" del modale Chiusure
Tag: [BUG] Severity: medium Page/Component: src/pages/Chiusure — modale detail, card "Rapporto collegato" Effort: S (<1h)
Sintomo / Cosa succede ora Nel modale detail di una chiusura, la card "Rapporto collegato" mostra il nome del rapporto e i dati base (Tipo, Ore sett., Inizio) ma non espone alcun link per navigare al rapporto stesso. L'operatore non ha modo di aprire il dettaglio del rapporto associato dalla pagina Chiusure.
Atteso / Cosa dovrebbe succedere La card deve includere un'azione "Vai al rapporto" (link/bottone) coerente con quanto già presente nella stessa card nel modale Assunzioni (v. ASN-003, screenshot di riferimento), che apra il rapporto lavorativo collegato.
Come riprodurre
Aprire la pagina Chiusure.
Aprire una card di chiusura per visualizzare il modale detail.
Osservare la card "Rapporto collegato": manca il link "Vai al rapporto" che invece è presente nel modale Assunzioni.
Note
Il componente "card rapporto collegato" è probabilmente condiviso tra Assunzioni e Chiusure (e potenzialmente altre viste). In Assunzioni il link funziona, in Chiusure no. Direzione di investigazione suggerita (ipotesi non confermate): (a) il componente riceve correttamente i dati ma il prop link/rapporto_id non viene passato dal parent in Chiusure; (b) versione del componente diversa o forkato in Chiusure.
Da confermare con Nicolò: il problema si manifesta su tutte le chiusure, o solo su alcune (es. casi in cui il rapporto collegato non esiste / è null)? Nel secondo caso, la fix include anche la gestione del caso "nessun rapporto collegato" (es. mostrare la card disabilitata o nasconderla del tutto).
A fine giro review, valutare se questo è sintomo di un problema più ampio del componente "card rapporto collegato" da promuovere a globale (G-XXX).

[CHI-003] Rendere editabili le sezioni del modale Chiusure tramite il pattern matita → edit fields
Tag: [BUG] Severity: high Page/Component: src/pages/Chiusure — modale detail, sezioni popolate dai moduli utente Effort: M (1-4h)
Sintomo / Cosa succede ora Le sezioni del modale Chiusure che contengono dati popolati dai moduli compilati dagli utenti finali non possono essere modificate dall'operatore con il pattern previsto (icona matita che apre la modalità edit dei campi). Il comportamento attuale non è quello atteso (vedi note per dettaglio del sintomo specifico).
Atteso / Cosa dovrebbe succedere Per ogni sezione del modale Chiusure popolata da modulo utente, deve essere disponibile l'icona matita in alto a destra. Cliccandola, i campi della sezione diventano editabili (input attivi). Le modifiche devono essere salvate e persistite.
Questo perché il modale Chiusure, come quello Assunzioni, viene popolato in larga parte da moduli compilati direttamente dagli utenti finali (datore o lavoratore) e l'operatore Baze deve poter sistemare/correggere i dati raccolti.

[CHI-004] Aggiungere sezione per upload documenti di chiusura nel modale Chiusure
Tag: [MISSING] Severity: high Page/Component: src/pages/Chiusure — modale detail Effort: M (1-4h)
Sintomo / Cosa succede ora Nel modale di una chiusura è presente solo lo spazio per caricare la lettera di licenziamento o dimissione, che però rappresenta unicamente il documento di avvio della pratica di chiusura. Manca completamente la sezione per caricare i documenti di effettiva chiusura del rapporto (firmati, ricevute INPS, quietanze, eventuali liquidazioni, ecc.) che vengono generati e raccolti durante o al termine del processo di chiusura.
L'operatore non ha quindi un punto centralizzato dove archiviare questi documenti nel record di chiusura — devono essere gestiti fuori dal sistema o non vengono tracciati affatto.
Atteso / Cosa dovrebbe succedere Aggiungere nel modale Chiusure una sezione dedicata "Documenti di chiusura" (nome da confermare) con slot per upload dei documenti rilevanti. Coerente per stile con la sezione "Documenti del rapporto" già presente in Assunzioni (Accordo di lavoro, Ricevuta INPS, Delega INPS).
Note
Da definire con Nicolò:
Lista esatta dei documenti di chiusura da supportare. Ipotesi non confermate: lettera firmata/controfirmata, ricevuta INPS di cessazione, quietanza/liberatoria, documentazione di liquidazione (TFR, ferie residue), eventuali allegati legali. Necessario elenco definitivo prima dell'implementazione.
Comportamento per tipologia: i tre flussi di chiusura (licenziamento, dimissione, annullamento — v. CHI-001) richiedono gli stessi documenti o set diversi? L'annullamento di un rapporto mai partito presumibilmente ha esigenze diverse. Se cambia per tipologia, la sezione deve essere condizionata al tipo di chiusura.
Coerenza con esistente: il nuovo "spazio documenti di chiusura" è separato dall'allegato già presente per la lettera di avvio. Quest'ultimo deve restare dov'è, ma valutare se rinominarlo per chiarire che è solo l'avvio (es. "Documento di avvio chiusura" o simile) per evitare confusione operatori.

Pagina Variazioni

[VAR-001] Aggiungere bottone "Apri una variazione" con modale di creazione
Tag: [MISSING] Severity: high Page/Component: src/pages/Variazioni — header pagina + nuovo modale di creazione Effort: M (1-4h)
Sintomo / Cosa succede ora Nella pagina Variazioni manca il bottone per aprire una nuova variazione contrattuale. L'operatore non ha un punto di accesso esplicito nella UI per avviare il flusso di apertura di una variazione.
Atteso / Cosa dovrebbe succedere Aggiungere nell'header della pagina un bottone "Apri una variazione", posizionato e stilato coerentemente con gli altri bottoni "Apri un X" del backoffice (v. CHI-001 per le chiusure, RAP-010 per i ticket).
Cliccando il bottone, deve aprirsi un modale che richiede:
Selezione del rapporto di lavoro — selettore con ricerca autocomplete (per nome famiglia/lavoratore) data la dimensione della lista rapporti (~800+ record). Un dropdown semplice non è praticabile.
Descrizione della variazione — campo di testo libero (textarea) in cui l'operatore indica la variazione da effettuare.
Alla conferma, il record di variazione viene creato e collegato al rapporto selezionato.
Note
Da confermare con Nicolò:
Selettore rapporto: confermare l'autocomplete come pattern di selezione. Alternative possibili (gerarchico famiglia → rapporto) sono meno fluide ma più strutturate.
Campo descrizione: per ora textarea libera. Da valutare in fase successiva se aggiungere un dropdown "tipologia variazione" (es. orario, retribuzione, luogo di lavoro, regime di convivenza, ecc.) per strutturare meglio i dati. Se strutturato dall'inizio, l'effort sale ma la manutenzione futura è migliore.
Permessi: ogni operatore può aprire variazioni o serve un ruolo specifico? Da chiarire.

[VAR-002] Le sezioni del modale Variazioni non sono editabili tramite il pattern matita
Tag: [BUG] Severity: high Page/Component: src/pages/Variazioni — modale detail Effort: M (1-4h)
Sintomo / Cosa succede ora Nel modale di una variazione contrattuale, le sezioni che dovrebbero essere editabili tramite il pattern matita → edit fields (icona matita in alto a destra della sezione) non funzionano correttamente. L'operatore non riesce a modificare i dettagli della variazione.
Atteso / Cosa dovrebbe succedere Le sezioni del modale Variazioni devono supportare il pattern matita-editable: cliccando l'icona matita, i campi della sezione diventano editabili (input attivi); le modifiche devono essere salvate e persistite alla chiusura della modalità edit.
Coerente con il comportamento atteso di Assunzioni e Chiusure (popolate dall'operatore o derivate da moduli da rifinire).
Come riprodurre
Aprire la pagina Variazioni.
Aprire una card di variazione esistente per visualizzare il modale detail.
Cliccare sull'icona matita di una sezione editabile.
Osservare il comportamento (vedi note per ipotesi sintomo specifico).
Note
Da confermare con Nicolò il sintomo esatto, perché determina la natura della fix:
Ipotesi A: la matita è cliccabile ma non fa nulla (la modalità edit non si attiva). → bug di wiring del componente.
Ipotesi B: la matita attiva la modalità edit, i campi diventano input, ma le modifiche non vengono salvate (stesso pattern di ASN-004 sul detail Assunzioni). → bug della mutation.
Pattern ricorrente: bug simili sono stati osservati in ASN-004 (detail Assunzioni non salva) e potenzialmente CHI-003 (Chiusure, sintomo da chiarire). Se la causa radice è condivisa (componente form/edit comune), una fix unica risolve tutti e tre i ticket. Forte candidato per audit a livello globale (G-XXX) a fine giro review.
Da chiarire con Nicolò: quali sezioni del modale Variazioni devono supportare la matita. Senza un elenco preciso, c'è il rischio di lasciare fuori sezioni rilevanti o di abilitare modifica su sezioni che invece dovrebbero essere read-only (es. dati di sistema, link al rapporto).
Verificare se la creazione di una variazione (v. VAR-001) e la sua successiva modifica condividono lo stesso componente form. In caso affermativo, fix unica copre entrambi i flussi.

Pagina Cedolini

[CED-001] Indagare i cedolini con famiglia e/o lavoratore "non disponibile" nella pagina Cedolini
Tag: [BUG] Severity: high Page/Component: src/pages/Cedolini (o equivalente, sotto Payroll) — lista cedolini Effort: L (>4h) — include investigazione
Sintomo / Cosa succede ora Nella pagina Cedolini, navigando tra i mesi (es. aprile, marzo), si osservano numerosi record con etichette "Famiglia non disponibile" e/o "Lavoratore non disponibile". Le card non riportano nome del datore, nome del lavoratore o altri identificativi utili — risultano effettivamente vuote/anonime.
Non è chiaro:
Se si tratti di cedolini orfani con riferimenti a rapporti rotti/cancellati.
Se siano cedolini di rapporti reali per cui il label non viene composto correttamente (bug di rendering, simile a ASN-001 e RAP-005).
Se siano dati di seed/test mai puliti.
Se sia normale che esistano cedolini senza famiglia/lavoratore valorizzati (caso d'uso legittimo da capire).
Atteso / Cosa dovrebbe succedere Ogni cedolino visibile nella lista deve essere riconducibile a un rapporto con famiglia e lavoratore identificabili. Se esiste un caso d'uso legittimo per cedolini "anonimi" va documentato esplicitamente, altrimenti i record vanno puliti / risolti.
Come riprodurre
Aprire la pagina Cedolini.
Selezionare un mese qualsiasi (es. aprile, marzo).
Osservare la lista: numerose card mostrano "Famiglia non disponibile / Lavoratore non disponibile" senza dati identificativi.
Note
Da indagare per primo: verificare a DB cosa contengono questi record. Hanno rapporto_id valorizzato? Il rapporto collegato esiste e ha famiglia/lavoratore linked? Oppure il rapporto_id punta a record cancellati o null?
Forte sospetto di pattern condiviso con bug già aperti:
RAP-005 (rapporti fantasma con famiglia non trovata)
ASN-001 (mancato fallback sul nome anagrafico nel label)
RAP-007 (cognome lavoratore non visibile nel label)
Se la causa radice è la stessa funzione di composizione label (componente shared), una fix unica risolve tutti i casi. Da verificare durante l'investigazione di questo ticket.
Quantificare quanti sono questi cedolini sul totale: se sono pochi e isolati, è pulizia dati; se sono sistemici (es. su tutti i mesi recenti), è bug strutturale.
Una volta diagnosticato, lo scope della fix potrebbe espandere o contrarre questo ticket. Da rivalutare a quel punto.

[CED-002] Aggiungere "Chiusura rapporto" come terza opzione al campo tipo cedolino
Tag: [MISSING] Severity: high Page/Component: src/pages/Cedolini — campo tipo/categoria del cedolino Effort: S (<1h)
Sintomo / Cosa succede ora Il campo che classifica il cedolino (probabilmente chiamato "tipo cedolino" o "categoria" — nome esatto da confermare) ammette oggi solo due valori:
Regolare
Caso particolare
Atteso / Cosa dovrebbe succedere Aggiungere un terzo valore: Chiusura rapporto.
Questo serve a distinguere operativamente i cedolini emessi al termine di un rapporto (con calcoli specifici: TFR, ferie residue, ecc.) dai cedolini di un rapporto in corso che presentano anomalie (caso particolare).
Note
Da confermare con Nicolò il nome esatto del campo in DB e in UI.
Se il valore "Chiusura rapporto" deve essere assegnato manualmente dall'operatore o derivato automaticamente (es. quando esiste una chiusura associata al rapporto in quel mese), da definire. Probabilmente entrambi i casi vanno supportati ma con default sull'inferenza automatica.
Dipendenza con CED-003: una volta aggiunto il valore, va anche definito il suo accent visivo (rosso, secondo le indicazioni). I due ticket vanno implementati insieme o in sequenza.

[CED-003] Aggiungere accent visivi ai cedolini "caso particolare" e "chiusura rapporto"
Tag: [UX] Severity: medium Page/Component: src/pages/Cedolini — card cedolino in lista Effort: S (<1h)
Sintomo / Cosa succede ora I cedolini classificati come "caso particolare" non sono visivamente distinti dai cedolini regolari nella lista. L'operatore deve aprire o controllare ogni cedolino per identificare quelli che richiedono attenzione.
Atteso / Cosa dovrebbe succedere Aggiungere accent visivi ai cedolini in base al tipo:
Caso particolare → accent giallo o arancio (allerta, da verificare).
Chiusura rapporto → accent rosso (alta priorità, fine rapporto).
Regolare → nessun accent (default).
Note
Da confermare con Nicolò la forma esatta dell'accent: bordo della card, sfondo, badge/tag accanto al nome, icona indicatore. Suggerimento: badge/tag accanto al nome è il pattern più coerente con quanto già usato altrove nel backoffice (es. badge stato in Rapporti lavorativi, Assunzioni). Da decidere insieme.
Dipendenza con CED-002: il valore "Chiusura rapporto" non esiste ancora come opzione. Questo ticket è implementabile da subito per "Caso particolare" e si completa quando CED-002 è implementato.
Coerenza con design system: l'accent deve usare i token colore già definiti nel design system (warning, destructive, ecc.), non valori hardcoded. Da verificare con SWE.

[CED-004] Rendere editabili le presenze del mese nel calendario del cedolino
Tag: [BUG] Severity: high Page/Component: src/pages/Cedolini — sezione presenze / calendario presenze del cedolino Effort: L (>4h)
Sintomo / Cosa succede ora Nella sezione presenze del cedolino, il calendario delle presenze del mese non è editabile dall'operatore. Le presenze sono mostrate in sola lettura.
Atteso / Cosa dovrebbe succedere L'operatore deve poter modificare il calendario delle presenze del mese. Per ogni giorno deve essere editabile:
Ore lavorate
Tipo di evento (lavoro regolare, ferie, malattia, permesso, ecc. — set di valori da confermare)
Eventuale codice PNR (da confermare cosa intende esattamente)
Note
Il template di presenze di default (derivato dalla distribuzione ore settimanale del rapporto) deve continuare a funzionare correttamente: alla creazione del cedolino o dopo un reset (v. CED-005), il template applicato deve riflettere correttamente la distribuzione settimanale del rapporto.
Note
Da confermare con Nicolò:
Cosa intende "PNR": presumibilmente un codice/identificativo specifico di un evento di assenza (es. permesso non retribuito?) — termine non univoco, va chiarito.
Set di valori "evento": lista esatta delle tipologie di evento gestite (lavoro, ferie, malattia, permesso retribuito/non retribuito, festività, ecc.).
UX di edit: edit inline cella per cella, oppure modale per giornata, oppure bulk edit (es. seleziona più giorni e applica stesso evento)?
Comportamento atteso del template: alla creazione di un nuovo cedolino o al reset (CED-005), le ore/eventi devono essere popolati seguendo la distribuzione ore del rapporto collegato. Le modifiche manuali dell'operatore devono persistere e non essere sovrascritte da successive ricariche o sync.
Verificare se modificare le presenze deve ricalcolare automaticamente i valori derivati del cedolino (es. totale ore, importi, contributi). Se sì, definire quando ricalcolare (al volo / alla chiusura / esplicito).

[CED-005] Aggiungere bottone "Reset presenze del mese" nella sezione presenze del cedolino
Tag: [MISSING] Severity: medium Page/Component: src/pages/Cedolini — sezione presenze del cedolino Effort: S (<1h)
Sintomo / Cosa succede ora Nella sezione presenze del cedolino non è presente un bottone per resettare le presenze del mese al template di default.
Atteso / Cosa dovrebbe succedere Aggiungere un bottone "Reset presenze" (o "Ripristina template") che, dietro conferma, riporta il calendario delle presenze del mese al template derivato dalla distribuzione ore settimanale del rapporto, sovrascrivendo eventuali modifiche manuali.
Note
Azione distruttiva: deve richiedere conferma esplicita (modale di conferma con messaggio chiaro tipo "Vuoi davvero ripristinare le presenze al template di default? Le modifiche manuali andranno perse.").
Dipendenza con CED-004: il reset ha senso solo se le presenze sono effettivamente editabili. Se CED-004 non è ancora implementato, il bottone non serve a nulla.
Da confermare con Nicolò: il reset si applica solo al mese corrente del cedolino o c'è la necessità di reset più granulare (es. singolo giorno, range di giorni)?

[CED-006] Esporre link URL del cedolino nel detail, modificabile dall'operatore
Tag: [MISSING] Severity: high Page/Component: src/pages/Cedolini — detail cedolino Effort: S (<1h)
Sintomo / Cosa succede ora Il link URL del cedolino (oggi un link Google Drive che punta al file storato al momento della creazione automatica) non è visibile né modificabile nel detail cedolino.
Atteso / Cosa dovrebbe succedere Esporre nel detail cedolino il campo URL cedolino come campo modificabile dall'operatore.
Questo serve per il caso in cui la creazione del cedolino sia manuale anziché automatica: in quel caso il link non viene generato dal flusso automatico, e l'operatore deve poter inserirlo a posteriori incollandolo direttamente.
Quando la creazione è automatica, il campo è già popolato e l'operatore non deve toccarlo (ma resta visibile).
Note
Comportamento del campo: input testo libero (o specificamente URL) editabile in qualsiasi momento.
Posizionamento: nel detail cedolino, ragionevolmente vicino agli altri metadata del file (data emissione, mese di riferimento, ecc.).
Validazione: opzionale, può fare check che sia un URL valido. Bonus se aggiunge un'icona "apri link" accanto.
Da confermare con Nicolò: il link è univoco per cedolino, oppure può puntare a versioni multiple (es. cedolino + variazioni)? Se più di uno, valutare campo array. Probabilmente è uno solo.

[CED-007] Mostrare il codice lavoratore WebColf nei dettagli del rapporto del cedolino
Tag: [MISSING] Severity: medium Page/Component: src/pages/Cedolini — sezione dettagli rapporto del cedolino Effort: S (<1h)
Sintomo / Cosa succede ora Nel detail cedolino, nella sezione che mostra i dettagli del rapporto collegato, manca il codice lavoratore WebColf. L'operatore non vede questo identificativo necessario per la riconciliazione con il sistema WebColf.
Atteso / Cosa dovrebbe succedere Esporre nella sezione dettagli rapporto del cedolino il campo Cod. Lavoratore WebColf, in lettura (sorgente di verità: il rapporto collegato).
Note
Coerenza terminologica con RAP-003 e ASN-005: il campo si chiama "Cod. Lavoratore WebColf" (non "codice dipendente" o varianti).
Da confermare con Nicolò:
Se va mostrato anche il Cod. Rapporto WebColf insieme al Cod. Lavoratore (probabile, data la coerenza con altre viste). Hai citato solo il lavoratore — voluto o refuso?
Se va incluso anche ID rapporto INPS (terzo identificativo segnalato in ASN-005) per completezza.
Visibilità in sola lettura: il campo si edita da Rapporti lavorativi (RAP-003), non da Cedolini.

[CED-008] Mostrare la sezione Pagamento del cedolino anche prima dell'effettivo pagamento
Tag: [BUG] Severity: high Page/Component: src/pages/Cedolini — sezione "Pagamento" nel detail cedolino Effort: L (>4h) — include allineamento tecnico col team
Sintomo / Cosa succede ora Nella sezione "Pagamento" del detail cedolino, i dati (Transazione, Stato pagamento, Importo, Application fee, Data pagamento, ecc.) compaiono solo quando il pagamento è stato effettivamente eseguito con successo (stato succeeded). Quando il cedolino è stato emesso ma il pagamento non è ancora stato effettuato, la sezione risulta vuota o priva di informazioni utili.
Atteso / Cosa dovrebbe succedere La sezione "Pagamento" deve mostrare i dati associati al cedolino fin da quando esiste una pratica di pagamento attiva, indipendentemente dallo stato di esecuzione. In particolare:
Link di pagamento Stripe (URL generato per quel cedolino, condivisibile con l'utente).
Importo cedolino (già presente).
Application fee / fee Baze.
Eventuale ID associato alla pratica di pagamento (lato Stripe o webhook).
Stato pagamento corrente (es. pending, succeeded, failed, ecc. — set effettivo da definire con il team tech in base allo schema attuale).
Questi dati servono operativamente all'operatore Baze per:
Verificare che la fee sia corretta prima del pagamento.
Recuperare il link Stripe per condividerlo o riproporlo all'utente.
Avere visibilità completa del ciclo di vita del pagamento, non solo dell'esito finale.
Note
Domande aperte da risolvere col team tech prima dell'implementazione (Nicolò non ha visibilità diretta sulla struttura dati attuale post-refactor):
Com'è organizzato oggi lo schema relativo al pagamento del cedolino? Esistono ancora due entità distinte (es. pratica_pagamento + transazione) come nell'implementazione precedente, oppure sono state unificate?
Il link di pagamento Stripe è generato a monte (al momento dell'invio del cedolino tramite webhook) e salvato sulla pratica di pagamento, oppure è on-demand?
Il record che oggi alimenta la sezione "Pagamento" punta solo alla transazione (che esiste solo a pagamento avvenuto), o c'è una pratica/intent di pagamento sempre presente da quando il cedolino è emesso?
Contesto storico: nell'implementazione precedente esistevano due tabelle distinte — una "pratica pagamento" sostanzialmente vuota usata come anchor di lookup, e una "transazione" che si popolava al successo del pagamento. Le due erano linked. Verificare se questa struttura è stata mantenuta, modificata o semplificata nel nuovo schema.
Punto da chiarire a livello prodotto: i dati visibili devono essere editabili dall'operatore o solo in lettura? Probabilmente lettura per la maggior parte (vengono dal webhook), ma il link Stripe potrebbe essere utile poterlo manualmente sostituire/aggiornare in casi eccezionali — da decidere.
Una volta chiarita la struttura tecnica con il SWE, potrebbe rendersi necessario splittare questo ticket in:
Un sottoissue di modifica schema/query (se serve esporre nuovi campi).
Un sottoissue di rendering UI (mostrare i dati nuovi nella sezione esistente).
Eventuale terzo sottoissue di gestione stati intermedi del pagamento (se mancano).

[CED-009] Aggiungere dialog di conferma ai bottoni "Chiedi dati" e "Fatturare" nella sezione Pagamento
Tag: [UX] Severity: high Page/Component: src/pages/Cedolini — sezione "Pagamento" nel detail cedolino Effort: S (<1h)
Sintomo / Cosa succede ora Nella sezione "Pagamento" del detail cedolino, i bottoni "Chiedi dati" e "Fatturare" triggerano direttamente l'automazione/azione corrispondente al click, senza alcun passaggio di conferma intermedio. L'operatore può accidentalmente avviare un'azione irreversibile (invio di una richiesta dati al cliente, emissione di una fattura) con un click singolo.
Atteso / Cosa dovrebbe succedere Entrambi i bottoni devono mostrare un dialog di conferma prima di eseguire l'azione, coerente con il pattern già usato in altre azioni del backoffice. Il dialog deve esplicitare l'azione che sta per essere eseguita e le sue conseguenze, ad esempio:
"Fatturare" → "Stai per emettere una fattura per questo cedolino. Vuoi procedere?"
"Chiedi dati" → "Stai per inviare una richiesta di dati al cliente. Vuoi procedere?"
Solo dopo la conferma esplicita ("Conferma" / "Annulla") l'azione viene eseguita.
Note
Pattern coerente con altri dialog di conferma già presenti nel backoffice. Da usare lo stesso componente shadcn/ui (AlertDialog) per consistenza.
Da confermare con Nicolò il wording esatto dei messaggi di conferma e se ciascun bottone richiede un messaggio diverso o se un wording generico è sufficiente.
Da verificare se altri bottoni in BazeOffice triggerano azioni irreversibili senza conferma — pattern da auditare a livello globale (G-XXX) a fine giro review. Probabili candidati: invio email automatiche, creazione documenti, trigger webhook, ecc.
Il dialog deve essere chiaramente bloccante (non un semplice toast informativo): l'operatore deve agire esplicitamente prima che l'azione parta.

Pagina Contributi INPS

Nessun Issue

Pagina Ticket

[TKT-001] Permettere di collegare manualmente un rapporto lavorativo a un ticket esistente
Tag: [MISSING] Severity: high Page/Component: src/pages/Customer Support — detail ticket Effort: M (1-4h)
Sintomo / Cosa succede ora Nel detail di un ticket non è presente un meccanismo per collegare manualmente il ticket a un rapporto lavorativo, qualora il collegamento non sia stato fatto in automatico al momento della creazione.
Questo è un problema operativamente: alcuni ticket vengono creati automaticamente dal sistema proprio nei casi in cui il rapporto lavorativo di riferimento non è stato identificato in autonomia dal sistema (es. allegato ricevuto via email/canale che non matcha automaticamente a un rapporto). In questi casi il ticket descrive esplicitamente "guarda l'allegato e collega manualmente al rapporto giusto" — ma l'operatore oggi non ha lo strumento UI per farlo.
Atteso / Cosa dovrebbe succedere Nel detail ticket deve essere presente un'azione (es. campo "Rapporto collegato" con bottone di selezione) che permetta:
Se nessun rapporto è collegato → bottone "Collega rapporto" che apre un selettore.
Se un rapporto è già collegato → mostrare il rapporto con possibilità di sostituirlo o rimuovere il collegamento.
Il selettore deve essere un autocomplete con ricerca per nome famiglia/lavoratore (stesso pattern di VAR-001, dove lo abbiamo definito per la selezione del rapporto in fase di apertura variazione). La lista rapporti è di ~800+ record, un dropdown semplice non è praticabile.
Note
Caso d'uso principale: ticket auto-generati dal sistema quando il matching automatico fallisce. L'operatore apre il ticket, legge la descrizione, identifica il rapporto corretto (es. dal contenuto dell'allegato) e fa il collegamento manuale.
Coerenza con altri pattern di selezione rapporto:
VAR-001 (modale apri variazione): autocomplete rapporto.
Se più punti del backoffice richiedono selezione rapporto via autocomplete, candidato a componente shared a fine giro review (G-XXX).
Da confermare con Nicolò:
Posizionamento esatto del campo "Rapporto collegato" nel detail ticket.
Comportamento alla sostituzione di un rapporto già collegato: serve conferma esplicita o avviene direttamente? Probabilmente serve conferma se l'operatore sta sovrascrivendo un collegamento già fatto.
Effetti collaterali del collegamento: una volta collegato il rapporto, l'allegato del ticket va automaticamente associato/copiato anche nel detail del rapporto (es. nei documenti del rapporto), oppure resta solo nel ticket?
