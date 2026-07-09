import { vi } from "vitest"
import type { Table } from "@tanstack/react-table"

import type { LavoratoreListItem } from "../lavoratore-card"
import type { LavoratoreRecord } from "../../types/lavoratore"

export function makeWorkerRow(
  overrides: Partial<LavoratoreRecord> & { id?: string } = {},
): LavoratoreRecord {
  return {
    id: "worker-1",
    nome: "Maria",
    cognome: "Rossi",
    email: "maria@example.com",
    telefono: "3331234567",
    sesso: "F",
    nazionalita: "IT",
    data_di_nascita: "1990-05-15",
    stato_lavoratore: "qualificato",
    disponibilita: "disponibile",
    followup_chiamata_idoneita: "",
    provincia_sigla: "MI",
    come_ti_sposti: ["mezzi"],
    vincoli_orari_disponibilita: "",
    disponibilita_nel_giorno: [],
    tipo_lavoro_domestico: ["colf"],
    tipo_rapporto_lavorativo: ["fisso"],
    check_lavori_accettabili: [],
    check_accetta_funzionamento_baze: "si",
    check_accetta_lavori_con_trasferta: "no",
    check_accetta_multipli_contratti: "si",
    check_accetta_paga_9_euro_netti: "si",
    ...overrides,
  } as unknown as LavoratoreRecord
}

export function makeWorkerListItem(
  row: LavoratoreRecord,
  overrides: Partial<LavoratoreListItem> = {},
): LavoratoreListItem {
  return {
    id: row.id,
    nomeCompleto: `${row.nome} ${row.cognome}`,
    immagineUrl: null,
    locationLabel: "Milano",
    telefono: row.telefono ?? null,
    isBlacklisted: false,
    tipoRuolo: null,
    tipoRuoloColor: null,
    tipoLavoro: null,
    tipoLavoroColor: null,
    statoLavoratore: row.stato_lavoratore ?? null,
    statoLavoratoreColor: null,
    disponibilita: row.disponibilita ?? null,
    disponibilitaColor: null,
    isDisponibile: null,
    isQualified: false,
    isIdoneo: false,
    isCertificato: false,
    ...overrides,
  }
}

function makeMockTable(): Table<unknown> {
  return {
    getState: () => ({
      grouping: [],
      columnFilters: [],
      globalFilter: "",
      sorting: [],
      pagination: { pageIndex: 0, pageSize: 50 },
    }),
    getColumn: () => undefined,
    getAllColumns: () => [],
    getAllLeafColumns: () => [],
    getHeaderGroups: () => [],
    getRowModel: () => ({ rows: [] }),
    getVisibleLeafColumns: () => [],
    setGrouping: vi.fn(),
    setSorting: vi.fn(),
    setColumnFilters: vi.fn(),
    resetColumnFilters: vi.fn(),
    setGlobalFilter: vi.fn(),
    resetGlobalFilter: vi.fn(),
  } as unknown as Table<unknown>
}

const noop = vi.fn()
const noopStateSetter = vi.fn()

export function makeEditorReturn(overrides: Record<string, unknown> = {}) {
  return {
    selectedWorkerIsNonIdoneo: false,
    selectedWorkerNonQualificatoIssues: [],
    selectedWorkerIsNonQualificato: false,
    recruiterFeedbackEntries: [],
    availabilityPayload: null,
    disponibilitaBadgeClassName: "",
    availabilityReadOnlyRows: [],
    presentationPhotoSlots: [],
    nonIdoneoReasonValues: [],
    blacklistChecked: false,
    updatingNonIdoneo: false,
    updatingNonQualificato: false,
    isEditingHeader: false,
    setIsEditingHeader: noopStateSetter,
    isEditingAddress: false,
    setIsEditingAddress: noopStateSetter,
    isEditingAvailabilityStatus: false,
    setIsEditingAvailabilityStatus: noopStateSetter,
    isEditingAvailability: false,
    setIsEditingAvailability: noopStateSetter,
    isEditingJobSearch: false,
    setIsEditingJobSearch: noopStateSetter,
    isEditingExperience: false,
    setIsEditingExperience: noopStateSetter,
    isEditingSkills: false,
    setIsEditingSkills: noopStateSetter,
    isEditingDocuments: false,
    setIsEditingDocuments: noopStateSetter,
    updatingAvailability: false,
    updatingAvailabilityStatus: false,
    updatingJobSearch: false,
    updatingExperience: false,
    updatingSkills: false,
    updatingDocuments: false,
    selectedPresentationPhotoIndex: 0,
    setSelectedPresentationPhotoIndex: noopStateSetter,
    addressDraft: {
      via: "",
      civico: "",
      cap: "",
      citta: "",
      provincia: "",
      citofono: "",
    },
    setAddressDraft: noopStateSetter,
    availabilityDraft: {
      vincoli_orari_disponibilita: "",
      disponibilita_nel_giorno: [],
    },
    setAvailabilityDraft: noopStateSetter,
    availabilityStatusDraft: { disponibilita: "disponibile", data_ritorno_disponibilita: "" },
    setAvailabilityStatusDraft: noopStateSetter,
    jobSearchDraft: {
      tipo_lavoro_domestico: [],
      tipo_rapporto_lavorativo: [],
      check_lavori_accettabili: [],
    },
    setJobSearchDraft: noopStateSetter,
    experienceDraft: {},
    setExperienceDraft: noopStateSetter,
    skillsDraft: { check_accetta_babysitting_neonati: "" },
    setSkillsDraft: noopStateSetter,
    documentsDraft: {},
    setDocumentsDraft: noopStateSetter,
    resolvedIban: "",
    handleNonIdoneoReasonsChange: noop,
    handleBlacklistChange: noop,
    patchSelectedWorkerField: vi.fn().mockResolvedValue(undefined),
    patchWorkerAddressField: vi.fn().mockResolvedValue(undefined),
    commitAddressField: noop,
    saveWorkerAvailability: vi.fn().mockResolvedValue(undefined),
    patchWorkerAvailabilityStatus: vi.fn().mockResolvedValue(undefined),
    handleAvailabilityMatrixChange: noop,
    patchJobSearchField: vi.fn().mockResolvedValue(undefined),
    patchExperienceRecord: vi.fn().mockResolvedValue(undefined),
    createExperienceRecord: vi.fn().mockResolvedValue(undefined),
    deleteExperienceRecord: vi.fn().mockResolvedValue(undefined),
    patchReferenceRecord: vi.fn().mockResolvedValue(undefined),
    createReferenceRecord: vi.fn().mockResolvedValue(undefined),
    commitExperienceField: noop,
    patchSkillsField: vi.fn().mockResolvedValue(undefined),
    patchDocumentField: vi.fn().mockResolvedValue(undefined),
    commitDocumentField: noop,
    generateStripeAccount: vi.fn().mockResolvedValue(undefined),
    formatDateOnly: (value: string) => value,
    getAgeFromBirthDate: () => 35,
    parseNumberValue: (value: string) => Number(value) || null,
    asInputValue: (value: unknown) => (value == null ? "" : String(value)),
    AVAILABILITY_EDIT_DAYS: [],
    AVAILABILITY_EDIT_BANDS: [],
    AVAILABILITY_HOUR_LABELS: [],
    ...overrides,
  }
}

export function makeLavoratoriDataReturn(
  overrides: Record<string, unknown> = {},
  options?: {
    workers?: LavoratoreListItem[]
    workerRows?: LavoratoreRecord[]
    selectedWorkerId?: string | null
    setSelectedWorkerId?: ReturnType<typeof vi.fn>
    setFilters?: ReturnType<typeof vi.fn>
  },
) {
  const row = makeWorkerRow()
  const worker = makeWorkerListItem(row)
  const workers = options?.workers ?? [worker]
  const workerRows = options?.workerRows ?? [row]
  const selectedId =
    options?.selectedWorkerId !== undefined
      ? options.selectedWorkerId
      : workers[0]?.id ?? null
  const selectedRow =
    workerRows.find((candidate) => candidate.id === selectedId) ?? null
  const selectedWorker =
    workers.find((candidate) => candidate.id === selectedId) ?? null

  return {
    workers,
    workerRows,
    workerAddressesById: new Map<string, unknown[]>(),
    workersTotal: workers.length,
    selectedWorkerId: selectedId,
    setSelectedWorkerId: options?.setSelectedWorkerId ?? vi.fn(),
    selectedWorker,
    selectedWorkerRow: selectedRow,
    selectedWorkerAddress: null,
    selectedWorkerDocuments: [],
    loadingSelectedWorkerDocuments: false,
    selectedWorkerExperiences: [],
    loadingSelectedWorkerExperiences: false,
    selectedWorkerReferences: [],
    loadingSelectedWorkerReferences: false,
    selectedWorkerRelatedSearches: [],
    reloadSelectedWorkerScheda: vi.fn(),
    loading: false,
    error: null,
    setError: vi.fn(),
    lookupOptionsByDomain: new Map([
      [
        "lavoratori.followup_chiamata_idoneita",
        [{ value: "da_chiamare", label: "Da chiamare" }],
      ],
      ["lavoratori.disponibilita", [{ value: "disponibile", label: "Disponibile" }]],
      ["lavoratori.sesso", [{ value: "F", label: "Femmina" }]],
      ["lavoratori.nazionalita", [{ value: "IT", label: "Italia" }]],
      ["lavoratori.come_ti_sposti", [{ value: "mezzi", label: "Mezzi pubblici" }]],
      [
        "lavoratori.tipo_lavoro_domestico",
        [{ value: "colf", label: "Colf" }],
      ],
      [
        "lavoratori.tipo_rapporto_lavorativo",
        [{ value: "fisso", label: "Fisso" }],
      ],
      ["lavoratori.check_lavori_accettabili", [{ value: "pulizie", label: "Pulizie" }]],
      [
        "lavoratori.disponibilita_nel_giorno",
        [{ value: "mattina", label: "Mattina" }],
      ],
      ["lavoratori.check_accetta_funzionamento_baze", [{ value: "si", label: "Sì" }]],
      ["lavoratori.check_accetta_lavori_con_trasferta", [{ value: "no", label: "No" }]],
      ["lavoratori.check_accetta_multipli_contratti", [{ value: "si", label: "Sì" }]],
      ["lavoratori.check_accetta_paga_9_euro_netti", [{ value: "si", label: "Sì" }]],
      ["lavoratori.stato_lavoratore", [{ value: "qualificato", label: "Qualificato" }]],
      ["lavoratori.motivazioni_non_idoneo", []],
      ["lavoratori.documenti_in_regola", []],
      ["lavoratori.documenti_verificati", []],
      ["lavoratori.hai_referenze", []],
      ["lavoratori.provincia", []],
    ]),
    lookupFilterTypeByDomain: new Map(),
    lookupColorsByDomain: new Map(),
    filterFields: [],
    loadWorkersSchema: vi.fn(),
    table: makeMockTable(),
    searchValue: "",
    setSearchValue: vi.fn(),
    filters: { kind: "group", id: "root", logic: "and", nodes: [] },
    setFilters: options?.setFilters ?? vi.fn(),
    hasPendingFilters: false,
    applyFilters: vi.fn(),
    savedViews: [],
    activeViewId: null,
    saveCurrentView: vi.fn(),
    applySavedView: vi.fn(),
    deleteSavedView: vi.fn(),
    pageIndex: 0,
    setPageIndex: vi.fn(),
    pageCount: 1,
    currentPage: 1,
    applyUpdatedWorkerRow: vi.fn(),
    applyUpdatedWorkerAddress: vi.fn(),
    applyUpdatedWorkerExperience: vi.fn(),
    appendCreatedWorkerExperience: vi.fn(),
    removeWorkerExperience: vi.fn(),
    applyUpdatedWorkerReference: vi.fn(),
    appendCreatedWorkerReference: vi.fn(),
    upsertSelectedWorkerDocument: vi.fn(),
    ...overrides,
  }
}
