# Piano di Stabilizzazione — BazeOffice

> **Da:** Christian (CTO frazionale) · **A:** Lisandro, Nicolò · **Data:** 2026-06-15
>
> **Obiettivo del mese:** trasformare una codebase in produzione ma instabile in
> una base **sicura da modificare**. L'ordine non è negoziabile: **prima la rete di
> sicurezza (test), poi la struttura, poi il refactoring**. Si lavora in produzione,
> quindi ogni passo deve poter essere fatto senza rompere ciò che funziona.

Questo documento è un **piano operativo da eseguire con l'AI**. Leggilo, capiscilo,
e rimandami una **proposta di implementazione** (vedi §8). Non serve che tu sia
esperto di frontend o di testing: il piano ti guida, e l'AI esegue — ma **tu devi
capire cosa sta facendo**, non fidarti a scatola chiusa.

---

## 1. Principio guida

Tre regole che valgono per tutto il mese:

1. **Net-first.** Non si tocca un file senza prima averne fissato il comportamento
   con dei test. I test sono i semafori verdi che ci dicono "il refactoring non ha
   rotto niente".
2. **Un file alla volta.** Niente big-bang. Si caratterizza un file, lo si spezza,
   la suite resta verde, si passa al prossimo. Mai migrazioni di massa.
3. **Compounding.** Ogni task lascia dietro di sé **test + un documento di learning**.
   Così il task successivo — e l'AI — partono avvantaggiati invece che da zero.
   Questo è il cuore del metodo (§3).

La priorità della produzione vince sempre: se c'è un bug in produzione ci si ferma,
si fa l'hotfix da `main`, e si torna al refactoring.

---

## 2. Stato attuale (baseline 2026-06-15)

- React 19 + Vite + TypeScript + Supabase + TanStack Query. ~85k LOC. Dominio HR/CRM.
- **73 test verdi** su 21 file. Infra di test già buona (Vitest + happy-dom +
  Testing Library), gate pre-push via lefthook (`test` + `tsc` + `lint`).
- I problemi veri, in ordine di rischio:
  - **`src/lib/anagrafiche-api.ts` (1.736 righe)** — il data layer monolitico.
    Tutto passa di qui, mescola trasformazioni pure e chiamate Supabase.
  - **Hook giganti** — `use-crm-pipeline-preview` (2.007), `use-selected-worker-editor`
    (1.137), `use-ricerca-workers-pipeline` (1.023), i vari `*-board`.
  - **Componenti giganti** — `gate1-view` (3.288), `ricerca-workers-pipeline-view`
    (2.743), `lavoratori-cerca-view` (2.508), `assunzioni-detail-sheet` (2.394).
  - **DB con ~370 campi**, di cui ~20% utili (resto: lookup vecchi, campi temporanei,
    nomenclatura confusa). → si collega alla Fase 2, vedi nota sugli **adapter**.

Esiste già `docs/testing-strategy.md`: è la spina dorsale della Fase 1. Questo piano
la ingloba e aggiunge struttura (Fase 2) e metodo di lavoro con l'AI (§3).

---

## 3. Come lavoriamo con l'AI — il "compounding engineer"

Usa l'AI, **senza problemi** — ma in modo che ogni intervento renda il prossimo più
facile. Concretamente, per **ogni task** (un set di test, lo split di un file, un
modulo) segui questo loop usando le skill del plugin **compound-engineering**:

| Passo | Skill | Cosa fa |
| --- | --- | --- |
| 1. Pianifica | `/ce-plan` | Genera un piano dettagliato del task prima di scrivere codice. |
| 2. Esegui | `/ce-work` | Implementa il piano mantenendo la qualità, finisce la feature. |
| 3. Rivedi | `/ce-code-review` | Review multi-agente (correttezza, test, manutenibilità) prima della PR. |
| 4. Capitalizza | `/ce-compound` | Documenta il problema risolto in `docs/solutions/` → la conoscenza si accumula. |
| 5. Spedisci | `/ce-commit-push-pr` | Commit + push + PR con descrizione What/Why/How/Testing. |

Per i bug: `/ce-debug` (trova la causa radice, non mette una pezza). Per pulire il
codice dopo un'implementazione: `/ce-simplify-code`.

**Perché "compounding".** `/ce-compound` scrive in `docs/solutions/` cosa hai
imparato (il bug, la decisione, il pattern). Prima di ogni nuovo task l'AI rilegge
quei documenti: in pratica **insegni all'AI il dominio di Baze una volta sola**, e
da lì in poi parte già informata. È il contrario del lavoro "in black box" che ha
generato il debito attuale.

> ⚠️ **Regola d'oro (richiesta esplicita):** controlla **tutto** quello che produce
> l'AI. L'AI spesso scrive test che *dichiarano* che una cosa funziona senza
> *testarla* davvero — è l'esatto opposto di ciò che ci serve. Se non capisci un
> test, non è pronto. Meglio perderci tempo che fare danni.

---

## 4. Fase 0 — Setup (giorno 1, blocca tutto il resto)

1. **Coverage provider** — oggi `vitest.config.ts` dichiara `coverage.include` ma il
   provider non è installato:
   ```bash
   npm i -D @vitest/coverage-v8
   ```
   Aggiungi a `package.json`: `"coverage": "vitest run --coverage"`.
   La coverage ci serve come **mappa** (quali file-target sono scoperti), **non come
   numero da raggiungere**.
2. **AGENTS.md** — stampiamo gli standard di ingegneria nel repo così l'AI sa dove
   va cosa. Lo genero io con la skill `standards-agents-md` e te lo committo: diventa
   il file che ogni agente legge all'inizio.
3. **Branching & PR** (allineato a quanto detto in call):
   - `main` = produzione (protetto, nessun push diretto), `staging`, `dev`.
   - Si lavora su `dev`. Deploy in produzione **solo via PR** verso `main` (il merge
     = deploy manuale esplicito). Hotfix: branch da `main` → `main` → portato in `dev`.
   - Conventional commits (`feat`/`fix`/`refactor`/`test`/`docs`/`chore`),
     PR < ~400 righe, una PR = una cosa sola. **Nessuna co-autoria AI** nei commit.

**Done:** `npm run coverage` produce un report; AGENTS.md committato; `main` protetto.

---

## 5. Fase 1 — Batteria di test (≈ settimana 1)

Segui in dettaglio **`docs/testing-strategy.md`**. Qui il riassunto operativo, in
ordine di ROI:

- **Tier 1 — funzioni pure in `lib/`** (cheap, deterministico, zero mock):
  `geo-utils`, `datetime`, `availability-functions`, `lookup-color-styles`,
  `province-italiane`, `search-utils`, `lib/ricerca/*`, `lib/lavoratori/*`.
  Pattern: `*.test.ts` table-driven, input→output. Copertura gratis dove è facile
  rompere in un refactoring.
- **Target A — rete sul data layer (il pezzo a più alto rischio):**
  - Le **trasformazioni pure** dentro `anagrafiche-api.ts` (row mapper, shaper,
    validator) → unit test che fissano la forma esatta dell'output.
  - Il cluster **draft / autosave / realtime** (`use-debounced-save`,
    `use-auto-save-form-fields`, `use-realtime-board-sync`,
    `use-selected-worker-editor`) → caratterizza il comportamento **prima** di
    toccarlo: timing del debounce (fake timers), echo-suppression, resync al cambio
    identità, no-save-on-unmount. Costruisci sui test già esistenti
    (`draft-resync-tier2`, `key-unmount-pattern`).
- **Target B — caratterizzazione dei file giganti, *just-in-time*:** solo sul file
  che stai per spezzare. Hook → test black-box con `renderHookWithQueryClient`,
  data layer mockato al confine del modulo. Componenti → integration test con
  `renderWithProviders` + `user-event`, si asserisce il **comportamento visibile**.
  **Mai snapshot del DOM.**

**Done:** ogni funzione pura di `lib/` coperta; ogni comportamento del cluster
realtime ha un test che fallisce-senza-il-fix; il file-target di turno è
caratterizzato prima dello split.

---

## 6. Fase 2 — Struttura del repo secondo gli standard (≈ settimana 2)

Oggi la logica è spalmata su `components/<dominio>/` (view giganti), `hooks/` (hook
giganti) e un `anagrafiche-api.ts` che fa da service layer per tutto. L'AI — come
una persona nuova — non sa "dove va cosa". Sistemiamo la struttura seguendo gli
**standard di ingegneria** (skill `/standards`).

### Struttura target — un dominio = un modulo

Baze è un'app frontend sopra Supabase: nessun DB locale lato app, quindi si usa la
**variante API-client** dell'anatomia dei moduli. Supabase gioca il ruolo di "fonte
dati", isolata in un solo file per modulo:

```
src/modules/<dominio>/
├── index.ts                # unica superficie pubblica del modulo
├── <dominio>.api.ts        # UNICO file che chiama Supabase per questo dominio (interno, mai esportato)
├── <dominio>.adapters.ts   # normalizza le righe Supabase → tipi di dominio (PURO)
├── <dominio>.types.ts      # tipi di dominio
├── <dominio>.queries.ts    # wrapper TanStack useQuery
├── <dominio>.mutations.ts  # wrapper TanStack useMutation
├── <dominio>.utils.ts      # helper puri
├── components/             # le view del dominio (qui spezziamo i file giganti)
├── hooks/                  # gli hook del dominio
└── __tests__/
```

Le due regole portanti: **il file `.api.ts` non viene mai esportato** (si accede al
dominio solo da `index.ts`, via queries/mutations); **gli adapter sono l'unico posto
dove compaiono i nomi-campo del DB**. Tutto il resto dell'app vede tipi puliti.

Fuori dai moduli restano: `src/components/ui/` (shadcn), `src/shared/` (client
Supabase, auth, infra realtime, logging), `src/lib/` (solo utility pure trasversali).

### Mappatura dall'attuale al target

| Oggi | Diventa |
| --- | --- |
| `lib/anagrafiche-api.ts` (monolite) | sciolto in `modules/<dominio>/<dominio>.api.ts` per dominio |
| `components/lavoratori/*`, `components/ricerca/*`, `components/crm/*`, … | `modules/<dominio>/components/*` |
| `hooks/use-*-board`, `use-*-pipeline`, … | `modules/<dominio>/hooks/*` + `.queries.ts`/`.mutations.ts` |
| `features/*` (già esistenti) | si allineano allo stesso schema |
| utility pure in `lib/` | restano in `lib/` se trasversali, altrimenti `<dominio>.utils.ts` |

Domini candidati: `lavoratori`, `ricerca`, `crm`, `gestione-contrattuale`, `payroll`,
`rapporti`, `anagrafiche`, `support`.

### 💡 L'aggancio con la pulizia del DB

Gli **adapter** sono esattamente il cuscinetto che serve a Nicolò. Oggi i ~370 campi
con nomi confusi sono sparsi in tutta l'app: per questo cancellarne uno fa paura.
Quando ogni dominio ha il suo `adapters.ts` come **unico punto** in cui i nomi-campo
del DB toccano il codice, ripulire/rinominare un campo diventa una modifica
**localizzata** invece che una caccia al tesoro. → **Prima isoliamo i campi negli
adapter, poi la pulizia del DB diventa sicura.** I due lavori si rinforzano.

**Done:** almeno 1–2 domini migrati alla struttura a moduli come **riferimento**
(template) per gli altri; `anagrafiche-api.ts` ridotto; AGENTS.md aggiornato con la
nuova struttura. Mai migrare in blocco: un dominio alla volta, sotto test verdi.

---

## 7. Fase 3 — Refactoring sotto green (dalla settimana 3, parallelizzabile)

Con rete + struttura in piedi, si parallelizza: un po' di refactoring (spezzare i
file giganti per renderli single-responsibility) e un po' di nuove funzionalità.
Per ogni file gigante: **caratterizza → spezza → la suite resta verde**. Se un test
*deve* cambiare per compilare, è il segnale che la "cucitura" pubblica si è spostata
— lo si rivede come cambio deliberato, non come edit silenzioso.

Da qui in poi entra anche **Mattia** (esperto frontend, part-time) a coprire la parte
dove sei meno a tuo agio — buon bilanciamento col tuo lato backend.

---

## 8. Cosa ti chiedo adesso

1. Fai **brainstorming con l'AI sul repository** per la parte di testing: aprila sui
   **due repo** (frontend + backend) da root, fatti spiegare la struttura.
2. Rimandami una **proposta di implementazione**: come implementeresti la Fase 1
   (quali file inizieresti a testare e come), e una prima idea su quali 1–2 domini
   migrare per primi alla struttura a moduli in Fase 2.
3. In parallelo, con Nicolò potete partire sulla **pulizia DB**: aprite l'AI da root
   sui due repo, fatevi dare l'elenco di tutti i campi, poi fatevi dire **quali non
   sono usati** nella codebase (frontend + backend + automazioni Make).

Usa l'AI per tutto questo. L'importante è che **capisci** cosa sta facendo.

---

## Anti-pattern da evitare

- ❌ Snapshot del DOM dei componenti giganti (fragili, non catturano nulla).
- ❌ Test che asseriscono struttura interna invece del comportamento.
- ❌ Mockare la catena profonda del query-builder Supabase — si mocka al confine del
  modulo (`@/lib/*` o `@/modules/*`).
- ❌ Inseguire una % di coverage globale come obiettivo. La coverage è una mappa.
- ❌ Migrazioni di massa della struttura. Un file/dominio alla volta, sotto green.
- ❌ Fidarsi del codice generato dall'AI senza averlo capito.
