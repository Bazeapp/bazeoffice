/**
 * DEV PAGE — playground Pipeline CRM Famiglie redesignata.
 * Accesso: `/?dev=kanban` (richiede login).
 *
 * Modalità:
 *   - "live": usa useCrmPipelinePreview (Supabase, dati reali).
 *   - "mock": usa buildInitialBoard (mock locale, zero rete).
 *
 * Toggle in alto. Di default parte in "live" e fallback a "mock" in caso di errore.
 */
import * as React from "react"
import {
  ArrowUpDownIcon,
  BriefcaseIcon,
  ClockIcon,
  LoaderIcon,
  MapPinIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { FilterToolbar, type FilterDimension } from "@/components/shared/filter-toolbar"
import { KanbanBoard } from "@/components/shared/kanban-board"
import { KanbanColumn } from "@/components/shared/kanban-column"
import { PageHeader } from "@/components/shared/page-header"
import { FamilyLeadCard } from "@/components/domain/crm-famiglie/family-lead-card"
import { FamilyLeadDetailSheet } from "@/components/domain/crm-famiglie/family-lead-detail-sheet"
import { cn } from "@/lib/utils"
import {
  useCrmPipelinePreview,
  type CrmPipelineCardData,
} from "@/hooks/use-crm-pipeline-preview"

import {
  buildInitialBoard,
  CONTRACT_OPTIONS,
  JOB_OPTIONS,
  PROVINCE_OPTIONS,
  STAGE_GUIDE_CONFIG,
  STAGES,
  type FamilyContractKey,
  type FamilyDetailData,
  type FamilyJobKey,
  type FamilyLead,
  type FamilyStageId,
} from "./_dev-family-mock-data"
import {
  adaptCardToLead,
  buildContractPatch,
  buildDetailPatch,
  buildJobsPatch,
} from "./_dev-family-adapter"

// ============================================================
// Types and constants
// ============================================================

type Mode = "live" | "mock"

type Board = Record<FamilyStageId, FamilyLead[]>

function emptyBoard(): Board {
  const out = {} as Board
  for (const s of STAGES) out[s.id] = []
  return out
}

// ============================================================
// Filter helpers
// ============================================================

function matchesQuery(lead: FamilyLead, query: string) {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    lead.name.toLowerCase().includes(q) ||
    lead.email.toLowerCase().includes(q) ||
    lead.phone.toLowerCase().includes(q) ||
    lead.id.toLowerCase().includes(q)
  )
}

function matchesFilters(lead: FamilyLead, filters: Record<string, unknown>) {
  const jobFilter = filters["tipo_lavoro"]
  if (typeof jobFilter === "string" && !lead.jobs.includes(jobFilter as FamilyJobKey)) return false
  const contractFilter = filters["tipo_contratto"]
  if (typeof contractFilter === "string" && lead.contract !== contractFilter) return false
  const provFilter = filters["provincia"]
  if (typeof provFilter === "string" && lead.province !== provFilter) return false
  return true
}

// ============================================================
// Main component
// ============================================================

export function DevKanbanPlayground() {
  const [mode, setMode] = React.useState<Mode>("live")
  const {
    loading: liveLoading,
    error: liveError,
    columns: liveColumns,
    lookupOptionsByField,
    moveCard,
    updateProcessCard,
    updateFamilyCard,
  } = useCrmPipelinePreview()

  // Build board from live columns (adapt) or mock
  const liveBoard: Board = React.useMemo(() => {
    if (mode !== "live") return emptyBoard()
    const out = emptyBoard()
    for (const col of liveColumns) {
      const stageId = col.id as FamilyStageId
      if (stageId in out) {
        out[stageId] = col.cards.map((c: CrmPipelineCardData) => adaptCardToLead(c))
      }
    }
    return out
  }, [mode, liveColumns])

  // Mock board con optimistic local state (per testare interazioni offline)
  const [mockBoard, setMockBoard] = React.useState<Board>(() => buildInitialBoard())

  // Optimistic overlay per live mode (modifiche detail in attesa di backend)
  const [liveOptimistic, setLiveOptimistic] = React.useState<Record<string, Partial<FamilyLead>>>({})

  const board: Board = React.useMemo(() => {
    if (mode === "mock") return mockBoard
    if (Object.keys(liveOptimistic).length === 0) return liveBoard
    const out = {} as Board
    for (const sid of Object.keys(liveBoard) as FamilyStageId[]) {
      out[sid] = liveBoard[sid]!.map((l) =>
        liveOptimistic[l.id]
          ? {
              ...l,
              ...liveOptimistic[l.id],
              detail: { ...l.detail, ...(liveOptimistic[l.id]?.detail ?? {}) },
            }
          : l,
      )
    }
    return out
  }, [mode, liveBoard, mockBoard, liveOptimistic])

  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")
  const [filters, setFilters] = React.useState<Record<string, unknown>>({})

  const selectedLead: FamilyLead | null = React.useMemo(() => {
    if (!selectedLeadId) return null
    for (const sid of Object.keys(board) as FamilyStageId[]) {
      const found = board[sid]?.find((l) => l.id === selectedLeadId)
      if (found) return found
    }
    return null
  }, [board, selectedLeadId])

  const filteredBoard = React.useMemo(() => {
    const out = {} as Board
    for (const stage of STAGES) {
      out[stage.id] = (board[stage.id] ?? []).filter(
        (l) => matchesQuery(l, query) && matchesFilters(l, filters),
      )
    }
    return out
  }, [board, query, filters])

  const totalLeads = React.useMemo(
    () => Object.values(filteredBoard).reduce((sum, arr) => sum + arr.length, 0),
    [filteredBoard],
  )

  // ============================================================
  // Mutations
  // ============================================================

  const handleDrop = async (targetStageId: FamilyStageId, payload: string | null) => {
    const leadId = payload || draggingId
    setDropTargetId(null)
    setDraggingId(null)
    if (!leadId) return

    if (mode === "mock") {
      setMockBoard((prev) => moveLeadInBoard(prev, leadId, targetStageId))
    } else {
      try {
        await moveCard(leadId, targetStageId)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[live] moveCard failed", e)
      }
    }
  }

  const handleStageChange = async (leadId: string, targetStage: FamilyStageId) => {
    if (mode === "mock") {
      setMockBoard((prev) => moveLeadInBoard(prev, leadId, targetStage))
    } else {
      try {
        await moveCard(leadId, targetStage)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[live] stage change failed", e)
      }
    }
  }

  const handleJobsChange = async (leadId: string, jobs: FamilyJobKey[]) => {
    if (mode === "mock") {
      setMockBoard((prev) => updateLeadInBoard(prev, leadId, (l) => ({ ...l, jobs })))
    } else {
      setLiveOptimistic((prev) => ({
        ...prev,
        [leadId]: { ...(prev[leadId] ?? {}), jobs },
      }))
      try {
        await updateProcessCard(leadId, buildJobsPatch(jobs, lookupOptionsByField))
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[live] jobs patch failed", e)
      } finally {
        setLiveOptimistic((prev) => {
          const next = { ...prev }
          delete next[leadId]
          return next
        })
      }
    }
  }

  const handleContractChange = async (leadId: string, contract: FamilyContractKey) => {
    if (mode === "mock") {
      setMockBoard((prev) => updateLeadInBoard(prev, leadId, (l) => ({ ...l, contract })))
    } else {
      setLiveOptimistic((prev) => ({
        ...prev,
        [leadId]: { ...(prev[leadId] ?? {}), contract },
      }))
      try {
        await updateProcessCard(
          leadId,
          buildContractPatch(contract, lookupOptionsByField),
        )
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[live] contract patch failed", e)
      } finally {
        setLiveOptimistic((prev) => {
          const next = { ...prev }
          delete next[leadId]
          return next
        })
      }
    }
  }

  const handlePatchDetail = async (leadId: string, patch: Partial<FamilyDetailData>) => {
    if (mode === "mock") {
      setMockBoard((prev) =>
        updateLeadInBoard(prev, leadId, (l) => ({
          ...l,
          detail: { ...l.detail, ...patch },
        })),
      )
    } else {
      setLiveOptimistic((prev) => ({
        ...prev,
        [leadId]: {
          ...(prev[leadId] ?? {}),
          detail: { ...(prev[leadId]?.detail ?? {}), ...patch } as FamilyDetailData,
        },
      }))
      try {
        const backendPatch = buildDetailPatch(patch)
        if (Object.keys(backendPatch).length > 0) {
          await updateProcessCard(leadId, backendPatch)
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[live] detail patch failed", e)
      } finally {
        setLiveOptimistic((prev) => {
          const next = { ...prev }
          delete next[leadId]
          return next
        })
      }
    }
    // Suppress unused warning per updateFamilyCard in live mode
    void updateFamilyCard
  }

  const handleAddComment = (leadId: string, text: string) => {
    // Commenti non sono esposti da CrmPipelineCardData. In mock aggiorniamo localmente;
    // in live mostriamo un placeholder finché il backend non li esporrà.
    if (mode === "mock") {
      setMockBoard((prev) =>
        updateLeadInBoard(prev, leadId, (l) => ({
          ...l,
          comments: [
            {
              id: `new-${Date.now()}`,
              authorInitials: "NG",
              authorName: "Nicolò Gori",
              timestamp: "adesso",
              text,
            },
            ...l.comments,
          ],
        })),
      )
    } else {
      // eslint-disable-next-line no-console
      console.info("[live] commenti non cablati al backend — aggiornamento locale only")
    }
  }

  const handleCreateAnnuncio = (leadId: string) => {
    // In mock simuliamo il workflow; in live TODO cablatura a runAutomationWebhook
    if (mode === "mock") {
      setMockBoard((prev) =>
        updateLeadInBoard(prev, leadId, (l) => ({
          ...l,
          detail: { ...l.detail, annuncioStatus: "loading" },
        })),
      )
      setTimeout(() => {
        setMockBoard((prev) =>
          updateLeadInBoard(prev, leadId, (l) => ({
            ...l,
            detail: {
              ...l.detail,
              annuncioStatus: "created",
              annuncioUrl: `https://baze.it/annuncio/${leadId.toLowerCase()}`,
            },
          })),
        )
      }, 1500)
    } else {
      // eslint-disable-next-line no-console
      console.info("[live] creazione annuncio non cablata (TODO: runAutomationWebhook)")
    }
  }

  const resetMock = () => {
    setMockBoard(buildInitialBoard())
    setSelectedLeadId(null)
    setIsSheetOpen(false)
    setQuery("")
    setFilters({})
  }

  // ============================================================
  // Filter dimensions
  // ============================================================

  const dimensions: FilterDimension[] = [
    {
      key: "tipo_lavoro",
      label: "Tipo lavoro",
      icon: BriefcaseIcon,
      options: JOB_OPTIONS.map((j) => ({ value: j.key, label: j.label })),
    },
    {
      key: "tipo_contratto",
      label: "Tipo contratto",
      icon: ClockIcon,
      options: CONTRACT_OPTIONS.map((c) => ({ value: c.key, label: c.label })),
    },
    {
      key: "provincia",
      label: "Provincia",
      icon: MapPinIcon,
      options: PROVINCE_OPTIONS,
    },
    {
      key: "owner",
      label: "Owner",
      icon: UsersIcon,
      options: [
        { value: "NG", label: "Nicolò Gori" },
        { value: "LE", label: "Lisandro Enrici" },
        { value: "MR", label: "Marta Rossi" },
      ],
    },
  ]

  // ============================================================
  // Render
  // ============================================================

  const showLiveLoading = mode === "live" && liveLoading
  const showLiveError = mode === "live" && liveError

  return (
    <div className="flex h-svh w-full flex-col overflow-hidden bg-muted/30">
      {/* Dev banner with mode toggle */}
      <div className="flex shrink-0 items-center gap-2 bg-amber-100 px-4 py-1 text-[11px] text-amber-900">
        <span className="rounded bg-amber-200 px-1.5 py-0.5 font-semibold uppercase tracking-wider">
          DEV
        </span>
        <span>Playground Pipeline CRM Famiglie</span>
        <span className="mx-2 opacity-40">·</span>
        <span className="opacity-70">Modalità:</span>
        <div className="flex overflow-hidden rounded border border-amber-300">
          <button
            type="button"
            onClick={() => setMode("live")}
            className={cn(
              "px-2 py-0.5 text-[10px] font-medium",
              mode === "live"
                ? "bg-amber-900 text-amber-50"
                : "bg-amber-50 text-amber-900 hover:bg-amber-100",
            )}
          >
            LIVE · Supabase
          </button>
          <button
            type="button"
            onClick={() => setMode("mock")}
            className={cn(
              "px-2 py-0.5 text-[10px] font-medium",
              mode === "mock"
                ? "bg-amber-900 text-amber-50"
                : "bg-amber-50 text-amber-900 hover:bg-amber-100",
            )}
          >
            MOCK · local
          </button>
        </div>
        {showLiveError ? (
          <span className="ml-2 rounded bg-red-200 px-1.5 py-0.5 font-semibold text-red-900">
            Errore live: {String(liveError).slice(0, 80)} — prova modalità Mock
          </span>
        ) : null}
        <span className="ml-auto font-mono text-[10px] opacity-60">?dev=kanban</span>
      </div>

      {/* Page header */}
      <PageHeader
        title="Sales Pipeline"
        description={`${totalLeads} ricerche · 14 stage · ${mode === "live" ? "dati reali Supabase" : "dati mock locali"}`}
        actions={
          <>
            {mode === "mock" ? (
              <Button variant="outline" size="sm" onClick={resetMock}>
                Reset mock
              </Button>
            ) : null}
            <Button variant="default" size="sm" disabled>
              <PlusIcon data-icon="inline-start" />
              Nuova famiglia
            </Button>
          </>
        }
      />

      {/* Filter toolbar */}
      <FilterToolbar
        query={query}
        onQueryChange={setQuery}
        filters={filters}
        onFiltersChange={setFilters}
        dimensions={dimensions}
        searchPlaceholder="Cerca famiglia, email, telefono..."
        rightAction={
          <Button variant="ghost" size="sm">
            <ArrowUpDownIcon data-icon="inline-start" className="size-3" />
            Ordina
          </Button>
        }
      />

      {/* Loading state */}
      {showLiveLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderIcon className="size-4 animate-spin" />
          Caricamento dati Supabase...
        </div>
      ) : (
        /* Kanban board */
        <KanbanBoard ariaLabel="Pipeline CRM Famiglie">
          {STAGES.map((stage) => {
            const cards = filteredBoard[stage.id] ?? []
            return (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                count={cards.length}
                countLabel={(n) => `${n}`}
                isDropTarget={dropTargetId === stage.id && draggingId !== null}
                onDragEnterColumn={(id) => setDropTargetId(id)}
                onDragOverColumn={(id) => setDropTargetId(id)}
                onDragLeaveColumn={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  const stillInside =
                    event.clientX >= rect.left &&
                    event.clientX <= rect.right &&
                    event.clientY >= rect.top &&
                    event.clientY <= rect.bottom
                  if (!stillInside) setDropTargetId(null)
                }}
                onDropColumn={(id, payload) => handleDrop(id as FamilyStageId, payload)}
              >
                {cards.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", lead.id)
                      event.dataTransfer.effectAllowed = "move"
                      setDraggingId(lead.id)
                    }}
                    onDragEnd={() => {
                      setDraggingId(null)
                      setDropTargetId(null)
                    }}
                    className={cn("cursor-grab active:cursor-grabbing")}
                  >
                    <FamilyLeadCard
                      id={lead.id}
                      name={lead.name}
                      email={lead.email}
                      phone={lead.phone}
                      oreGiorni={lead.oreGiorni}
                      creationDate={lead.creationDate}
                      province={lead.province}
                      stage={lead.stage}
                      jobTag={
                        lead.jobs[0]
                          ? {
                              key: lead.jobs[0],
                              label:
                                JOB_OPTIONS.find((j) => j.key === lead.jobs[0])?.label ?? "",
                            }
                          : undefined
                      }
                      contractTag={
                        lead.contract
                          ? {
                              key: lead.contract,
                              label:
                                CONTRACT_OPTIONS.find((c) => c.key === lead.contract)
                                  ?.label ?? "",
                            }
                          : undefined
                      }
                      scheduledCallAt={lead.scheduledCallAt}
                      recontactDate={lead.recontactDate}
                      callAttemptCount={lead.callAttemptCount}
                      preventivoAccettato={lead.preventivoAccettato}
                      dragging={draggingId === lead.id}
                      selected={selectedLeadId === lead.id}
                      onClick={() => {
                        setSelectedLeadId(lead.id)
                        setIsSheetOpen(true)
                      }}
                    />
                  </div>
                ))}
              </KanbanColumn>
            )
          })}
        </KanbanBoard>
      )}

      {/* Detail sheet */}
      <FamilyLeadDetailSheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open)
          if (!open) setSelectedLeadId(null)
        }}
        lead={selectedLead}
        stages={STAGES}
        jobOptions={JOB_OPTIONS}
        contractOptions={CONTRACT_OPTIONS}
        provinceOptions={PROVINCE_OPTIONS}
        stageGuideConfig={STAGE_GUIDE_CONFIG}
        onStageChange={handleStageChange}
        onJobsChange={handleJobsChange}
        onContractChange={handleContractChange}
        onPatchDetail={handlePatchDetail}
        onAddComment={handleAddComment}
        onCreateAnnuncio={handleCreateAnnuncio}
      />

      {/* Footer hint */}
      <footer className="shrink-0 border-t border-border bg-background px-6 py-1.5 text-[11px] text-muted-foreground">
        {mode === "live" ? (
          <>
            Dati reali via <code className="text-[10px]">useCrmPipelinePreview</code> ·
            le modifiche vengono salvate su Supabase. Commenti e "Crea annuncio" non ancora
            cablati al backend (richiedono nuovi endpoint / hook).
          </>
        ) : (
          <>
            Dati mock locali · interazioni non persistite. Reset ripristina i mock. Per vedere
            dati reali, toggle LIVE in alto.
          </>
        )}
      </footer>
    </div>
  )
}

// ============================================================
// Board helpers (mock mode)
// ============================================================

function moveLeadInBoard(board: Board, leadId: string, targetStage: FamilyStageId): Board {
  let sourceStageId: FamilyStageId | null = null
  let lead: FamilyLead | null = null
  for (const sid of Object.keys(board) as FamilyStageId[]) {
    const found = board[sid]?.find((l) => l.id === leadId)
    if (found) {
      sourceStageId = sid
      lead = found
      break
    }
  }
  if (!sourceStageId || !lead || sourceStageId === targetStage) return board
  return {
    ...board,
    [sourceStageId]: board[sourceStageId]!.filter((l) => l.id !== leadId),
    [targetStage]: [{ ...lead, stage: targetStage }, ...(board[targetStage] ?? [])],
  }
}

function updateLeadInBoard(
  board: Board,
  leadId: string,
  updater: (l: FamilyLead) => FamilyLead,
): Board {
  const next = {} as Board
  for (const sid of Object.keys(board) as FamilyStageId[]) {
    next[sid] = board[sid]!.map((l) => (l.id === leadId ? updater(l) : l))
  }
  return next
}
