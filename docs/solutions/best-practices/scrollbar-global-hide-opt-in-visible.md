---
title: "Scrollbars: globally hidden, opt in via .scrollbar-visible"
date: 2026-07-03
category: best-practices
module: "src/index.css"
problem_type: convention
component: ui
severity: low
applies_when:
  - "A scroll container's scrollbar is invisible and you want it shown"
  - "Styling or toggling scrollbars anywhere in the app"
tags: [scrollbar, css, convention, ui, tailwind]
---

# Scrollbars: globally hidden, opt in via `.scrollbar-visible`

## Convention

`src/index.css` hides scrollbars **globally** in the base layer:

```css
* { scrollbar-width: none; -ms-overflow-style: none; }
*::-webkit-scrollbar { display: none; width: 0; height: 0; }
```

So **every** `overflow-*` container has an invisible scrollbar by default — that's why a new scroll area "has no scrollbar" even when it clearly scrolls. To show one, add the **`.scrollbar-visible`** utility (defined in the `@layer components`, so it wins over the base rule): a thin, styled, always-visible scrollbar, already used across the board views (ricerca, assunzioni, crm, chiusure). The explicit opposite is `.scrollbar-hidden`.

## Usage

- Add `scrollbar-visible` to the scroll container's `className`.
- For a **shared** shell/component, pass it via a `className` **prop** so only the intended usage gets it, rather than editing the shared component. (BAZ-30: `WorkerDetailShell` is shared by 3 views — scoped the scheda-lavoratore scrollbar via the prop.)
- Optionally pair with `scrollbar-gutter: stable` (as the board views do) to reserve the gutter and avoid a content shift when the scrollbar appears/disappears.

## Instance

BAZ-30 — made the scheda-lavoratore scroll container's scrollbar always visible (was hidden by the global rule): page via `WorkerDetailShell` in `src/components/lavoratori/lavoratori-cerca-view.tsx`, assegnazioni modal via `src/components/ricerca/ricerca-workers-pipeline-view.tsx`.
