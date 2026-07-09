---
title: "Worker detail scroll-spy: tab-array order must equal DOM section order"
date: 2026-07-03
category: design-patterns
module: "worker detail page (src/components/lavoratori/lavoratori-cerca-view.tsx)"
problem_type: design_pattern
component: navigation
severity: medium
applies_when:
  - "Reordering, adding, or removing sections on the worker detail page (route cerca-lavoratori)"
  - "Touching the `workerSectionTabs` array or the section `<div ref={setWorkerSectionRef(id)}>` blocks"
  - "Any sticky anchor-nav / scroll-spy that derives the active item by iterating an ordered list and breaking"
tags: [scroll-spy, tabs, navigation, lavoratori, section-order, invariant, design-pattern]
---

# Worker detail scroll-spy: tab order must equal DOM order

## Context

BAZ-23 moved the "Ricerche coinvolte" section (`id: "processi"`, tab "Ricerche") from **last** to **first content section** on the worker detail page. The vertical order of sections on that page is **not** driven by a config array — it is a **static JSX sequence** of `<div ref={setWorkerSectionRef(id)}>` blocks inside `WorkerDetailShell`. In parallel, a second array `workerSectionTabs` drives the sticky tab bar and the scroll-spy.

## The invariant

**The order of `workerSectionTabs` MUST equal the top-to-bottom order of the section `<div>`s in the JSX.** They are two hand-maintained lists that must stay in lock-step.

Why: the scroll-spy (`syncActiveSection`) computes the active section by iterating `workerSectionTabs` **in array order** and stopping at the first section whose `offsetTop` is below the scroll position:

```
for (const tab of workerSectionTabs) {
  const node = sectionRefs.current[tab.id];
  if (!node) continue;
  if (node.offsetTop - 148 <= scrollTop) nextActive = tab.id;
  else break;               // <-- assumes tabs are ordered top-to-bottom
}
```

The `break` makes the loop correct **only** if the array is already sorted by vertical position. If the tab array and DOM diverge, the highlighted tab becomes wrong (it stops early at the first out-of-order entry). The initial-active effect also reads `workerSectionTabs[0]?.id`, so whatever is first in the array must also be the topmost section (the sticky `profilo` header).

## How to reorder safely

To move a section, change **both** lists in the same commit:

1. **JSX**: move the whole `<div ref={setWorkerSectionRef("<id>")}> … </div>` block to its new vertical position inside the sections container.
2. **`workerSectionTabs`**: move the matching `{ id: "<id>", label, icon }` entry to the same index.

Caveats specific to this view:
- The `profilo` header is sticky and stays first in both lists.
- The `non-qualificato` section is **conditional** (`selectedWorkerIsNonQualificato`) and is `.push()`-ed near the end — it is last in both the DOM and the array, so it stays consistent as long as you don't move things below it.
- Order is a static JSX sequence, not data — there is no single source of truth to edit; the two lists are the source of truth and must be kept in sync by hand.

Verification for a pure reorder: `tsc -b` + `vite build` + `test:unit` + a manual scroll to confirm the active-tab highlight tracks the new order. No unit test asserts section order today.

## Related upcoming work

- **BAZ-24** reorders the *inner* states of the "Ricerche coinvolte" section (a different concern, same file).
- **BAZ-30** adds a **sidebar** to this page — it should derive from `workerSectionTabs` (the existing ordered source), which keeps sidebar order, tab order, and DOM order aligned automatically instead of introducing a third hand-maintained list.

Cross-repo general pattern: `learning/scrollspy-early-break-nav-order-uguale-dom-order.md`.
