export const selectors = {
  loginEmail: "#login-email",
  loginPassword: "#login-password",
  loginSubmit: 'button[type="submit"]',
  sessionLoadingText: "Verifica sessione...",
  loginHeading: "Accedi al backoffice",
  appSidebar: '[data-slot="sidebar"]',
  /** Relative to Playwright baseURL (`/bazeoffice/`). No leading slash — `/path` escapes the base. */
  routes: {
    home: ".",
    pipeline: "pipeline",
  },
  pipeline: {
    heading: "Sales Pipeline",
    searchInput: '[data-testid="pipeline-search-input"]',
    applyFilters: '[data-testid="pipeline-apply-filters"]',
    resetFilters: '[data-testid="pipeline-reset-filters"]',
    column: (stageId: string) => `[data-testid="kanban-column-${stageId}"]`,
    card: (processId: string) => `[data-testid="pipeline-card-${processId}"]`,
    sheetDialog: '[role="dialog"]',
    sheetClose: '[aria-label="Chiudi dettaglio"]',
    duplicaRicerca: 'button:has-text("Duplica ricerca")',
  },
} as const
