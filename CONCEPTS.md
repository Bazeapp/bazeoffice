# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Backoffice domain modules

Route-aligned modules under `src/modules/<slug>/` using **Italian slugs from piano §6 / AGENTS.md**: `anagrafiche`, `support`, `crm`, `lavoratori`, `ricerca`, `gestione-contrattuale`, `rapporti`, `payroll`. Boundaries follow backoffice navigation in `src/routes/app-routes.ts`. The same entity may appear in both the CRUD UI module and a workflow module.

### Module anatomy
The prescribed layout inside each domain module: an internal repository file that is the sole Supabase caller for that domain, an adapters file that is the sole place database column names appear, thin query and mutation wrappers, and a public barrel that exports types and fetchers but never the repository or adapters. Shared cross-domain infrastructure lives outside modules in shared library code.

### Anagrafiche module
Generic database CRUD UI — AgGrid views over raw tables (all anagrafiche tabs). Entity CRUD data lives in home domain modules; anagrafiche imports via public barrels.

### Support module
Customer support: tickets, prove e colloqui, riattivazioni. Routes under `/customer-support/*`.

### Crm module
Famiglie workflow: pipeline famiglie, assegnazione, richieste attivazione. Routes `/pipeline` and `/assegnazione`.

### Lavoratori module
Worker workflow: Gate 1, Gate 2, cerca lavoratori. Routes `/gate-1`, `/gate-2`, `/cerca-lavoratori`.

### Ricerca module
Matching and search: ricerca board/detail, processi matching, selezioni. Routes `/ricerca`.

### Gestione-contrattuale module
Contract lifecycle boards: assunzioni, chiusure, variazioni. Excludes rapporti (Rapporti module) and riattivazioni (Support module).

### Rapporti module
Rapporti lavorativi list/detail/board. Route `/gestione-contrattuale/rapporti-lavorativi`.

### Payroll module
Cedolini and contributi INPS. Routes `/payroll/cedolini` and `/payroll/contributi-inps`.
## Operator roles

Staff who authenticate into BazeOffice. Each operator has one or more role tokens stored in `operatori.ruolo`. The canonical tokens:

| Token | Meaning |
| --- | --- |
| `customer` | Customer support |
| `sales` | Sales |
| `recruiter` | Recruiter |
| `payroll` | Payroll |

Famiglia and lavoratore are domain entities, not BazeOffice login roles — families interact through a separate webapp in production.

## Contextual comments (commenti contestuali)

Cross-cutting collaboration feature (BAZ-83). Each comment anchors to a domain entity (`entity_type` + `entity_id`) and is visible on that entity and its descendants in the UI via `commenti_scope` rows computed at insert time from real FK relationships — not by copying comments across tables.

### Chip bersaglio
The composer’s explicit write target. The operator chooses which hierarchy level receives a new root comment before sending. Default is the page focus (most specific entity). Must stay synchronized with the expanded accordion section.

### Phase note
A `comment_type = 'phase_note'` comment on `lavoratore`, auto-tagged from Gate 1 (`gate_1`) or Gate 2 (`gate_2`) surfaces. Pinned at the top of the lavoratore section. Per-ricerca fit judgments are free comments on `candidatura`, not phase notes.

### Da entità collegate
Aggregated panel section showing comments from descendant entities of the current focus. The only section where individual comments carry an origin badge (e.g. ↗ da Cedolino).

## Notification center (centro notifiche)

Cross-cutting collaboration feature (BAZ-84). Actionable to-dos for operators generated from @mentions and thread replies — not a general activity feed. Rows live in `notifiche`, separate from per-comment read state in `commenti_letti`.

### Notifica lifecycle
Three states for a notification row: **Non letta** (unseen), **Letta** (seen via click or mark-all-read — not yet handled), **Risolta** (handled via explicit Risolvi or by replying in that thread). Click never resolves; reply bulk-resolves all open notifiche for that operator on the thread.

### Da risolvere
The default notification-center tab: all unresolved rows (letta and non letta). The tab counter is this count; the sidebar badge instead counts only non lette.

## Realtime write-sync

### Write tracking
The mechanism that counts a client's in-flight local writes and records when the last one completed, so the rest of the app can tell "our own change" apart from a change made elsewhere. The live count is floored at zero — it never goes negative — and "time since the last local write" reads as effectively infinite until the first write completes. A failed write releases its slot in the count but is not recorded as a local write; only a successful write updates the timestamp.

### Echo suppression
The rule that a board ignores a realtime change event that is merely the echo of the client's own recent local write, for a short window after that write. Without it the board would reload and clobber a value the user is still editing. Echo suppression takes its signals from Write tracking: it holds reloads while local writes are in flight, and discards echoes that arrive within the window after the last local write.

### Realtime bug class
The family of failures where a board's detail field goes stale or vanishes because three conditions coincide: the board query fetches only a preview set of columns, a separate loader fetches the fuller detail, and the two share state — so a remote change event refreshes the board in its preview shape and drops the detail. Write tracking and Echo suppression are the guardrails that stop the client's own writes from triggering this class. Pattern A and Pattern B are the two remedies for it.

### Pattern A
The merge-preserving remedy for the Realtime bug class, used when the board and its detail share one cache: the board's row-to-card mapping restores any detail-only field the fresh preview payload omits from the previously-loaded card, while a field the payload does carry — even when cleared to empty — wins. The detail survives a preview-shaped refresh without any separate signal.
*Avoid:* merge-preserving pattern

### Pattern B
The trigger-based remedy for the Realtime bug class, used when the detail lives in separate state rather than the shared cache: each silent realtime reload bumps a counter that the detail-loading effect depends on, so the open detail re-fetches whenever a remote change arrives. Chosen over Pattern A precisely when board and detail do not share one cache.
*Avoid:* realtimeTick-trigger pattern

## Stabilization refactor (FASE 5)

Named phases from `docs/realtime-bug-class-plan.md`, in scope for the large-file split program (`docs/brainstorms/2026-07-06-large-file-split-requirements.md`).

### FASE 5 BIS
Form field context program: react-hook-form + shadcn Form + `useAutoSaveFormFields` + context-aware Field components (`FieldInput`, `FieldMultiSelect`, etc.). Replaces hand-rolled `on*Change` + draft handlers so "save never fired" bugs are structurally impossible. Infrastructure partially shipped; remaining work is pilot, panel roll-out, and lint.

### FASE 5 TER
God-hook and god-component split program: break `use-lavoratori-data` and `use-selected-worker-editor` into responsibility hooks; split giant views; apply `React.memo`/`useCallback`; soft ESLint size warnings (500 LOC hooks, 800 LOC components).

### FASE 5 QUATER
Residual complex forms not covered by BIS roll-out: profile header, multi-field submit modals, cross-field validation.

### Target B
Characterization testing workflow from `docs/testing-strategy.md`: pin observable behavior at a file's public seam just before splitting it; split under green; no DOM snapshots.

### Smart hook + thin shell
View split pattern for god-components: extract orchestration logic into a dedicated hook (e.g. `use-gate1-view`); the view file becomes a thin composer that wires hooks to presentational sub-components.
