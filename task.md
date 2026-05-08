# Task QA BazeOffice Beta

## Ricerche

### ✅ [QA-RIC-001] Mostrare luogo di lavoro nelle ricerche attive
**Urgenza:** alta  
**Fonte:** Giulia  
**Pagina/area:** Ricerche attive  

**Problema:** Per le ricerche Clercico e Savini non appare il luogo di lavoro.

**Atteso:** La sezione luogo di lavoro deve mostrare i dati disponibili della richiesta/famiglia, inclusi provincia, CAP, quartiere e indirizzo completo quando presenti.

---

### ✅ [QA-RIC-002] Spostare eta e sesso lavoratore fuori dalla sezione Famiglia
**Urgenza:** bassa  
**Fonte:** Giulia  
**Pagina/area:** Ricerche attive, sezione Famiglia  

**Problema:** Nella sezione Famiglia compaiono informazioni relative al lavoratore, come eta e sesso.

**Atteso:** Le informazioni sul lavoratore devono essere spostate in una sezione piu coerente, lasciando nella scheda Famiglia solo dati relativi alla famiglia/richiesta.

---

### ✅ [QA-RIC-003] Gestire scroll orizzontale nella sezione lavoratori della ricerca
**Urgenza:** media  
**Fonte:** Giulia  
**Pagina/area:** Ricerche attive, sezione Lavoratori per questa ricerca  

**Problema:** In basso non e presente una barra per spostare la visuale da destra a sinistra. Il problema si risolve riducendo lo zoom, ma la UI dovrebbe gestirlo correttamente.

**Atteso:** La sezione deve permettere la navigazione orizzontale dei contenuti senza dover modificare lo zoom del browser.

---

### ✅ [QA-RIC-004] Mostrare indirizzo lavoratrice nel travel time
**Urgenza:** alta  
**Fonte:** Giulia  
**Pagina/area:** Ricerche attive, profilo lavoratore, Travel time  

**Problema:** Nel blocco Travel time non risulta l'indirizzo della lavoratrice, anche se presente su Airtable/DB.

**Atteso:** Il Travel time deve mostrare correttamente l'indirizzo lavoratore e l'indirizzo famiglia quando disponibili.

---

### ❌ [QA-RIC-005] Rendere piu stretta o ridimensionabile la Scheda colloquio
**Urgenza:** media  
**Fonte:** Giulia  
**Pagina/area:** Ricerche attive, profilo lavoratore  

**Problema:** La sezione Scheda colloquio occupa troppo spazio e lascia poco spazio alle informazioni del lavoratore sulla destra.

**Atteso:** La UI deve dare piu spazio alle informazioni lavoratore, oppure permettere al recruiter di regolare la larghezza delle aree.

---

### ✅ [QA-RIC-006] Mostrare numero di telefono lavoratore nel profilo
**Urgenza:** alta  
**Fonte:** Giulia  
**Pagina/area:** Ricerche attive, profilo lavoratore  

**Problema:** Nel profilo lavoratore non e presente il numero di telefono nel punto in cui il recruiter si aspetta di trovarlo.

**Atteso:** Il numero di telefono deve essere visibile nella scheda/profilo lavoratore usata durante la ricerca.

---

### [QA-RIC-007] Mostrare timing colloqui e selezione inviata
**Urgenza:** alta  
**Fonte:** Sabrina  
**Pagina/area:** Ricerche  

**Problema:** Non viene mostrato da quanto tempo i colloqui sono finiti o quando sara l'ultimo colloquio. Inoltre nello stato selezione inviata non sono presenti record, ma dovrebbe essere visibile da quanto tempo la selezione e stata inviata.

**Atteso:** La pagina Ricerche deve mostrare informazioni temporali operative per colloqui, ultimo colloquio e selezione inviata.

---

### [QA-RIC-008] Mostrare link area privata e codice OTP nella scheda famiglia
**Urgenza:** media  
**Fonte:** Sabrina  
**Pagina/area:** Ricerche, scheda Famiglia  

**Problema:** Nella scheda famiglia non sono riportati il link dell'area privata e il codice OTP di accesso.

**Atteso:** Link area privata e codice OTP devono essere visibili nella scheda famiglia quando disponibili.

---

### [QA-RIC-009] Permettere di far ripartire una ricerca
**Urgenza:** alta  
**Fonte:** Sabrina  
**Pagina/area:** Ricerche  

**Problema:** Quando una ricerca deve ripartire, non e possibile cambiare deadline, togliere assegnazione, vedere/togliere il recruiter e riportare la ricerca allo stato da assegnare.

**Atteso:** Deve essere possibile gestire la riapertura della ricerca modificando deadline, assegnazione, recruiter e stato.

---

### [QA-RIC-010] Mostrare data colloquio/prova nella scheda lavoratore
**Urgenza:** alta  
**Fonte:** Sabrina  
**Pagina/area:** Ricerche, fase colloqui/prova  

**Problema:** Nella scheda lavoratore non e visibile la data del colloquio o della prova.

**Atteso:** La scheda lavoratore deve mostrare la data del colloquio/prova quando presente.

---

## Lavoratori

### ✅ [QA-LAV-001] Verificare/importare IBAN lavoratori
**Urgenza:** non indicata  
**Fonte:** Ivana  
**Pagina/area:** Lavoratori  

**Problema:** Gli IBAN dei lavoratori non risultano importati/visibili.

**Atteso:** Gli IBAN devono essere presenti e visibili nei dati amministrativi del lavoratore, se disponibili.

---

### [QA-LAV-002] Verificare ricerca lavoratrici recenti in Gate 1 e Cerca lavoratori
**Urgenza:** media  
**Fonte:** Maria Francesca  
**Pagina/area:** Gate 1, Cerca lavoratori  

**Problema:** Alcune lavoratrici recenti non vengono trovate:
- lavoratrice iscritta il 25 aprile;
- lavoratrice iscritta in giornata, 04/05/2026.

**Atteso:** Le lavoratrici recenti devono essere ricercabili e comparire nelle viste corrette se rispettano i criteri di Gate 1/Cerca lavoratori.

---

### [QA-LAV-003] Rendere piu comprensibile la disponibilita lavoratore
**Urgenza:** bassa  
**Fonte:** Maria Francesca  
**Pagina/area:** Ricerca lavoratrici, disponibilita  

**Problema:** La disponibilita non e di immediata comprensione per chi la legge.

**Atteso:** La visualizzazione della disponibilita deve essere piu chiara e leggibile per gli operatori.

---

## Assunzioni

### [QA-ASN-001] Risolvere card anonime negli stage iniziali
**Urgenza:** non indicata  
**Fonte:** Ivana  
**Pagina/area:** Gestione contrattuale > Assunzioni  

**Problema:** I rapporti risultano corretti dallo stage "Documenti assunzione inviati", mentre negli stage precedenti e tutto anonimo.

**Atteso:** Le card degli stage precedenti devono mostrare correttamente famiglia/lavoratore e dati identificativi disponibili.

---

### [QA-ASN-002] Collegare preventivo accettato all'assunzione
**Urgenza:** alta  
**Fonte:** Sabrina  
**Pagina/area:** Assunzioni  

**Problema:** Nell'assunzione non e presente il collegamento con il preventivo accettato.

**Atteso:** La pratica di assunzione deve mostrare il collegamento al preventivo accettato quando disponibile.

---

## Sales Pipeline

### [QA-CRM-001] Mostrare mail preventivo accettato e permettere modifica fee
**Urgenza:** media  
**Fonte:** Sabrina  
**Pagina/area:** Sales pipeline  

**Problema:** Si vede il flag di preventivo accettato, ma non e possibile vedere la mail associata ne modificare la fee per scontistiche/modifiche.

**Atteso:** La pipeline deve permettere di vedere la mail associata al preventivo accettato e modificare la fee quando necessario.

---

### [QA-CRM-002] Mostrare indirizzo Google Maps nel luogo di lavoro
**Urgenza:** media  
**Fonte:** Sabrina  
**Pagina/area:** Sales pipeline, luogo di lavoro  

**Problema:** Nel luogo di lavoro non e presente l'indirizzo formattato da Google Maps.

**Atteso:** La sezione luogo di lavoro deve mostrare l'indirizzo formattato Google Maps quando disponibile.

---

## Rapporti lavorativi

### [QA-RAP-001] Mostrare ID Stripe account e IBAN lavoratore
**Urgenza:** alta  
**Fonte:** Sabrina  
**Pagina/area:** Rapporti lavorativi  

**Problema:** Nei rapporti lavorativi non sono presenti ID Stripe account e IBAN lavoratore.

**Atteso:** La pagina/modale rapporto lavorativo deve mostrare ID Stripe account e IBAN del lavoratore quando disponibili.
