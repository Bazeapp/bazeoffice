---
title: "RecordCard secondary metadata: share the Footer row, don't add a body row"
date: 2026-07-09
category: design-patterns
module: "ricerca board card (src/modules/ricerca/components/ricerca-active-search-card.tsx)"
problem_type: design_pattern
component: ricerca
severity: low
applies_when:
  - "Adding secondary metadata (assignee/recruiter avatar, owner, badge) to a RecordCard list card"
  - "You need the extra info without growing card height or adding a body row"
  - "The card already has a RecordCard.Footer with a leftSlot (e.g. a deadline)"
  - "Mirroring the assegnazione card layout on another board (ricerca, crm)"
related_components:
  - "src/modules/ricerca/components/ricerca-board-view.tsx"
  - "src/modules/crm/components/crm-assegnazione-view.tsx"
  - "src/components/shared-next/record-card.tsx"
  - "src/hooks/use-operatori-options.ts"
tags: [record-card, footer, avatar, recruiter, ricerca, shared-next, view-model, design-pattern]
---

# RecordCard secondary metadata: share the Footer row, don't add a body row

## Context

`RecordCard` (`src/components/shared-next/record-card.tsx`) is the shared "record in a list" card used across every board (famiglia, ricerca, lavoratore, assegnazione, etc.). It is a compound component with three regions:

- **`Header`** — `title`, an optional left `media` slot (typically an Avatar), an optional `subtitle`, and a `rightSlot`.
- **`Body`** — a vertical stack (`flex flex-col gap-1.5`) of `CardMetaRow`s.
- **`Footer`** — a single horizontal row rendered with `flex items-center justify-between`: a `leftSlot` (min-width, can truncate) and a `shrink-0` `rightSlot`.

On the ricerca board card (`RicercaActiveSearchCard`) we wanted to show the assigned recruiter as an avatar, styled exactly like the `assegnazione` card (`CrmAssegnazioneView` / `AssegnazioneSearchCard`): colored ring, initials, bottom-right.

Two naive attempts each broke the layout:

1. **Avatar as a dedicated body row** (avatar + full name on its own `CardMetaRow`). This added a whole extra line → the card grew taller than every sibling card in the column. Kanban cards need to stay compact and uniform.
2. **Avatar in the header `media` slot** (top-left, next to the title). It read as the *family's* avatar, and the user wanted it bottom-right to match `assegnazione`.

The clean fix used a slot that already existed and already occupies its own row: the **Footer**.

## Guidance

When you need to add secondary metadata (an assignee avatar, a status chip, a small badge) to a `RecordCard` list card **without making the card taller**, put it in `RecordCard.Footer` and let the footer row carry two things at once:

- Move an existing single-value body row (here, the deadline) **out of `Body` and into the footer `leftSlot`**.
- Put the new metadata in the footer `rightSlot`.

Because `Footer` is one flex row with `justify-between`, `leftSlot` and `rightSlot` sit on the **same line**. You have traded one body row for one footer row — net vertical change is zero. The footer is the idiomatic home for a shared metadata row precisely because it is already a two-column `justify-between` layout.

Two supporting rules that keep this clean:

- **Pass the card a precomputed view-model, not a raw model.** `RicercaActiveSearchCard` takes `recruiter?: { avatar, ringClassName, label }`, not `recruiterLabel: string` and not an `OperatoreOption`. The card renders exactly what it is handed and stays decoupled from the operatori data model. The parent view (`RicercaBoardView`) builds a `Map<operatorId, RicercaCardRecruiter>` once and looks it up per card.
- **Reuse the existing avatar-styling data.** `OperatoreOption` (from `use-operatori-options.ts`) already carries `avatar` (initials) and `avatarBorderClassName` (a legacy `after:border-<color>` class). Convert it to a ring class with `toAvatarRingClass` and feed `Avatar size="md" fallback={initials} className={ringClass} title={label}` — identical to how the assegnazione card does it.

## Why This Matters

- **Uniform card height is a hard visual constraint on a kanban board.** Cards of varying height make columns look ragged and break the scan. Adding metadata "for free" by reusing an already-present row is the difference between a clean board and a lumpy one.
- **The Footer already encodes the right layout.** `justify-between` + a `shrink-0` right slot is exactly "primary metadata left, small artifact right." Reaching for a new body row when the footer is empty (or under-used) is a missed reuse of the compound's own affordance.
- **The view-model boundary keeps cards portable.** By handing the card `{ avatar, ringClassName, label }` instead of an operatore, the card has no dependency on how recruiters are fetched, cached, or shaped. The same card could later show any "assigned person" from any source.

## When to Apply

Apply this pattern when **all** of the following hold:

- You are adding a small, secondary artifact (avatar, status dot, tiny badge, timestamp) to a list/kanban `RecordCard`.
- The card already has a natural single-value line — a deadline, a date, a short status — that can move into the footer `leftSlot`.
- Keeping the card the same height as its siblings matters (kanban columns, dense lists).

Do **not** apply it when:

- The new content is genuinely primary and deserves its own row (then a body row is correct, and accept the height).
- The footer `leftSlot` would become crowded or need to wrap — the whole point is one line; if two items don't fit side by side, reconsider.
- The artifact belongs next to the title semantically (a type badge, a "Nuova/Sostituzione" chip) — that is the header `rightSlot`, not the footer.

## Examples

### The `RecordCard.Footer` primitive (the slot that makes this work)

From `src/components/shared-next/record-card.tsx` — one row, two slots, `justify-between`:

```tsx
function RecordCardFooter({ leftSlot, rightSlot, className }: RecordCardFooterProps) {
  return (
    <div
      data-slot="record-card-footer"
      className={cn(
        "flex min-w-0 items-center justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">{leftSlot}</div>
      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </div>
  );
}
```

### Before — deadline in the body, recruiter as a separate row (taller card)

Conceptually, the first attempt kept the deadline inline in `Body` and added the recruiter as its own line:

```tsx
<RecordCard>
  <RecordCard.Header title={data.nomeFamiglia} />
  <RecordCard.Body>
    {/* ...tag badges... */}
    <CardMetaRow icon={<Clock3Icon />}>{oreGiorni}</CardMetaRow>
    <CardMetaRow icon={<MapPinIcon />}>{data.zona}</CardMetaRow>
    <CardMetaRow icon={<CalendarIcon />}>{data.deadline}</CardMetaRow>   {/* deadline: body row */}
    {recruiter ? (                                                        {/* + EXTRA row -> taller card */}
      <CardMetaRow>
        <Avatar size="md" fallback={recruiter.avatar} className={recruiter.ringClassName} />
        <span>{recruiter.label}</span>
      </CardMetaRow>
    ) : null}
  </RecordCard.Body>
</RecordCard>
```

### After — deadline + recruiter share the footer row (no added height)

From `src/modules/ricerca/components/ricerca-active-search-card.tsx` — the deadline moved into the footer `leftSlot`, the recruiter avatar sits in `rightSlot`, both on one line:

```tsx
<RecordCard>
  <RecordCard.Header title={data.nomeFamiglia} />
  <RecordCard.Body>
    {/* ...tag badges... */}
    <CardMetaRow icon={<Clock3Icon />}>{oreGiorni}</CardMetaRow>
    <CardMetaRow icon={<MapPinIcon />}>{data.zona}</CardMetaRow>
  </RecordCard.Body>
  <RecordCard.Footer
    leftSlot={
      hasUrgentDeadline ? (
        <div className="flex min-w-0 items-center gap-2 text-[12.5px]">
          <CalendarIcon className="size-3 shrink-0 text-red-600" />
          <span className="min-w-0 truncate font-medium text-red-600">
            {data.deadline}
          </span>
        </div>
      ) : (
        <CardMetaRow icon={<CalendarIcon />}>{data.deadline}</CardMetaRow>
      )
    }
    rightSlot={
      recruiter ? (
        <Avatar
          size="md"
          fallback={recruiter.avatar}
          className={recruiter.ringClassName}
          title={recruiter.label}
        />
      ) : undefined
    }
  />
</RecordCard>
```

### The view-model prop (card stays decoupled)

The card takes a precomputed recruiter view-model, not a raw operatore or a bare string:

```tsx
export type RicercaCardRecruiter = {
  avatar: string        // initials, e.g. "MR"
  ringClassName: string // e.g. "ring-2 ring-sky-500"
  label: string         // full name, shown as native tooltip
}

export function RicercaActiveSearchCard({
  data, onClick, className, recruiter,
}: {
  data: RicercaBoardCardData
  onClick?: () => void
  className?: string
  recruiter?: RicercaCardRecruiter | null
}) { /* ... */ }
```

### Building the view-model in the parent (reusing `OperatoreOption` + `toAvatarRingClass`)

From `src/modules/ricerca/components/ricerca-board-view.tsx` — build the lookup map once from `operatorOptions`; `option.avatar` is already initials, and `toAvatarRingClass` converts the legacy border class:

```tsx
function toAvatarRingClass(legacy: string) {
  // Convert legacy `after:border-X-Y` -> new `ring-2 ring-X-Y` for ui Avatar.
  return legacy.replace(/after:border-/g, "ring-2 ring-")
}

const recruitersById = React.useMemo(
  () =>
    new Map<string, RicercaCardRecruiter>(
      operatorOptions.map((option) => [
        option.id,
        {
          avatar: option.avatar,
          ringClassName: toAvatarRingClass(option.avatarBorderClassName),
          label: option.label,
        },
      ]),
    ),
  [operatorOptions],
)

// per card:
<RicercaActiveSearchCard
  data={data}
  recruiter={data.operatorId ? (recruitersById.get(data.operatorId) ?? null) : null}
/>
```

### The reference implementation to align with

`src/modules/crm/components/crm-assegnazione-view.tsx` (`AssegnazioneSearchCard`) is the pattern this change matched: deadline in the footer `leftSlot`, the assignee avatar in the footer `rightSlot` (there wrapped in a `Select` trigger for inline reassignment), same `Avatar size="md"` + ring styling.

```tsx
<RecordCard.Footer
  leftSlot={
    <CardMetaRow icon={<CalendarIcon />}>{data.deadlineMobile}</CardMetaRow>
  }
  rightSlot={
    <Select value={assigneeId} onValueChange={/* ... */}>
      <SelectTrigger /* round, borderless trigger */ title={assigneeLabel}>
        <Avatar size="md" fallback={assigneeAvatar} className={getAssigneeAvatarBorderClass(assigneeId)} />
      </SelectTrigger>
      {/* ...options... */}
    </Select>
  }
/>
```

The ricerca card's avatar is read-only (a plain `Avatar` with a `title` tooltip) rather than an interactive `Select`, but the footer layout and avatar styling are deliberately identical, so the two boards look consistent.

## Related

- **`RecordCard` compound** — `src/components/shared-next/record-card.tsx`. `Header` (`media`, `title`, `subtitle`, `rightSlot`), `Body`, `Footer` (`leftSlot` + `rightSlot`, `justify-between`).
- **After-state card** — `src/modules/ricerca/components/ricerca-active-search-card.tsx`.
- **View-model builder** — `src/modules/ricerca/components/ricerca-board-view.tsx` (`recruitersById`, `toAvatarRingClass`).
- **Operatore option source** — `src/hooks/use-operatori-options.ts` (`OperatoreOption` with `avatar` + `avatarBorderClassName`).
- **Reference card** — `src/modules/crm/components/crm-assegnazione-view.tsx` (`AssegnazioneSearchCard`, `OperatorSelectOption`).
- **See also** — [`stato-selezione-ordering-canonical-module.md`](stato-selezione-ordering-canonical-module.md): sibling ricerca design-pattern (a different concern — canonical ordering of selection states); no shared files.

### Maintainability caveat (follow-up worth doing)

`toAvatarRingClass` (convert legacy `after:border-<color>` → `ring-2 ring-<color>`) is currently **copy-pasted across ~5 files**: `crm-assegnazione-view.tsx`, `ricerca-board-view.tsx`, `ricerca-detail-view.tsx`, `gate-referente-cards.tsx`, and it briefly lived in the card too. The variants aren't even byte-identical (one uses `replace(/^after:border-/, ...)`, another `replace(/after:border-/g, ...)`). This is a clear dedup opportunity: extract a single `toAvatarRingClass` (and ideally the whole `{ avatar, ringClassName, label }` derivation) into `use-operatori-options.ts` or a shared avatar util, and have all consumers import it. Do this as a separate cleanup so it doesn't bloat the feature change.
