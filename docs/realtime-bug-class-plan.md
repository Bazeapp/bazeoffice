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

## FASE 1 — Setup infrastruttura test componente/hook

**Stima**: ~3h. **Branch**: `realtime-bug-class-plan`.

- [ ] Installare `@testing-library/react`, `@testing-library/user-event`,
      `jsdom`, `@testing-library/jest-dom`.
- [ ] `vitest.config.ts` con `environment: "jsdom"` per `*.integration.test.tsx`.
- [ ] `src/test/setup.ts` con: mock di `@/lib/supabase-browser`, mock di
      `useRealtimeRows`, helper `renderHookWithQueryClient`.
- [ ] Smoke test hook + smoke test component (entrambi green).
- [ ] Script `test:integration` (jsdom) e `test:unit` (node, pure functions).
- [ ] Husky/lefthook: pre-push hook che fa fallire il push se `npm test`
      non passa.

**Done**: posso scrivere un hook test in 10 minuti senza setup aggiuntivo.

## FASE 2 — Test di regressione sui bug visti

**Stima**: ~1 giorno.

- [x] Regressione `feeConcordata` (unit test su binding)
- [x] Regressione preservazione campi CRM (`preserveMissingFields`)
- [ ] Regressione `availabilityDraft`: hook test su `useSelectedWorkerEditor`
      "draft non sovrascritto se `isEditingAvailability === true`"
- [ ] Regressione `headerDraft`: stesso pattern per WorkerProfileHeader
- [ ] Regressione `key=` mancante: component test "cambio selectedCardId
      → unmount totale del componente detail, niente draft leak"
- [ ] Regressione echo-suppression: hook test su `useRealtimeBoardSync`
      "reload NOT chiamato se `getMillisSinceLastLocalWrite() < 2500`"
- [ ] Regressione pending-write defer: hook test "reload DEFERRED finché
      `getPendingWriteCount() > 0`"

**Done**: tutti i bug noti sono test-guarded.

## FASE 3 — Audit e fix preventivi

**Stima**: 3-5 giorni.

- [ ] Audit "draft sovrascritto": script che scanna `useEffect` con
      `setDraft*(buildDraft(serverRow))` senza guardia `isEditing*`.
- [ ] Audit "key= mancante": potenziare `audit-autosave-risk.mjs` per
      beccare wrapper detail senza `key={selectedXxxId}`.
- [ ] Audit "Pattern A mancante": per ogni hook board, verificare se ha
      detail loader separato con SELECT più ampio. Fissare `use-rapporti-
      lavorativi-data.ts` confermato vulnerabile.
- [ ] Audit "save bypass trackWrite": find save che NON passano per
      `trackWrite` o `beginPendingWrite/endPendingWrite`. Wrappare tutto.

**Done**: 0 occorrenze per ognuno dei 4 audit + lint rule per ognuno.

## FASE 4 — Lint rules e guardrail strutturali

**Stima**: 1-2 giorni.

- [ ] Lint rule "draft setter without isEditing guard".
- [ ] Lint rule "useState con value derived from prop without sync mechanism".
- [ ] Lint rule "useEffect che chiama setDraft con deps che includono il row".
- [ ] CI pipeline che blocca PR se lint/test/build falliscono.

**Done**: nuovi PR non possono introdurre regression senza override scritto.

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
