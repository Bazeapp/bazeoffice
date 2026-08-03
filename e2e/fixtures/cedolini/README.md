# Cedolini E2E PDF fixtures

Real BAZE Giugno 2026 cedolino PDFs used by the Controlli bulk-check worker (`unpdf` + `cedolini-pdf-extract`).

| File | Expected extract | E2E role |
| --- | --- | --- |
| `cedpag-example.pdf` | `paga_oraria: 9.5`, `ore_ordinarie: 24`, `totale_ore: 24` | Happy-path Pronti when presenze=24h and rapporto paga=9.5; also reused to trigger Ore / Paga / Eventi / Stripe / Note warnings via seed row variants |
| `cedpag-chiusura-example.pdf` | `paga_oraria: 9.5`, `ore_ordinarie: 5`, `totale_ore: 5` | Attached to a `caso_particolare = Chiusura rapporto` row — must be excluded from bulk check eligibility |

## Warning coverage (seed rows in `seed_e2e.sql`)

| Category | Seed trigger |
| --- | --- |
| *(none — Pronti)* | `f614`: 24h PDF + 24h presenze + rapporto paga 9.5 + no caso + no Stripe → must stay `ok` with empty `warnings` |
| Pagamento Stripe | `f636` + `transazioni_finanziarie.f627` with `link_pagamento` null |
| Ore non coerenti | `f615` + 20h presenze vs 24h PDF |
| Eventi presenze | `f616` + `evento_day_1 = overtime` |
| Cedolino o PDF | `f617` with PDF attached and null `cedolino_url` (PRD §6.5 independent URL check) |
| Paga oraria | `f635` + rapporto `paga_oraria_lorda = 12` vs PDF 9.5 |
| Note/casi particolari | `f637` + `caso_particolare = 'si'` |
| Altri | Not seedable from row data (worker critical-error catch-all only) |

Uploaded to local Supabase Storage at `baze-bucket/mesi_lavorati/e2e/` by `e2e/seed-cedolini-storage.mjs` (called from `ensure-supabase.mjs`).
