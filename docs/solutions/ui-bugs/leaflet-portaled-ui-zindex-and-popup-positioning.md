---
title: "Leaflet interop: portaled dropdowns hidden behind the map, and hidden-tip popup mis-positioning"
date: 2026-07-02
category: ui-bugs
module: "ricerca search map (src/components/ricerca/ricerca-workers-map-view.tsx)"
problem_type: ui_bug
component: maps
symptoms:
  - "A portaled dropdown/combobox popover opens visually behind the Leaflet map (only its top sliver is visible)"
  - "A Leaflet popup whose CSS tip is hidden sits ~20px higher than its marker anchor"
  - "A worker-card popup near the top edge of the map is clipped by the map container"
root_cause: css_stacking_and_leaflet_defaults
resolution_type: css_fix
severity: medium
related_components: [leaflet, combobox, css_stacking_context]
tags: [leaflet, z-index, stacking-context, isolate, portal, combobox, popup, ui-bug, map]
---

# Leaflet interop: portaled UI behind the map, and hidden-tip popup positioning

Three UI defects surfaced while adding filters + hover cards to the ricerca search map (`src/components/ricerca/ricerca-workers-map-view.tsx`, which embeds a Leaflet map). All three come from Leaflet's default CSS interacting with app-level layout, not from application logic.

## Problem

1. The Nazionalità filter (a Base UI `Combobox` whose dropdown is **portaled to `document.body`**) opened **behind** the Leaflet map — only the first row peeked out above the map's top edge.
2. Worker hover cards (Leaflet popups with the tip hidden) rendered ~20px higher than their marker.
3. A worker card whose marker is near the **top edge** of the map was clipped by the map container.

## Symptoms

- Dropdown list visible for only one line; the rest is covered by map tiles/markers.
- Card "floats" too far above the marker; when flipped below, it lands above the marker instead.
- Card cut off at the map's top border when hovering an edge marker.

## What Didn't Work

- Raising the popup's own z-index via the combobox `ComboboxContent` className — that className styles the inner `Popup`, **not** the `Positioner` where the `z-70` lives, so it can't win against Leaflet.
- Assuming `overflow-hidden` on the section was clipping the dropdown — the dropdown is **portaled to `body`**, so it escapes that clip; the issue was purely z-index stacking.

## Solution

**1. Portaled UI behind Leaflet → isolate the map container.**

Leaflet injects high z-indexes that, if the map wrapper establishes **no stacking context**, leak into the root/`body` stacking context and beat a portaled overlay:

```
.leaflet-*-pane  z-index: 200–700   (tile 200 … popup 700)
.leaflet-control z-index: 800
.leaflet-top/.leaflet-bottom z-index: 1000
```

The Base UI combobox popup is portaled to `body` at `z-index: 70` (`src/components/ui/combobox.tsx` Positioner: `z-70`). 70 < 1000 → the map wins.

Fix — add `isolate` (Tailwind `isolation: isolate`) to the map wrapper so Leaflet's z-indexes are confined to that subtree:

```diff
- <div className="relative min-h-0 flex-1">
+ <div className="relative isolate min-h-0 flex-1">
```

**2. Hidden Leaflet tip → card sits ~20px too high.**

The card hides the tip with `.leaflet-popup-tip-container { display: none }`, but Leaflet still reserves space for it via `.leaflet-popup { margin-bottom: 20px }` (from `leaflet.css`). The result: the popup content is positioned ~20px above the anchor than intended, in **both** directions. Zero it out (scoped to the card's class so other popups keep the default):

```css
.leaflet-popup.ricerca-map-worker-popup { margin-bottom: 0; }
```

**3. Card clipped near the top edge → flip below (no autoPan).**

The card is a Leaflet popup opened on `mouseover` with `autoPan: false` (autoPan is disabled on purpose — a hover-triggered pan makes the map jump and the marker slip from under the cursor). Leaflet popups always grow **upward** from the marker, so near the top edge they clip. Fix without moving the map: on `popupopen`, measure the card and, if the marker is too close to the top, toggle a class that translates the content down (the tip is already hidden, so it can freely sit below):

```ts
.on("popupopen", (event) => {
  const marker = event.target as L.Marker
  const element = marker.getPopup()?.getElement()
  if (!element) return
  const cardHeight =
    element.querySelector<HTMLElement>(".leaflet-popup-content-wrapper")?.offsetHeight || 280
  const markerY = map.latLngToContainerPoint(marker.getLatLng()).y
  element.classList.toggle("is-below", markerY - cardHeight - 18 < 8)
})
```

```css
.ricerca-map-worker-popup.is-below .leaflet-popup-content-wrapper {
  transform: translateY(calc(100% + 30px));
}
```

The `translateY` is applied to the inner `.leaflet-popup-content-wrapper` — **not** the outer `.leaflet-popup` that Leaflet positions via `bottom`/`transform` — so Leaflet's own positioning math (pan/zoom) is undisturbed.

## Why This Works

- `isolation: isolate` creates a stacking context on the map wrapper. Every Leaflet z-index (panes, controls) now resolves **relative to each other inside** that subtree; the wrapper participates in its parent context as a single unit at `auto`, so a `body`-portaled overlay at `z-70` reliably paints above it. It does **not** set `overflow`, so it can't clip the hover card (which legitimately overflows the map bounds).
- The `margin-bottom` was pure phantom space for a tip that no longer renders; removing it aligns the card with its anchor.
- Measuring the real card height at `popupopen` (Leaflet lays the content out before firing the event) makes the flip decision exact; the `translateY(100% + …)` places the (upward-growing) card below the marker.

## Prevention

- **Embedding any mapping/canvas widget (Leaflet, Mapbox, etc.) that ships its own z-indexes: wrap it in an `isolate`d container.** This pre-empts the whole class of "portaled dropdown/modal renders behind the map." Prefer `isolate` over bumping every overlay's z-index — it's scoped and doesn't start a z-index arms race with dialogs/sheets.
- When you hide a Leaflet popup's tip, also zero `.leaflet-popup { margin-bottom }` (scoped to your popup class) or the content is mis-anchored.
- Known limitation (accepted): with a popup **pinned** via click, the flip is not re-evaluated on pan/zoom, and on an unusually short map (< ~2× card height) the flipped-below card could touch the bottom edge. Cosmetic; the popup stays functional.
