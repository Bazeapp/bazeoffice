---
title: "Map faceted filters: pass-through semantics for missing data (vs strict chip filters)"
date: 2026-07-02
category: design-patterns
module: "ricerca search map filters (src/components/ricerca/ricerca-workers-map-filters.ts)"
problem_type: design_pattern
component: filters
severity: low
applies_when:
  - "Adding faceted chip filters over records where some fields are null/unknown or not classifiable"
  - "Deciding whether a filter should hide records with missing data or let them through"
  - "Deriving a boolean/bucket filter value from a multi-value or free-text field"
  - "Populating a multiselect filter from a large or dirty lookup dictionary"
tags: [filters, faceted, pass-through, chip-filter, map, ricerca, semantics, design-pattern]
---

# Map faceted filters: pass-through semantics for missing data

## Context

BAZ-27 added faceted filters (Genere, Automuniti, Nazionalità, Età) to the ricerca map, reusing the established chip-filter pattern (see the cross-repo learnings `filtri-toolbar-checkboxchip` and `cedolini-derivazioni-pure-badge-filtro`, lifted from BAZ-36). The pure module is `src/components/ricerca/ricerca-workers-map-filters.ts`.

The map's records (`lavoratori`) have **incomplete data**: `sesso` may be "Preferisco non dire" or null, `come_ti_sposti` may be empty, `eta` may be null. The design question: should a chip filter **hide** a worker whose value is unknown, or **let it through**? The cedolini precedent (`payroll/cedolini-filters.ts`) uses *strict* semantics ("a deselected value hides matching cards; an empty group hides everything"). The map deliberately does the opposite for most groups.

## Guidance

**Pass-through: missing or unclassifiable data never hides a record — except a filter the user has explicitly narrowed to specific present values.**

Concretely, in `ricerca-workers-map-filters.ts`:

- **Chip groups (Genere, Automuniti, Età)** use `matchesChipGroup(derived, selected)`: a worker passes if the selection is **empty** (no constraint) OR the derived value is **null** (not classifiable → pass-through) OR the selection **includes** the derived value.
  - `deriveGenere` canonicalizes to `"Donna" | "Uomo" | null` (case-insensitive); anything else, incl. "Preferisco non dire" and null → `null` → pass-through.
  - `deriveEtaBucket(eta)` returns a bucket key or `null` when `eta` is null/NaN or below the first band → pass-through.
  - `deriveAutomuniti(comeTiSposti)` returns `"Automunito" | "Non automunito" | null`; missing/empty transport → `null` → pass-through. (Derived by checking the list includes the exact lookup label `"Ho la patente e la macchina"`.)
- **Nazionalità (multiselect) is the exception** — strict: an empty selection means "no constraint" (all pass), but once the user selects nationalities, a worker with a null/unknown nationality **cannot match** and is excluded. This is correct: the user is explicitly asking for a value that must be present.
- **Options come from the data, not the dictionary.** `deriveNazionalitaOptions(workers)` lists the distinct nationalities **present among loaded workers** (trimmed, sorted), not the full 144-value `lookup_values` dictionary (which is large and dirty — case/duplicate variants). Fewer, relevant options; a value not on the current map isn't offerable.
- **"Non-default" indicator.** `hasActiveAdvancedFilters` compares state to the all-selected default (blue dot on the collapse toggle when any group deviates or a nationality is selected).

## Why This Matters

Strict semantics on incomplete data silently make workers **disappear** the moment a filter is touched — a recruiter narrowing by "Donna" would lose every worker whose `sesso` is null, without any signal. Pass-through keeps the filter a *narrowing-of-known-values* tool: it only removes workers it can positively classify into a deselected bucket. The Nazionalità exception is intentional because that filter's whole purpose is to require a specific present value.

Keeping the semantics in a **pure, unit-tested module** (`ricerca-workers-map-filters.test.ts`) pins these edge decisions — the boundary tests (età 18/29/30/59/60, null, <18; automuniti with missing transport; genere pass-through for "Preferisco non dire"/null; nazionalità null-excluded-under-active-selection) are the executable spec.

## When to Apply

- Faceted chip filters over records with optional/dirty fields — default to pass-through so missing data doesn't vanish records.
- Use strict semantics only for a filter whose intent is "must equal one of these" (typically an explicit multiselect), and make the exclusion of unknowns a conscious, tested decision.
- Derive multiselect options from the present dataset when the backing dictionary is large or unclean.

## Examples

```ts
// Pass-through chip group: empty selection OR null derived value → passes
function matchesChipGroup(derived: string | null, selected: readonly string[]) {
  if (selected.length === 0) return true   // no constraint
  if (derived == null) return true         // unknown → never hidden
  return selected.includes(derived)
}

// Strict multiselect: active selection excludes unknowns
function matchesNazionalita(worker, selected) {
  if (selected.length === 0) return true
  const nazionalita = (worker.nazionalita ?? "").trim() // trim = align with options
  return nazionalita.length > 0 && selected.includes(nazionalita)
}
```

Related: chip-filter toolbar pattern and badge↔filter derivation parity — see `filtri-toolbar-checkboxchip` and `cedolini-derivazioni-pure-badge-filtro` (vault `/learning`). This map explicitly diverges from cedolini's strict "empty hides all" for the chip groups.
