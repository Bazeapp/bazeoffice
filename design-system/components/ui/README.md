# Baze UI — refresh primitives

Drop-in replacements for `src/components/ui/*` in the bazeoffice app. Built on the same Radix primitives, restyled against the proposed token layer.

## What's in here

```
design-system/
├── tokens.css                  # CSS variables — paste into your global stylesheet
├── lib/
│   └── utils.ts                # cn() helper (clsx + tailwind-merge)
└── components/ui/
    ├── accordion.tsx
    ├── alert-dialog.tsx
    ├── avatar.tsx
    ├── badge.tsx
    ├── breadcrumb.tsx
    ├── button.tsx
    ├── card.tsx
    ├── checkbox.tsx
    ├── collapsible.tsx
    ├── day-count-selector.tsx       (NEW — refresh of giorni-set chips)
    ├── dialog.tsx
    ├── dropdown-menu.tsx
    ├── experience-card-title.tsx    (NEW — esperienza-card title block)
    ├── experience-level.tsx         (NEW — replaces flat "level" pill)
    ├── field.tsx
    ├── hover-card.tsx
    ├── input.tsx
    ├── input-group.tsx              (NEW — prefix/suffix/stepper for inputs)
    ├── label.tsx
    ├── pagination.tsx
    ├── popover.tsx
    ├── radio-group.tsx
    ├── select.tsx
    ├── separator.tsx
    ├── sheet.tsx
    ├── sidebar.tsx
    ├── skeleton.tsx
    ├── switch.tsx                   (NEW — was missing from legacy kit)
    ├── table.tsx
    ├── tabs.tsx
    ├── textarea.tsx
    └── tooltip.tsx
```

## Install

### 1. Tokens

Paste the contents of `tokens.css` into a global stylesheet (e.g. `app/globals.css`) so the CSS variables are available app-wide. Every primitive references them via `var(--…)`. Then load Geist + Geist Mono — the kit assumes both are present (Next: `next/font/google`; otherwise pull from Google Fonts).

### 2. Helpers

Copy `lib/utils.ts` into your project at `src/lib/utils.ts` (or update the relative imports inside the primitives). Required peers:

```bash
pnpm add clsx tailwind-merge class-variance-authority @radix-ui/react-slot \
  @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-avatar \
  @radix-ui/react-checkbox @radix-ui/react-collapsible @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-label \
  @radix-ui/react-popover @radix-ui/react-radio-group @radix-ui/react-select \
  @radix-ui/react-separator @radix-ui/react-switch @radix-ui/react-tabs \
  @radix-ui/react-tooltip
```

### 3. Components

Copy `components/ui/*.tsx` into `src/components/ui/`. Imports inside the files use relative paths (`../../lib/utils`) — adjust to your alias if you use `@/lib/utils`.

## Usage

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ExperienceLevel } from "@/components/ui/experience-level";
import { DayCountSelector } from "@/components/ui/day-count-selector";

<Card>
  <CardHeader>
    <CardTitle>Aria Bocelli</CardTitle>
  </CardHeader>
  <CardContent>
    <ExperienceLevel level="senior" />
  </CardContent>
</Card>
```

## What changed vs. the legacy kit

- **Tokens** — semantic layer (`--surface`, `--foreground-strong`, `--accent-soft`, `--success-soft`…) on warm oklch neutrals.
- **Density** — control sizes `h-22 / h-26 / h-32 / h-38 / h-44`, default `h-32`.
- **Radii** — `--radius-xs/sm/md/lg = 4 / 6 / 8 / 12`.
- **Focus** — single `var(--shadow-ring)` (2px halo) used everywhere; no more `ring-*` utilities mixed with shadows.
- **Iconography** — every primitive accepts an `icon` slot; reserved 14×14 box.
- **New primitives** — `Switch`, `InputGroup`, `Pagination`, `DayCountSelector`, `ExperienceLevel`, `ExperienceCardTitle`.
- **Compound APIs** — `Pagination` and `InputGroup` are namespaced (`Pagination.Range`, `InputGroup.Stepper`) so call-sites read like the design.

## Migration notes

- `Badge variant="default"` is now neutral; brand-tinted use `variant="brand"`.
- `Button size="default"` → `size="default"` (32px). Old 36px maps to `size="lg"`.
- The flat experience pill (`<Badge>Senior</Badge>`) → `<ExperienceLevel level="senior" />`.
- Day chips (`<button>Lun</button>` x 7) → `<DayCountSelector value={…} onChange={…} />`.
- `tooltip.tsx` no longer needs an explicit `<TooltipProvider>` for one-off tooltips — primitive ships its own.

## Compatibility

- React 18+
- Tailwind 3.4+ (uses arbitrary values for token vars; no plugin required)
- Next.js App Router or Vite — neither is required.
