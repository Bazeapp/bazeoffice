# Phase 2 Migration Log

## Strategy
- Source: `src/components/shared/*`
- Target: `src/components/shared-next/*` (parallel folder)
- Primitives source: `@/components/ui-next/*`
- One commit per component, single PR for all of Phase 2

## Refactor rules
- Replace `@/components/ui/*` → `@/components/ui-next/*`
- Keep all props, types, business logic UNCHANGED
- Replace hardcoded colors/spacing with tokens from globals.css if found
- Generate `.stories.tsx` alongside each refactored file

## Progress
- [ ] statistics-metric-card
- [ ] attachment-upload-slot
- [ ] linked-rapporto-summary-card
- [ ] kanban
- [ ] detail-section-card
- [ ] side-cards-panel
