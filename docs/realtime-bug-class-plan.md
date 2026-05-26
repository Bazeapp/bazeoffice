# Piano: chiusura definitiva della classe di bug "realtime / draft / concorrenza"

> Branch dedicato: `realtime-bug-class-plan`.
> Su `main` continuano gli sviluppi normali; questo branch lavora in parallelo
> e viene mergeato a tappe (una FASE alla volta) o cherry-pick selettivo.

## Obiettivo finale

**Nessun operatore segnala mai più un bug del tipo:**
- "ho scritto e si è cancellato"
- "ho salvato sul profilo sbagliato"
- "il dato non è andato sul DB"
- "vedo dati vecchi"
- "i campi spariscono dalla scheda"

E ogni regression di questa classe viene **bloccata da un test** prima del push.

## Principi guida (non negoziabili)

1. **Server state e form state SONO COSE DIVERSE.** Server state in React
   Query. Form state in form refs (react-hook-form). Mai mescolati.
2. **Ogni fix porta con sé il test che lo prova.** Nessuna eccezione.
3. **Procediamo a strati.** Prima fix-bug, poi prevenzione strutturale,
   poi soluzione architetturale. Niente salti.
4. **Niente refactor speculativi.** Solo cose con un bug reale o un test
   che le motiva.

---

## FASE 0 — Chiusura del presente ✅

Già fatta su `main` (commit `03ecdd3`).

- [x] Vitest setup + 55 unit test
- [x] Fix `feeConcordata` (RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS)
- [x] Fix `availabilityDraft` + 7 altri draft (guardia `isEditing*`)
- [x] Push su main

## FASE 1 — Setup infrastruttura test componente/hook ✅

**Stima**: ~3h. **Branch**: `realtime-bug-class-plan`.

- [x] Installate `@testing-library/react`, `@testing-library/user-event`,
      `happy-dom`, `@testing-library/jest-dom` (happy-dom invece di jsdom:
      jsdom 29 ha una regressione ESM su node 22).
- [x] `vitest.config.ts` con `environment: "happy-dom"` e `setupFiles`.
- [x] `src/test/setup.ts` con: jest-dom matchers, cleanup automatico,
      polyfill `matchMedia` / `ResizeObserver` / `IntersectionObserver`.
- [x] `src/test/test-utils.tsx`: helper `renderHookWithQueryClient` e
      `renderWithProviders` con QueryClient isolato per test.
- [x] `src/test/smoke.integration.test.tsx`: 3 smoke test green.
- [x] Script: `test`, `test:watch`, `test:unit`, `test:integration`.
- [x] Lefthook installato + `pre-push` con `npm test`, typecheck, lint.
- [x] Exclude `supabase/functions` dalla lint (Deno tooling separato).

**Done**: 58 test verdi in ~1s. Helper pronti in `@/test/test-utils`.

## FASE 2 — Test di regressione sui bug visti ✅

**Stima**: ~1 giorno. **Effettivi**: ~30min con 3 agent in parallelo.

- [x] Regressione `feeConcordata` (unit test su binding) — FASE 0
- [x] Regressione preservazione campi CRM (`preserveMissingFields`) — FASE 0
- [x] Regressione `availabilityDraft` + headerDraft + addressDraft +
      jobSearchDraft: hook test su `useSelectedWorkerEditor` — 5 test
      in `use-selected-worker-editor.integration.test.tsx`
- [x] Regressione `key=` mancante: pattern test in
      `key-unmount-pattern.integration.test.tsx` — 4 test che provano
      perché serve `key={selectedId ?? "__empty__"}` sui wrapper detail
- [x] Regressione echo-suppression (LOCAL_WRITE_ECHO_WINDOW_MS) — hook
      test in `use-realtime-board-sync.integration.test.tsx`
- [x] Regressione pending-write defer — stesso file
- [x] Regressione debounce burst + ordine reload→reloadOpenDetail —
      stesso file

**Totale**: 14 nuovi test integration + 55 pure function = 72 test verdi
in ~1.7s.

**Done**: i bug noti hanno ognuno il proprio test di regressione. Se
qualcuno spezza la guardia `isEditing*`, l'echo-window, il defer dei
pending writes, o il pattern `key=` → `npm test` fallisce prima del push.

## FASE 3 — Audit e fix preventivi ✅

**Stima**: 3-5 giorni. **Effettivi**: ~3h con 9 agent in parallelo (4 audit + 5 fix Wave 1 + 4 fix Wave 2).

- [x] Audit "draft sovrascritto" — 7 TRUE POSITIVE + 1 NOTE in
      `docs/audits/audit-draft-resync.md`. Tutti fixati nelle 2 Wave.
- [x] Audit "key= mancante" — 1 TRUE POSITIVE
      (`SchedaColloquioPanel`), fixato + lint rule widened.
- [x] Audit "Pattern A mancante" — 4 board hooks vulnerabili
      (rapporti, chiusure, assunzioni, variazioni). Pattern A applicato
      a tutti e 4 con binding lists + getPreviousCard lazy.
- [x] Audit "save bypass trackWrite" — 3 BYPASS + central wrapper.
      Tutto coperto: `runTracked`/`runTrackedEdgeFunction` esposti,
      `availability-functions.ts` 1-line covering 4 callers,
      `useBoardMutation` wraps mutationFn defensively.

**Done**: 137 test verdi, classe di bug "fields disappear" + "draft
overwritten" + "save bypass" chiusa retroattivamente.

## FASE 4 — Lint rules e guardrail strutturali ✅

**Stima**: 1-2 giorni. **Effettivi**: 1 commit `eslint.config.js`.

- [x] Lint rule "draft setter without isEditing guard"
      (selector: `setXxxDraft()` come ExpressionStatement diretta in
      un useEffect body).
- [x] Lint rule "useState mirror from prop without sync"
      (selector: `useState(...)` initializer che legge da
      `card / *Row / serverRow / defaults`).
- [x] Lint rule "useEffect che chiama setDraft con deps che includono
      il row" — versione più precisa della prima.
- [x] Refinement della rule esistente "realtimeTick missing":
      ora matcha anche `React.useEffect(...)` namespaced.
- [ ] CI pipeline che blocca PR se lint/test/build falliscono.
      (Lefthook pre-push già attivo localmente; CI server è da
      pianificare separatamente — non bloccante.)

**Done**: 88 warnings sul codebase corrente (tutti pre-existing debt
della stessa classe di bug). 0 errors. Ogni rule ha un recipe di
suppression in-comment con istruzioni esplicite. Nuovi PR non
possono introdurre regression senza override scritto + spiegazione.

## FASE 5 — Migrazione progressiva a react-hook-form

**Stima**: 2-4 settimane.

Ogni step ha test componente di accompagnamento.

- [ ] `worker-profile-header.tsx` → react-hook-form
- [ ] Riquadro disponibilità (Gate1 + Gate2)
- [ ] 8 sezioni di `use-selected-worker-editor.ts` una per una
- [ ] Card CRM (`onboarding-card`, `stato-lead-card`, ...)
- [ ] Rimuovere pattern "useEffect resync draft" ovunque possibile

**Done**: tutte le pagine ad alta concorrenza in react-hook-form. Nessun
`useState(buildDraft(prop))` rimasto.

## FASE 6 — Valutazione sync engine (decisione)

**Stima**: 1 settimana.

- [ ] Documento di confronto PowerSync vs Zero vs ElectricSQL per stack
      Supabase. Pro/contro/costi.
- [ ] POC su 1 pagina (es. Lavoratori Cerca): 5 giorni spike, no rollout.
- [ ] Decisione GO / NO-GO con stakeholder.

**Done**: scelta strategica documentata. Se GO → FASE 7. Se NO-GO → FASE 5
è la soluzione finale.

---

## Cosa NON facciamo (no scope creep)

- ❌ CRDT (Yjs) — overkill.
- ❌ E2E Playwright full-suite — ROI basso, costoso, fragile.
- ❌ Riscrittura dell'app — tutto incrementale.
- ❌ Cambiare Supabase.

## Tracking

1. Questo file è la **single source of truth** del piano.
2. Ogni fase chiusa = commit + checkbox spuntato.
3. Review settimanale di 5 minuti.
4. Bug imprevisto: prima si chiude (fix + test stile FASE 2), POI si
   torna alla roadmap.

## Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Fase 3 trova decine di file vulnerabili | Prioritizza per traffico utente. Top 5 a settimana, non tutto insieme. |
| react-hook-form rompe altre cose | Test componente prima, durante, dopo la migrazione. |
| Team perde fiducia perché "ogni fix è lento" | Comunicare: "il fix non è in 10 minuti perché stiamo chiudendo la classe per sempre". |
| Sync engine POC fallisce | Restiamo su FASE 5. Non è dramma. |

## Risorse di riferimento

- [TanStack Query — Mastering Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
- [TkDodo blog](https://tkdodo.eu/blog) — tutti gli articoli su React Query
- [Linear sync engine](https://linear.app/blog/scaling-the-linear-sync-engine)
- [Zero by Rocicorp](https://zero.rocicorp.dev)
- [PowerSync](https://powersync.com)
- [ElectricSQL](https://electric-sql.com)
- [react-hook-form](https://react-hook-form.com)
- [docs/realtime-board-pattern.md](./realtime-board-pattern.md) — Pattern
  A e Pattern B documentati internamente.
