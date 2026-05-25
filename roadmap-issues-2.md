# Roadmap fix — ISSUES (2)

Fonte: `~/Downloads/ISSUES (2).docx`.
Solo gli issue **aperti**. Le 60 issue già con ✅ nel file sorgente sono escluse.

## Legenda priorità

- 🟥 **Bloccante** — blocca un flusso operativo
- 🟧 **Media** — fastidio/missing feature con impatto quotidiano
- 🟨 **Bassa** — UX/refinement
- ⬜ **Bassissima** — nice to have

## Conteggi

- 🟥 Bloccanti: **1**
- 🟧 Medie: **6**
- 🟨 Basse: **22**
- ⬜ Bassissime: **5**
- **Totale aperte: 34**

---

## 🟥 Bloccante (1)

- [ ] **GT1-015** — `provincia` su card Gate 1 incoerente (sigla "MI" vs nome "Milano"). Il filtro provincia non aggrega entrambi i formati → recruiter non vede il pool completo. *Fix dati: normalizzare provincia.*

---

## 🟧 Media (6)

- [ ] **G-012** — Back-navigation contestuale assente tra detail panel diversi (stessa tab).
- [ ] **RIC-062** — Modalità colloquio "Videocolloquio": il campo "Link videocall" (già generato a backend) non è renderizzato in UI.
- [ ] **RIC-063** — Filtro recruiter nella Pipeline Ricerche deve essere preimpostato sull'utente loggato.
- [ ] **ASS-011** — Campo "Luogo" in Assegnazione sempre vuoto: non legge il quartiere compilato nella Sales Pipeline.
- [ ] **ASS-012** — Aggiungere le disponibilità per colloqui visibili nel detail panel della pagina Assegnazione.
- [ ] **RAP-027** — ID rapporto lavorativo non visibile nel detail Rapporti.

---

## 🟨 Bassa priorità (22)

### Globali (1)
- [ ] **G-009** — Chiudere modale con sezione in modalità edit lascia "salvataggio automatico" bloccato → interferisce con update successivi (rollback assegnazione recruiter).

### CRM (1)
- [ ] **CRM-028** — Mostrare tentativi di chiamata senza risposta anche nella colonna "HOT - No-show" della Sales Pipeline (stessa logica di CRM-004).

### Prove (1)
- [ ] **PRV-003** — Card kanban "Check-in programmato" (Gestione Prove) non mostrano la data del check-in.

### Ricerche (12) — concentrazione più alta
- [ ] **RIC-048** — Mostrare recruiter assegnato sulle card kanban Ricerche.
- [ ] **RIC-050** — "Riassunto esperienze AI" nel detail lavoratore: campo non modificabile (read-only nonostante l'input).
- [ ] **RIC-052** — "Tempo di viaggio dichiarato" mostra stringa ambigua ("60 min per 5 | 5g a settimana").
- [ ] **RIC-054** — Aggiungere campo derivato "Avviso" (stato + countdown deadline) sulle card Pipeline Ricerche e header detail.
- [ ] **RIC-057** — Aggiungere campo "Indirizzo di prenotazione prova/colloquio" (modificabile) nella colonna sinistra del detail Ricerca, distinto dall'indirizzo iniziale del sales.
- [ ] **RIC-059** — Spostare "Colloquio famiglia lavoratore" come prima sezione della scheda colloquio (oggi in fondo).
- [ ] **RIC-060** — Aggiungere select "Modalità colloquio" (In presenza / Videocolloquio) nella sezione "Colloquio famiglia lavoratore".
- [ ] **RIC-064** — Bottone "Apri in Google Maps" nella sezione Travel Time (directions lavoratore↔famiglia).
- [ ] **RIC-065** — Card "ricerche coinvolte" del lavoratore: sostituire disponibilità originale della famiglia con quella registrata dal recruiter in scheda colloquio.
- [ ] **RIC-068** — Triplicare altezza textbox "Crea feedback Baze" nella scheda colloquio (min 12 righe).
- [ ] **RIC-069** — Bottone "Rigenera" per descrizione personale del lavoratore (header scheda colloquio + pagine Ricerca/Gate).

### Lavoratori (3)
- [ ] **LAV-021** — Riposizionare "Ricerche coinvolte" come prima sezione del detail lavoratore (sopra "Indirizzo").
- [ ] **LAV-025** — Bottone "copia link" referral nell'interfaccia lavoratore + stesso link nell'area privata lavoratore.
- [ ] **LAV-026** — Click su foto profilo lavoratore deve aprire la foto in modale ingrandito.

### Rapporti (4)
- [ ] **RAP-018** — Bottone "Apri URL origine" (sezione "Preventivo collegato") porta a 404.
- [ ] **RAP-022** — Sezione Cedolini: mancano le stelline del feedback cliente.
- [ ] **RAP-023** — Sezione Cedolini: manca campo "caso particolare".
- [ ] **RAP-026** — Header detail Rapporto: mancano link copiabili (1) presenze del mese alla webapp (2) accesso area privata del rapporto.

### Assunzioni (1)
- [ ] **ASN-016** — Skeleton/spinner mancante sulla sezione "Documenti del rapporto" del detail Assunzione (~4s di latenza fa sembrare la pratica vuota).

---

## ⬜ Bassissima (5)

- [ ] **REA-001** — Pagina Riattivazioni: aggiungere filtro per "data di fine rapporto".
- [ ] **RIC-066** — Tooltip helper al hover sui nomi troncati nelle card Pipeline Ricerche.
- [ ] **RIC-067** — Modale "Aggiungi lavoratore" a ricerca: rendere lo stato selezionabile (Prospetto / Invitato a colloquio / Da colloquiare), oggi hardcoded a "Prospetto".
- [ ] **ASS-010** — Email della lead nel detail panel di Assegnazione.
- [ ] **RAP-025** — Bottone "Apri una variazione" nella sezione Variazioni contrattuali del detail Rapporti.

---

## Sequenza consigliata

1. **GT1-015** (sblocco recruiter su Gate 1 — fix dati, probabilmente quick).
2. **🟧 medie** ad alto rapporto valore/effort: ASS-011, RIC-062, RIC-063 (default sensato per ogni recruiter), RAP-027.
3. **🟧 G-012** e **ASS-012** insieme se si tocca la navigation/detail panel.
4. Cluster **RIC-*** in batch (sono tutte sul detail candidatura/scheda colloquio → minimizza context switch).
5. Cluster **RAP-022/023/026** (Cedolini + header detail Rapporti).
6. Polishing finale: bassissime.
