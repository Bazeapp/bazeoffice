# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

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
