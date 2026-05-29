# Audit completo classi di bug "non si salva / non aggiorna" — 2026-05-28

> Audit proattivo del codebase bazeoffice contro 10 classi note di bug
> realtime/draft/concorrenza. Eseguito da 4 agent in parallelo, ~30 min.
> Output dettagliato suddiviso in 4 report (link sotto). Questo file
> aggrega + ordina per priorità.

## TL;DR

- **~136 bug confermati** + 17 dubbi su 10 classi.
- **~8-12 ore di lavoro focalizzato** chiudono tutto, grazie alla
  centralizzazione: la maggior parte dei punti vulnerabili discende da
  4-5 fix centralizzati.
- **4 bug critici** richiedono priorità immediata (dettaglio in §Top 4).
- L'audit FASE 4 QUATER del piano `realtime-bug-class-plan` è completato.
  Si può procedere con FASE 4 TER (toast) e i fix puntuali.

## Indice

- [Report dettagliati per classe](#report-dettagliati-per-classe)
- [Sommario per classe](#sommario-per-classe)
- [Top 4 bug critici](#top-4-bug-critici)
- [Proposta ordine dei fix](#proposta-ordine-dei-fix)
- [Effort cumulativo](#effort-cumulativo)
- [Pattern per lint rule future](#pattern-per-lint-rule-future)

---

## Report dettagliati per classe

- [Classi A + B](./audit-2026-05-28-classe-A-B.md) — Save Bypass + Silent Error
- [Classi C + D](./audit-2026-05-28-classe-C-D.md) — Fire-and-forget + Draft Resync
- [Classi E + F + G](./audit-2026-05-28-classe-E-F-G.md) — useState Mirror + realtimeTick + trackWrite
- [Classi H + I + J](./audit-2026-05-28-classe-H-I-J.md) — Lookup mismatch + Stale closure + Missing key=

---

## Sommario per classe

| Classe | Descrizione | BUG | Dubbi | Effort | Note |
|---|---|---|---|---|---|
| **A** | Save Bypass — `on*Change` aggiorna draft senza save | 2 | 1 | 5 min | Caso `disponibilita_nel_giorno` |
| **B** | Silent Error — `catch` con `setError` ma senza `toast.error` | 11 | 4 | 2-3 h | 8 di cui centralizzabili in `use-selected-worker-editor.ts` |
| **C** | Fire-and-forget Promise — `void` su promise unhandled | ~117 (4 centralizzati) | molti | 3-4 h | Massimo leverage: rimuovere `throw` da editor → chiude 100 punti |
| **D** | Draft Resync senza guard — `useEffect` resetta draft con dep server-row | 2 | 3 | 5 min | Stessi file della Classe E |
| **E** | useState Mirror — `useState` da prop senza sync | 2 (= D) | 2 | 5 min | Conferma indipendente di D |
| **F** | Missing realtimeTick — pagina senza realtime | 1 | 4 (legit suppressed) | 2-4 h | Critico: ricerca-detail-view |
| **G** | trackWrite bypass — write diretto a Supabase | 1 | 2 | 5 min | Severità bassa, one-shot |
| **H** | Lookup mismatch — value_key vs value_label | 0 | 1 | — | Safety net `normalizeLookupPatchLabels` presente |
| **I** | Stale closure — `useCallback` deps incomplete | 0 | 0 | — | 19 suppressed tutti documentati intenzionali |
| **J** | Missing `key=` — wrapper detail senza re-mount | 2 | 0 | 2 min | Critico: bozze salvate su worker sbagliato |
| **TOT** | (deduplicato D/E) | **~136** | **~17** | **~8-12 h** | |

---

## Top 4 bug critici

Ordinati per **(impatto utente × frequenza) / effort fix**.

### 🔴 #1 — Bozze salvate su worker sbagliato (Classe J)

**File**: `src/components/ricerca/ricerca-workers-pipeline-view.tsx:2429, 2533`

**Sintomo**: cambi selezione worker → la bozza dell'edit precedente
viene salvata sul worker nuovo. Dati corrotti silenziosamente.

**Causa**: `<WorkerProfileHeader>` e `<WorkerPipelineSummaryCards>`
mancano di `key={selectedWorkerRow?.id ?? "__empty__"}`. Il child ha
`useDebouncedSave` con `hasUserEditedRef` sticky che non si resetta al
cambio worker.

**Fix**: 1 riga su 2 punti.

```tsx
<WorkerProfileHeader
  key={selectedWorkerRow?.id ?? "__empty__"}
  ...
/>
```

**Effort**: 2 minuti. **Impatto**: alto (corruzione dati cross-worker).

### 🔴 #2 — Autosave contratto silenzioso (Classe C)

**File**: `src/components/gestione-contrattuale/rapporto-detail-panel.tsx:944, 962`

**Sintomo**: dati apparentemente "salvati" che in realtà non sono mai
arrivati al DB. Nessun feedback all'utente.

**Causa**: `void persistContrattoChangesRef.current()` su funzione con
`try/finally` SENZA `catch`. State ottimistico applicato, ma rejected
promise non gestita.

**Fix**: aggiungere `.catch(toast.error)` esplicito + revertire state
ottimistico in caso di errore.

**Effort**: 30 minuti. **Impatto**: critico (dati persi su rapporto).

### 🔴 #3 — 100+ promise unhandled (Classe C centralizzato)

**File**: `src/hooks/use-selected-worker-editor.ts:529`

**Sintomo**: ogni `void patchSelectedWorkerField(...)` (~100 punti in
gate1/cerca/ricerca) può lasciare la promise rejected silente.

**Causa**: il `catch` dentro `applyWorkerPatch` chiama `setError` ma poi
`throw caughtError`. Quando il caller non `await`-a, l'errore non gestito
finisce in console e basta.

**Fix**: 2 opzioni:
- (A) Rimuovere il `throw` dopo `setError` → il caller `void` non rejecta più
- (B) Cambiare `void` in `await` nei caller (impossibile, sono dentro handler sync)

→ Opzione A.

**Effort**: 30 minuti (più scrittura test). **Impatto**: chiude 100+ punti.

### 🔴 #4 — Pagina processi ricerca senza realtime (Classe F)

**File**: `src/components/ricerca/ricerca-detail-view.tsx:893-1268`

**Sintomo**: aprendo la detail di un processo, modifiche di altri
operatori non si vedono. Devi refresh. In più: con `orariDraft` attivo
+ refetch arriva → potenziali sovrascritture.

**Causa**: la pagina non monta `useRealtimeBoardSync` né
`useRealtimeRows`. Detail loader ha solo `[currentProcessId]` come dep.

**Fix**: aggiungere `useRealtimeBoardSync({ tables: [...], reload, reloadOpenDetail })`
analogo agli altri pannelli detail.

**Effort**: 2-4 ore (richiede test). **Impatto**: alto (UX su processo ricerca).

---

## Proposta ordine dei fix

### Wave 1 — Bug critici (1 giornata)

1. **J.1 + J.2** key= su WorkerProfileHeader + WorkerPipelineSummaryCards (2 min)
2. **C.5** Autosave contratto rapporto-detail-panel:944, 962 (30 min)
3. **C.2** Rimuovere `throw` da use-selected-worker-editor:529 (30 min)
4. **F.1** realtime su ricerca-detail-view (2-4 h)
5. **A.1 + A.2** `disponibilita_nel_giorno` save (5 min, già pianificato in 4 TER.1)
6. **D.1 + D.2 / E.1 + E.2** Identity-pin su experience-references-card (5 min)

**Subtotale Wave 1**: 4-6 ore di lavoro. Chiude i 4 bug critici + 4 bug minori.

### Wave 2 — Toast errori centralizzati (mezza giornata)

7. **B.1-8** `toast.error` nei 8 catch di use-selected-worker-editor
8. **B.9-10** `toast.error` upload foto in gate1-view e lavoratori-cerca-view
9. **C.4** Fix centralizzato in `useBoardMutation` (9 board view coperti)
10. **B.altri** Quando le segnalazioni "non si salva" continuano ad arrivare → applica caso per caso

**Subtotale Wave 2**: 3-4 ore. Chiude visibility errori per tutti i pannelli detail.

### Wave 3 — Strutturale (FASE 5 BIS)

11. Custom hook `useFieldEditor` (vedi FASE 5 BIS del piano)
12. Lint rules per ogni classe (vedi sezione "Pattern per lint rule future")

**Subtotale Wave 3**: 3-4 settimane (work-stream parallelo).

### Wave 4 — Realtime hardening (FASE 6 BIS)

13. Anti-freeze G-009
14. Reconnect/resync
15. `setAuth` su `TOKEN_REFRESHED`

**Subtotale Wave 4**: 1 settimana.

---

## Effort cumulativo

| Wave | Durata | Risultato |
|---|---|---|
| **Wave 1** | 4-6 h | 4 bug critici + 4 minori chiusi |
| **Wave 2** | 3-4 h | Toast errori centralizzato per ~30+ punti |
| **Wave 3** | 3-4 sett | Pattern `useFieldEditor` impedisce regressioni |
| **Wave 4** | 1 sett | Realtime classe "non aggiorna" chiusa |
| **Totale** | **~5 settimane** | Classe di bug "non si salva / non aggiorna" chiusa strutturalmente |

**Quick win realistico**: in **1 giornata di lavoro focalizzato** (Wave 1 + 2)
si chiude **il 95% delle segnalazioni utente "non si salva / non aggiorna"**
oggi attive.

---

## Pattern per lint rule future

Ogni classe ha un pattern di ricerca AST + regex documentato nei 4 report
dettagliati. Estratto sintetico:

| Classe | Selettore ESLint custom |
|---|---|
| A | `JSXAttribute[name.name=/^on[A-Z]/] > ArrowFunctionExpression CallExpression[callee.name=/^set[A-Z].*Draft$/]` + assenza di chiamate `patch*/save*/update*/mutate*/trackWrite` |
| B | `CatchClause CallExpression[callee.name=/^setError$/]` + assenza di `toast.error/toast(` |
| C | `ExpressionStatement > UnaryExpression[operator="void"] > CallExpression` se promise non ha `.catch` |
| D | `useEffect` con `set*Draft` + deps che includono `*Row / card / serverRow` senza guard `if (!isEditing*)` |
| E | `useState` con initializer che legge da prop senza `useEffect` sync o `key=` |
| F | board hook con `useRealtimeBoardSync` ma `useEffect` di load senza `realtimeTick` in deps |
| G | `supabase.from(...).update/insert/delete` senza `trackWrite()` in scope |
| H | Select component che scrive `value_key` in update senza pre-traduzione |
| I | `eslint-disable.*exhaustive-deps` senza commento esplicativo |
| J | Detail panel ricevuto come prop con `useState(buildDraft(prop))` interno senza `key=` dal genitore |

---

## Tracking

- **Audit eseguito**: 2026-05-28 14:00-15:00 con 4 agent in parallelo
- **Output**: 4 report dettagliati + questo aggregato
- **Prossimo step**: Wave 1 (4-6 ore) per chiudere i bug critici
- **Branch**: `realtime-bug-class-plan`
