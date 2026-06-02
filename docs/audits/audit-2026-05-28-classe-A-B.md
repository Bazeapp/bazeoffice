# Audit Classe A (Save Bypass) + Classe B (Silent Error)

Data: 2026-05-28
Scope: handler `on*Change` (Classe A) e blocchi `catch` (Classe B) in `src/components/lavoratori|ricerca|crm|gestione-contrattuale|payroll/` + hooks correlati.

## Sommario

| Classe          | File analizzati | BUG confermati | DUBBI | FALSI POSITIVI |
| --------------- | --------------- | -------------- | ----- | -------------- |
| A. Save Bypass  | 28              | 2              | 1     | ~190           |
| B. Silent Error | 14              | 11             | 4     | ~25            |

Note metodologiche:
- "Falsi positivi" = handler in componenti filtro/toolbar/UI (es. `setSearchQuery`, `setStatusFilter`), handler propagati al parent via prop `onChange/onValueChange`, handler con commit a un bottone "Salva" esplicito (es. `commitSchedulingDraft`).
- Per CLASSE B, "Falsi positivi" = catch in data loaders top-level dove `setError` viene mostrato in un banner di pagina, cache invalidators che rilanciano, e catch in test/utility puri.

---

## Classe A — Bug confermati

### A.1 `gate1-view.tsx:4588` — `onDisponibilitaNelGiornoChange` (variant split-baze)

```tsx
onDisponibilitaNelGiornoChange={(values) => {
  setAvailabilityDraft((current) => ({
    ...current,
    disponibilita_nel_giorno: values,
  }));
}}
```

Cosa manca: chiamata a `patchSelectedWorkerField("disponibilita_nel_giorno", values.length > 0 ? values : null)` dopo `setAvailabilityDraft`. Il draft locale è aggiornato ma il valore non raggiunge mai il server.
Effort fix: 2 min (allineare a `onTipoRapportoChange` 4568 e `onLavoriAccettabiliChange` 4578 nello stesso card).

### A.2 `gate1-view.tsx:4816` — `onDisponibilitaNelGiornoChange` (variant default)

```tsx
onDisponibilitaNelGiornoChange={(values) => {
  setAvailabilityDraft((current) => ({
    ...current,
    disponibilita_nel_giorno: values,
  }));
}}
```

Cosa manca: stesso pattern del fix A.1. Duplicato perché `GateShiftPreferencesCard` è renderizzato in due rami (split vs default) del `splitBazeChecksStep`.
Effort fix: 2 min (DRY: estrarre l'handler in costante locale e usarla in entrambi i rami).

---

## Classe A — Dubbi (da verificare manualmente)

### A.D1 `ricerca-workers-pipeline-view.tsx:2668` — `onAvailabilityVincoliChange`

```tsx
onAvailabilityVincoliChange={(value) =>
  setAvailabilityDraft((current) => ({
    ...current,
    vincoli_orari_disponibilita: value,
  }))
}
```

Contesto: il `AvailabilityCalendarCard` riceve anche `onAvailabilitySave={() => void saveWorkerAvailability()}` (linea 2674), che è il pattern "draft + bottone Salva esplicito" presente nelle altre matrix availability. Da confermare che l'UI esponga effettivamente un Save button visibile o che `vincoli_orari_disponibilita` sia incluso nel payload di `saveWorkerAvailability` (la stessa logica esiste in `lavoratori-cerca-view.tsx:1828` e `gate1-view.tsx:4626/4892`).
Effort fix se BUG: 1 min (aggiungere `void patchSelectedWorkerField("vincoli_orari_disponibilita", value || null)`).

---

## Classe B — Bug confermati

Tutti gli "11 BUG confermati" sotto seguono lo stesso pattern: in `use-selected-worker-editor.ts` il file importa `toast` (linea 2) e in 2 catch usa `toast.error` (715, 744), ma in 9 catch usa solo `setError(...)` + `throw caughtError`. L'`error` è propagato a `gate1-view.tsx:4093` / `lavoratori-cerca-view.tsx:1612` (passato come prop al list panel) che lo rende come stringa rossa nella lista lavoratori. Risultato: l'utente edita un campo nel detail panel, il save fallisce, la lista lavoratori a fianco si trasforma in `<p>{error}</p>` (potenzialmente fuori vista se la sidebar è collassata) e nessun toast.

### B.1 `use-selected-worker-editor.ts:527` — `patchWorkerRecord`

```ts
} catch (caughtError) {
  setError(formatEditorError(options.errorMessage, caughtError))
  throw caughtError
} finally { ... }
```

Cosa manca: `toast.error(formatEditorError(options.errorMessage, caughtError))` prima di `throw`. È il path usato da `patchSelectedWorkerField`, quindi copre la stragrande maggioranza dei `void patchSelectedWorkerField(...)` nei handler `on*Change` di gate1/cerca/pipeline (es. tutti i livelli, ratings, compatibilità, status).
Effort fix: 5 min totali per tutto il file (factoring helper).

### B.2 `use-selected-worker-editor.ts:613` — `patchWorkerAddressInternal`

```ts
} catch (caughtError) {
  setError(formatEditorError("Errore aggiornando indirizzo", caughtError))
  throw caughtError
}
```

Cosa manca: `toast.error(...)`. Bug per ogni cambio provincia/via/etc. in AddressSectionCard.

### B.3 `use-selected-worker-editor.ts:802` — `patchExperienceRecord`

Stesso pattern (`Errore aggiornando esperienza`). Bug nei card esperienza in gate1/cerca/pipeline.

### B.4 `use-selected-worker-editor.ts:821` — `createExperienceRecord`

Stesso pattern (`Errore creando esperienza`).

### B.5 `use-selected-worker-editor.ts:838` — `deleteExperienceRecord`

Stesso pattern (`Errore eliminando esperienza`).

### B.6 `use-selected-worker-editor.ts:854` — `patchReferenceRecord`

Stesso pattern (`Errore aggiornando referenza`).

### B.7 `use-selected-worker-editor.ts:873` — `createReferenceRecord`

Stesso pattern (`Errore creando referenza`).

### B.8 `use-selected-worker-editor.ts:977` — `generateStripeAccount`

```ts
} catch (caughtError) {
  setError(formatEditorError("Errore creazione account Stripe", caughtError))
  throw caughtError
}
```

Cosa manca: `toast.error`. Operazione one-shot triggerata da bottone — toast è il feedback naturale atteso.

### B.9 `lavoratori-cerca-view.tsx:1535` — upload foto

```ts
} catch (caughtError) {
  setError(
    caughtError instanceof Error ? caughtError.message : "Errore caricando la foto",
  );
}
```

Cosa manca: `toast.error(...)`. L'utente clicca "carica foto" da un Button; ricevere il messaggio nella sidebar dei risultati di ricerca è UX incorretto.
Effort fix: 1 min.

### B.10 `lavoratori-cerca-view.tsx:1572` — cambio foto principale

```ts
} catch (caughtError) {
  setError(
    caughtError instanceof Error ? caughtError.message : "Errore aggiornando la foto principale",
  );
}
```

Cosa manca: `toast.error(...)`. Stesso pattern del B.9.

### B.11 `gate1-view.tsx:3872` e `:3918` — upload/cambio foto (gate1)

Identici a B.9/B.10 ma duplicati nel gate1-view. Stessa fix.

---

## Classe B — Dubbi

### B.D1 `ricerca-detail-view.tsx:1287` — `updateProcessCard` write error

```ts
} catch (caughtError) {
  if (targetProcessId === currentProcessId) setCard(previousCard);
  setError(...);
}
```

Il banner display è `Errore caricamento dettaglio ricerca: {error}` (linea 1536), ma questo catch è in un PUT (update). Il messaggio del banner è quindi semanticamente sbagliato e l'utente che ha cambiato uno stato non lo associa al fallimento dell'update. Da confermare se è preferibile aggiungere `toast.error` o cambiare la stringa del banner.

### B.D2 `ricerca-detail-view.tsx:1313` — `updateFamilyCard` write error

Stesso pattern di B.D1 (`Errore aggiornando famiglia`).

### B.D3 `ricerca-detail-view.tsx:1358` — `updateAddressCard` write error

Stesso pattern (`Errore aggiornando indirizzo`).

### B.D4 `ricerca-workers-pipeline-view.tsx:1849` — `handleSelectionDetailsPatch` write

```ts
} catch (error) {
  setSelectedWorkerError(message || "Errore aggiornamento selezione");
}
```

Banner display alla linea 2416 è `Errore caricamento lavoratore: {selectedWorkerError}`. Stesso problema di B.D1: messaggio sbagliato per write error. Stesso pattern alla linea 2047 (write `updateFamilyAddress`). Da decidere tra `toast.error` o rifrasare il banner.

---

## Pattern per lint rule futura

### CLASSE A — Selettore AST (jscodeshift / ts-morph)

Pseudo-AST query per intercettare il pattern:

```
JSXAttribute name=/^on[A-Z].*Change$/
  value: JSXExpressionContainer >
    ArrowFunctionExpression body:
      BlockStatement contiene:
        ExpressionStatement > CallExpression callee=Identifier name=/^set[A-Z].*Draft?$/
      MA NON contiene:
        CallExpression callee=Identifier name=/^(patch|update|save|persist|commit|mutate|trackWrite).*/
        OPPURE
        UnaryExpression op=void contenente CallExpression con callee match sopra
```

Heuristic regex first-pass (post-process con AST):
- `on[A-Z][a-zA-Z]*Change\s*=\s*\{\s*\([^)]*\)\s*=>\s*\{[\s\S]{0,400}?set[A-Z][a-zA-Z]*Draft?\(`
- Per ogni match, controllare nel range [match.end, match.end + 600] la presenza di:
  - `patchSelectedWorkerField\(|patchWorkerAddressField\(|patchJobSearchField\(|patchSkillsField\(|patchDocumentField\(|patchExperienceRecord\(|patchReferenceRecord\(|patchWorkerAvailabilityStatus\(|saveWorker[A-Z]|patchProcess\(|patchAddress\(|patchFamily\(|saveRapportoPatch\(|saveProcessPatch\(|saveAddressPatch\(|onAssunzionePatch\(|onLavoratorePatch\(|commit[A-Z]|updateRecord\(|updateProcessCard\(|updateFamilyCard\(|updateAddressCard\(|mutateAsync\(|mutate\(|trackWrite\(`
- Whitelist: handler che chiamano `commitSchedulingDraft`, `setDraft` con `<Bottone Salva>` esplicito (rilevabile cercando `onSave={.*commitXxx}` nello stesso JSX parent). Anche `setSearch*`, `setFilter*`, `set*Filter`, `setApplied*`.

Whitelist file:
- `**/{*-board-view,*-toolbar,*-filters,*-list-panel}.tsx`
- Funzioni puramente filtro identificate da pattern `setStatusFilter`, `setDatePreset`, `setToolbar*`, `setApplied*`.

### CLASSE B — Selettore AST

Pseudo-AST query:

```
CatchClause body: BlockStatement contiene:
  CallExpression callee=Identifier name=/^set.*Error$/
  MA NON contiene (in qualsiasi nesting):
    CallExpression callee=MemberExpression object.name=toast property.name=/^(error|warning)$/
    OPPURE
    CallExpression callee=Identifier name=toast
```

Heuristic regex first-pass:
- Match `\}\s*catch\s*(\([^)]*\))?\s*\{([\s\S]{0,500}?)\}` con capture group 2.
- Group 2 contiene `set[A-Z][a-zA-Z]*Error\(` ma NON `toast\.(error|warning)\(|toast\(`.

Whitelist:
- File matching `*.test.{ts,tsx}` o `*.spec.{ts,tsx}`.
- File in `src/lib/` la cui `setError` non esiste e si tratta solo di `cache.delete()`+`throw error`.
- Hook che hanno `error` in `return { error, ... }` E il setter è `setError` (top-level hook errors → renderizzati in banner). Detect: `const [error, setError] = React.useState` + `return { error,` o `return { ..., error, ... }`.
  - Override: se il file importa anche `toast` da `sonner` e ha catches con write ops, considera BUG.

### Esempio ESLint rule custom (opzionale)

```js
// .eslintrc custom rule "no-silent-set-error-in-catch"
module.exports = {
  meta: { type: "problem" },
  create(context) {
    return {
      "CatchClause > BlockStatement"(node) {
        const setsError = node.body.some(
          (stmt) =>
            stmt.type === "ExpressionStatement" &&
            stmt.expression.type === "CallExpression" &&
            /^set[A-Z].*Error$/.test(stmt.expression.callee.name)
        );
        const hasToast = JSON.stringify(node).includes('"name":"toast"');
        if (setsError && !hasToast) {
          context.report({
            node,
            message: "catch chiama set*Error senza toast.error: errore silenzioso",
          });
        }
      },
    };
  },
};
```
