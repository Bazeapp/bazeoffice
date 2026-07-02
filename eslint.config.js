import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const MODULE_BOUNDARY_RESTRICTIONS = {
  patterns: [
    {
      group: ['@/modules/*/*.api', '@/modules/*/*.api.ts'],
      message:
        'Import from @/modules/<dominio> (the public index.ts barrel) only. Deep .api.ts imports are module-internal drift.',
    },
    {
      group: ['@/modules/*/*.adapters', '@/modules/*/*.adapters.ts'],
      message:
        'Import from @/modules/<dominio> (the public index.ts barrel) only. Adapters are module-internal — never import .adapters.ts across module boundaries.',
    },
  ],
}

export default defineConfig([
  globalIgnores([
    'dist',
    'storybook-static',
    'design-system',
    '.claude',
    // Deno edge functions have their own tooling (Deno's own linter and
    // type checker). Linting them here produces noise because the config
    // is tuned for the Vite/React frontend.
    'supabase/functions',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          allowExportNames: ['useCarousel', 'useComboboxAnchor', 'useField', 'useFormField', 'useGate1WorkerEditor', 'getLookupDisplayOption'],
        },
      ],
    },
  },

  // Rule 0 (FASE 4 BIS): la edge function `table-query` è consentita SOLO nel
  // chokepoint `src/lib/table-query.ts` (la helper `queryTable`, usata dalla
  // pagina Anagrafiche e dal loader dello schema filtri). Ovunque altrove si
  // devono usare RPC dedicate. Questa regola intercetta `invokeEdgeFunction(
  // "table-query", ...)`. I glob già coperti da altri blocchi no-restricted-syntax
  // sono esclusi qui per non sovrascriverli (nel flat-config l'ultimo blocco che
  // matcha un file rimpiazza interamente la stessa regola).
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/lib/table-query.ts',
      'src/lib/supabase-edge.ts',
      'src/hooks/use-*-board.ts',
      'src/hooks/use-*-data.ts',
      'src/hooks/use-*-pipeline.ts',
      'src/hooks/use-crm-*.ts',
      'src/components/**/*.tsx',
      'src/pages/**/*.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name='invokeEdgeFunction'] > Literal[value='table-query']",
          message:
            'table-query è consentita solo in src/lib/table-query.ts (chokepoint queryTable: Anagrafiche + schema-loader filtri). Non aggiungere nuove chiamate table-query: crea una RPC dedicata (FASE 4 BIS).',
        },
      ],
    },
  },

  // Rule 1: board hooks must use the centralized mutation wrappers instead of
  // calling React Query's useMutation directly. The wrappers encode the rule
  // "don't invalidate the board on per-field saves" (it would cause a refetch
  // per keystroke).
  {
    files: [
      'src/hooks/use-*-board.ts',
      'src/hooks/use-*-data.ts',
      'src/hooks/use-*-pipeline.ts',
      'src/hooks/use-crm-*.ts',
      'src/modules/*/hooks/use-*-board.ts',
      'src/modules/*/hooks/use-*-data.ts',
      'src/modules/*/hooks/use-*-pipeline.ts',
      'src/modules/*/hooks/use-crm-*.ts',
    ],
    ignores: ['src/hooks/use-board-mutations.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@tanstack/react-query',
              importNames: ['useMutation'],
              message:
                'Use useMoveMutation / usePatchMutation / useCreateMutation from @/hooks/use-board-mutations instead. The wrappers ensure per-keystroke saves never trigger a board refetch.',
            },
          ],
        },
      ],
      // Rule 1b: in board hooks, any `useEffect` whose deps array references
      // `selectedXxxId` must also include `realtimeTick` (the tick bumped by
      // useRealtimeBoardSync's `reload` callback). Without it, the open
      // detail panel stays stale when another user modifies the record
      // remotely. See docs/realtime-board-pattern.md (Pattern B). To opt out
      // for an effect that legitimately doesn't fetch data, suppress with a
      // per-line `// eslint-disable-next-line no-restricted-syntax` comment
      // explaining why.
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            "CallExpression:matches([callee.name='useEffect'], [callee.property.name='useEffect']) > ArrayExpression:has(> Identifier[name=/^selected.+Id$/]):not(:has(> Identifier[name='realtimeTick']))",
          message:
            'useEffect with `selectedXxxId` in deps but missing `realtimeTick` — the open detail panel will not refresh on remote changes. Add `realtimeTick` to deps (see docs/realtime-board-pattern.md, Pattern B), or suppress this rule per-line if the effect does not fetch detail data.',
        },
      ],
    },
  },

  // Rule 2: components must not invalidate read caches directly. With React
  // Query as the source of truth, cache lifecycle is owned by queryClient /
  // hook abstractions, not by the components.
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/anagrafiche-api',
              importNames: ['clearReadCaches'],
              message:
                'Do not invalidate read caches from components. Expose a callback on the hook or use queryClient.invalidateQueries.',
            },
            {
              name: '@/lib/write-tracking',
              importNames: ['clearReadCaches'],
              message:
                'Do not invalidate read caches from components. Expose a callback on the hook or use queryClient.invalidateQueries.',
            },
          ],
          ...MODULE_BOUNDARY_RESTRICTIONS,
        },
      ],
    },
  },

  // Input / debounced-input rules (merged in one block to avoid
  // no-restricted-syntax overrides between configs).
  // Severity: "warn" because some selectors flag pre-existing debt we migrate
  // gradually. New occurrences still surface in IDE + CI logs. Promote to
  // "error" once the existing debt is cleared.
  {
    files: ['src/components/**/*.tsx', 'src/pages/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          // FASE 4 BIS — niente table-query nei componenti: usare una RPC
          // dedicata (vedi src/lib/anagrafiche-api.ts). Qui è 'warn' perché
          // condivide severità con le altre regole di questo blocco, ma
          // resta visibile in IDE/CI.
          selector:
            "CallExpression[callee.name='invokeEdgeFunction'] > Literal[value='table-query']",
          message:
            'table-query non va usata nei componenti: crea/usa una RPC dedicata (FASE 4 BIS).',
        },
        {
          // Legacy: useState + onBlur save loses unsaved data when the
          // parent sheet closes before blur fires. Use DebouncedInput.
          selector:
            "JSXOpeningElement[name.name='Input']:has(JSXAttribute[name.name='onBlur'])",
          message:
            'Use <DebouncedInput committedValue={...} onSave={...}> instead of <Input ... onBlur=...>. The legacy pattern loses unsaved data when the sheet closes before onBlur fires.',
        },
        {
          selector:
            "JSXOpeningElement[name.name='Textarea']:has(JSXAttribute[name.name='onBlur'])",
          message:
            'Use <DebouncedTextarea committedValue={...} onSave={...}> instead of <Textarea ... onBlur=...>.',
        },
        {
          // A transient `disabled` (true during save) forces the browser to
          // fire blur and kicks the user out of the field mid-typing.
          selector:
            "JSXOpeningElement[name.name='DebouncedInput'] > JSXAttribute[name.name='disabled']",
          message:
            'Do not pass `disabled` to DebouncedInput. A transient disable during save kicks focus out mid-typing. Multiple in-flight saves are fine (last write wins). For permanent disable (permissions), suppress this rule per-line with an explanation.',
        },
        {
          selector:
            "JSXOpeningElement[name.name='DebouncedTextarea'] > JSXAttribute[name.name='disabled']",
          message:
            'Do not pass `disabled` to DebouncedTextarea. A transient disable during save kicks focus out mid-typing.',
        },
        {
          // Catch hand-rolled "debounced autosave" patterns: an <Input> whose
          // `disabled` prop is derived from a "saving" state variable. The
          // pattern looks fine but causes focus loss mid-typing.
          // Prefer <DebouncedInput committedValue=... onSave=...> instead.
          selector:
            "JSXOpeningElement[name.name='Input'] > JSXAttribute[name.name='disabled'] > JSXExpressionContainer BinaryExpression > Identifier[name=/^(saving|isSaving)/i]",
          message:
            'Looks like a hand-rolled debounced save (Input with `disabled` tied to a `savingX` state). Use <DebouncedInput committedValue={...} onSave={...}> which handles debounce + flush + anti-focus-loss centrally.',
        },
        {
          // Catch "save on every keystroke" patterns: an <Input> or <Textarea>
          // whose onChange handler directly calls a function whose name ends
          // in Patch, Save, Update, Mutate (e.g. onPatchCard, saveField,
          // updateRecord). Each keystroke triggers a network round-trip ->
          // visible lag while typing.
          // Excludes names starting with "debounced" (e.g. debouncedSave),
          // which are local already-debounced setters.
          selector:
            "JSXOpeningElement[name.name=/^(Input|Textarea)$/] > JSXAttribute[name.name='onChange'] CallExpression > Identifier[name=/^(?!debounced)(.*)?(Patch|Save|Update|Mutate|patchField|saveField|updateField|patchCard|patchPresence)$/i]",
          message:
            'Looks like save-on-every-keystroke (Input/Textarea onChange calling patch/save/update directly). Each character fires a network request and the field lags. Use <DebouncedInput committedValue={...} onSave={...}> (or DebouncedTextarea) which debounces 300ms and flushes on unmount.',
        },
        {
          // FASE 4 — Rule "draft setter without isEditing guard" (bug class:
          // realtime echo wipes user's in-progress edits when a setXxxDraft
          // runs unconditionally inside a useEffect that re-fires on every
          // server row change).
          //
          // The rule flags any `setXxxDraft(...)` call appearing as an
          // ExpressionStatement directly inside a useEffect arrow body —
          // i.e. NOT inside an `if (!isEditing...) return` guard, NOT inside
          // a setState updater function with its own dirtyRef check.
          //
          // How to suppress per-line (with a comment explaining the actual
          // guard used — either an `if (!isEditingX) return` earlier in the
          // effect, a per-field dirtyRef.current check, or react-hook-form):
          //
          //   // eslint-disable-next-line no-restricted-syntax -- guarded by
          //   // `if (!isEditingHeader) return` above; safe to resync.
          //   setHeaderDraft(...)
          //
          // See docs/audits/audit-draft-resync.md for the bug class detail
          // and docs/realtime-bug-class-plan.md FASE 3/4 for the prevention
          // strategy.
          selector:
            "CallExpression:matches([callee.name='useEffect'], [callee.property.name='useEffect']) > ArrowFunctionExpression > BlockStatement > ExpressionStatement > CallExpression[callee.name=/^set.*Draft$/]",
          message:
            'setXxxDraft() called unconditionally inside useEffect — server-state echo can wipe user edits in progress. Add an `if (!isEditingXxx) return` early-return, use a per-field dirtyRef, or migrate to react-hook-form. Suppress per-line with `// eslint-disable-next-line no-restricted-syntax -- guarded by <explanation>` once you have a real guard.',
        },
        {
          // FASE 4 — Rule "useEffect with setDraft and row-like deps" (same
          // bug class as the rule above, but matched at the deps array level
          // so the warning fires only when the effect depends on a known
          // server-row identifier: card, serverRow, workerRow, *Row, *Record).
          // More precise — flags the exact shape audited in
          // docs/audits/audit-draft-resync.md (Findings #1, #2, #3...).
          //
          // Suppress per-line on the offending useEffect call:
          //
          //   // eslint-disable-next-line no-restricted-syntax -- effect uses
          //   // a per-field dirtyRef.current check, not a top-level guard
          //   useEffect(() => { ... }, [card, dirtyRef]);
          selector:
            "CallExpression:matches([callee.name='useEffect'], [callee.property.name='useEffect']):has(ArrayExpression > Identifier[name=/^(.*Row|.*Record|card|serverRow)$/]) ArrowFunctionExpression CallExpression[callee.name=/^set.*Draft$/]",
          message:
            'useEffect with `set*Draft` and a server-row dep (card / *Row / *Record / serverRow) — realtime echoes will wipe user edits unless guarded. Add an `if (!isEditingXxx) return`, use a per-field dirtyRef, or migrate to react-hook-form. Suppress per-line with an explanation of which guard is in place.',
        },
        {
          // FASE 4 — Rule "useState mirror from prop without sync" (bug
          // class: a `useState(buildDraft(card))` initializer captures the
          // prop value only on first render. When `card` changes from a
          // realtime update, the local state stays stale — and the next
          // user edit overwrites the server update on save).
          //
          // Flags `useState(...)` whose argument expression references
          // identifiers like `card`, `serverRow`, `workerRow`, `selectedXxx`
          // (anywhere inside the initializer, including nested calls like
          // `useState(toInputValue(card?.x))`).
          //
          // Preferred fix: use <DebouncedInput committedValue={card?.x}
          // onSave={...}> for inputs (already handles re-sync on prop
          // change), or derive the value directly from the prop for
          // read-only displays. For genuinely-local state that must seed
          // from a prop only once, suppress per-line with an explanation:
          //
          //   // eslint-disable-next-line no-restricted-syntax -- seeded
          //   // once on mount on purpose; user choice supersedes server
          //   const [val, setVal] = useState(toInputValue(card?.x))
          selector:
            "VariableDeclarator > CallExpression:matches([callee.name='useState'], [callee.property.name='useState']) Identifier[name=/^(card|serverRow|workerRow|selectedWorkerRow|selectedCard|defaults)$/]",
          message:
            'useState() initializer reads from a server-driven prop (card / *Row / defaults) without a re-sync mechanism. After a realtime update the local state stays stale and the next save overwrites the new server value. Prefer <DebouncedInput committedValue={...} onSave={...}> (auto-resyncs) or derive directly from the prop. Suppress per-line if the mount-time seed is intentional.',
        },
        {
          // Detail wrappers must declare a `key` tied to the selected entity
          // so debounced inputs inside reset their local draft when switching
          // record. The rule only fires for top-level wrappers (in *-view
          // files); generic composites used as children of a keyed parent
          // are not matched here.
          //
          // Naming convention enforced: the project uses two prefixes for
          // selection-bound detail wrappers — `Detail*` (DetailSheet,
          // DetailPanel, DetailShell) and `Scheda*` (SchedaColloquioPanel
          // and similar Italian-named editors). Both convey "this component
          // edits the currently selected record" and require a `key=` reset.
          // If you add a new selection-bound wrapper, name it with one of
          // these prefixes so the rule catches missing keys; if you name it
          // differently, you must add a key= manually (no rule will help).
          selector:
            "Program > :matches(FunctionDeclaration, VariableDeclaration) JSXOpeningElement[name.name=/^(?:Detail.*|Scheda.*)(?:Sheet|Panel|Shell)$/]:not(:has(JSXAttribute[name.name='key']))",
          message:
            'Detail/Scheda wrappers (Detail*Sheet/Panel/Shell or Scheda*Sheet/Panel/Shell) at the view level must declare key={selectedCardId ?? "__empty__"} so debounced inputs inside reset their local draft when switching cards.',
        },
        {
          // FASE 5 BIS — migrazione a form-context. `committedValue` compare
          // SOLO su <DebouncedInput>/<DebouncedTextarea> usati direttamente.
          // Fuori dal toolkit (src/components/forms/field-components.tsx) ogni
          // occorrenza è un campo cablato a mano che deve diventare
          // <FieldInput name="...">/<FieldTextarea name="..."> (react-hook-form
          // + useAutoSaveForm).
          //
          // STATO (FASE 5 BIS chiusa): 22/24 aree convertite. Le occorrenze
          // residue vivono SOLO nei 4 god-component del dettaglio lavoratore —
          // gate1-view, lavoratori-cerca-view, ricerca-workers-pipeline-view,
          // worker-pipeline-summary-cards — che riceveranno il form-context
          // durante il refactor D2 (split god-component, vedi docs/audit-response.md).
          // Resta 'warn': la migrazione di quei file è scope di D2, non un TODO
          // sciolto. Promuovere a 'error' SOLO a valle di D2 (lista vuota).
          // Limite flat-config: questi selettori condividono il blocco con le
          // regole FASE 4 (debito a 'warn'), quindi non è separabile la severità
          // per-selettore senza spezzarle.
          selector: "JSXAttribute[name.name='committedValue']",
          message:
            'Campo cablato a mano (DebouncedInput committedValue=...). Usa <FieldInput name="...">/<FieldTextarea name="..."> con useAutoSaveForm (form-context, FASE 5 BIS).',
        },
        {
          // FASE 5 BIS — `useDebouncedSave` è il salvataggio per-campo cablato a
          // mano: ogni file che lo importa ha campi NON ancora migrati a
          // form-context. La firma autosave (debounce + dirty + resync) ora vive
          // in useAutoSaveForm + Field*. 'warn' durante la migrazione.
          selector:
            "ImportDeclaration[source.value='@/hooks/use-debounced-save']",
          message:
            'Salvataggio per-campo a mano (useDebouncedSave). Migra i campi a form-context: useAutoSaveForm + <FieldInput/FieldTextarea/...> (FASE 5 BIS).',
        },
      ],
    },
  },

  // FASE 5 BIS — ENFORCEMENT: i file convertiti a form-context non possono
  // regredire. Qui i selettori FASE5 (committedValue / import useDebouncedSave)
  // sono 'error'. Fuori restano SOLO i file infrastrutturali che IMPLEMENTANO il
  // pattern (forms/field-components, ui/debounced-input, hooks/use-debounced-save)
  // e i file di test.
  // Nota flat-config: questo blocco SOSTITUISCE no-restricted-syntax per questi
  // file (le regole FASE 4 a 'warn' non si applicano qui).
  // I campi di dettaglio di cerca/ricerca/gate1/summary sono su useAutoSaveForm +
  // useController. Restano alcuni stati locali NON-form documentati inline, che
  // non sono salvataggi per-campo e hanno guard espliciti di anti-clobber:
  //   - ricerca: familyAddressDraft (mirror di display, save esplicito + re-sync);
  //   - gate1-view: gateDraft (merge per-campo anti-echo);
  //   - crm-assegnazione: schedulingDraft (form edit-mode con guard isEditing).
  {
    files: [
      'src/modules/crm/components/crm/cards/stato-lead-card.tsx',
      'src/components/crm/cards/selection-details-card.tsx',
      'src/modules/crm/components/crm/cards/onboarding-context-card.tsx',
      'src/modules/crm/components/crm/cards/onboarding-decisione-lavoro-card.tsx',
      'src/modules/crm/components/crm/cards/onboarding-card.tsx',
      'src/modules/crm/components/crm/famiglia-processo-detail-content.tsx',
      'src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx',
      'src/components/gestione-contrattuale/variazioni-board-view.tsx',
      'src/components/gestione-contrattuale/chiusure-board-view.tsx',
      'src/modules/support/components/riattivazioni-board-view.tsx',
      'src/components/gestione-contrattuale/rapporto-detail-panel.tsx',
      'src/components/ricerca/ricerca-detail-view.tsx',
      'src/components/ricerca/scheda-colloquio-panel.tsx',
      'src/components/payroll/contributi-inps-view.tsx',
      'src/components/payroll/payroll-overview-view.tsx',
      'src/modules/support/components/prove-colloqui/prove-colloqui-view.tsx',
      'src/components/lavoratori/address-section-card.tsx',
      'src/components/lavoratori/availability-calendar-card.tsx',
      'src/components/lavoratori/experience-references-card.tsx',
      'src/components/lavoratori/worker-profile-header.tsx',
      'src/components/lavoratori/lavoratori-cerca-view.tsx',
      'src/components/ricerca/ricerca-workers-pipeline-view.tsx',
      'src/components/ricerca/worker-pipeline-summary-cards.tsx',
      'src/components/lavoratori/gate1-view.tsx',
      'src/modules/crm/components/crm/crm-assegnazione-view.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='committedValue']",
          message:
            'FASE 5 BIS (enforced): questo file è form-context. Non reintrodurre <DebouncedInput committedValue=...>: usa <FieldInput/FieldTextarea name="...">.',
        },
        {
          selector:
            "ImportDeclaration[source.value='@/hooks/use-debounced-save']",
          message:
            'FASE 5 BIS (enforced): questo file è form-context. Non reintrodurre useDebouncedSave: usa useAutoSaveForm + Field*.',
        },
      ],
    },
  },

  // Rule 3 (domain modules): consumers outside src/modules/ must use public
  // barrels (@/modules/<dominio>), never deep .api.ts / .adapters.ts imports.
  // Module-internal files live under src/modules/** and are excluded here;
  // cross-module deep-import enforcement inside modules lands with U3+.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/modules/**', 'src/components/**', 'src/pages/**'],
    rules: {
      'no-restricted-imports': ['error', MODULE_BOUNDARY_RESTRICTIONS],
    },
  },
])
