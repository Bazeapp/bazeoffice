/**
 * FamilyLeadDetailSheet — detail sheet unificato della Pipeline Famiglie.
 * Vedi spec `outputs/04_spec/domain/family-lead-detail-sheet.md`.
 */
import * as React from "react"
import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react"

import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

import { FamilyCommentsSection } from "./family-comments-section"
import { FamilyHeadPills } from "./family-head-pills"
import { FamilyStageGuide } from "./family-stage-guide"
import {
  DETAIL_TABS,
  FamilyDetailSectionAnimali,
  FamilyDetailSectionAnnuncio,
  FamilyDetailSectionCasa,
  FamilyDetailSectionFamiglia,
  FamilyDetailSectionLuogo,
  FamilyDetailSectionMansioni,
  FamilyDetailSectionOrari,
  FamilyDetailSectionRichieste,
  FamilyDetailSectionTempistiche,
  type DetailTabId,
} from "./family-detail-sections"

import type {
  FamilyLead,
  FamilyStage,
  FamilyJobKey,
  FamilyContractKey,
  FamilyStageId,
  FamilyDetailData,
  FamilyTag,
  StageGuideEntry,
} from "@/pages/_dev-family-mock-data"

type FamilyLeadDetailSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void

  lead: FamilyLead | null

  stages: FamilyStage[]
  jobOptions: Array<FamilyTag<FamilyJobKey>>
  contractOptions: Array<FamilyTag<FamilyContractKey>>
  provinceOptions: Array<{ value: string; label: string }>
  stageGuideConfig: Partial<Record<FamilyStageId, StageGuideEntry>>

  readOnly?: boolean
  size?: "default" | "wide"

  onStageChange?: (leadId: string, next: FamilyStageId) => void
  onJobsChange?: (leadId: string, next: FamilyJobKey[]) => void
  onContractChange?: (leadId: string, next: FamilyContractKey) => void
  onPatchDetail?: (leadId: string, patch: Partial<FamilyDetailData>) => void
  onAddComment?: (leadId: string, text: string) => void
  onCreateAnnuncio?: (leadId: string) => void
}

export function FamilyLeadDetailSheet({
  open,
  onOpenChange,
  lead,
  stages,
  jobOptions,
  contractOptions,
  provinceOptions,
  stageGuideConfig,
  readOnly,
  size = "default",
  onStageChange,
  onJobsChange,
  onContractChange,
  onPatchDetail,
  onAddComment,
  onCreateAnnuncio,
}: FamilyLeadDetailSheetProps) {
  const [activeTab, setActiveTab] = React.useState<DetailTabId>("orari")

  // Reset tab al cambio lead
  React.useEffect(() => {
    if (lead) setActiveTab("orari")
  }, [lead?.id])

  if (!lead) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[min(96vw,760px)] sm:max-w-none">
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Nessun lead selezionato
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const widthClass =
    size === "wide" ? "!w-[min(98vw,1120px)]" : "!w-[min(96vw,760px)]"

  const detail = lead.detail

  const handlePatch = (patch: Partial<FamilyDetailData>) =>
    onPatchDetail?.(lead.id, patch)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        className={cn(
          "flex flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-none",
          widthClass,
        )}
      >
        {/* Head sticky */}
        <div className="shrink-0 border-b border-border bg-background px-5 pt-5 pb-3">
          <div className="mb-1 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[17px] font-semibold text-foreground">
                {lead.name}
              </h2>
              <p className="ui-type-meta text-[11px] text-muted-foreground">
                {lead.id}
              </p>
            </div>
          </div>

          {/* Meta row */}
          <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MailIcon className="size-3" />
              {lead.email}
            </span>
            <span className="inline-flex items-center gap-1">
              <PhoneIcon className="size-3" />
              {lead.phone}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPinIcon className="size-3" />
              {lead.province}
            </span>
          </div>

          {/* Pills */}
          <FamilyHeadPills
            stage={lead.stage}
            stageOptions={stages}
            onStageChange={(s) => onStageChange?.(lead.id, s)}
            jobs={lead.jobs}
            jobOptions={jobOptions}
            onJobsChange={(j) => onJobsChange?.(lead.id, j)}
            contract={lead.contract}
            contractOptions={contractOptions}
            onContractChange={(c) => onContractChange?.(lead.id, c)}
            readOnly={readOnly}
            className="mb-3"
          />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DetailTabId)}>
            <TabsList
              variant="line"
              className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {DETAIL_TABS.map((t) => {
                const Icon = t.icon
                return (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className="h-9 shrink-0 gap-1.5 rounded-none border-b-2 border-transparent px-2 text-[12.5px] text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground"
                  >
                    <Icon className="size-3.5" />
                    {t.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Body scrollabile */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-5 py-4">
          {/* Stage Guide (persistente, fuori dalle tab) */}
          <FamilyStageGuide
            stage={lead.stage}
            stages={stages}
            config={stageGuideConfig}
            data={detail as Record<string, unknown>}
            onPatch={handlePatch}
            readOnly={readOnly}
            className="mb-4"
          />

          {/* Contenuto tab attiva */}
          {activeTab === "orari" && (
            <FamilyDetailSectionOrari
              data={detail}
              readOnly={readOnly}
              onPatch={handlePatch}
            />
          )}
          {activeTab === "luogo" && (
            <FamilyDetailSectionLuogo
              data={detail}
              provinceOptions={provinceOptions}
              readOnly={readOnly}
              onPatch={handlePatch}
            />
          )}
          {activeTab === "famiglia" && (
            <FamilyDetailSectionFamiglia
              data={detail}
              readOnly={readOnly}
              onPatch={handlePatch}
            />
          )}
          {activeTab === "casa" && (
            <FamilyDetailSectionCasa
              data={detail}
              readOnly={readOnly}
              onPatch={handlePatch}
            />
          )}
          {activeTab === "animali" && (
            <FamilyDetailSectionAnimali
              data={detail}
              readOnly={readOnly}
              onPatch={handlePatch}
            />
          )}
          {activeTab === "mansioni" && (
            <FamilyDetailSectionMansioni
              data={detail}
              readOnly={readOnly}
              onPatch={handlePatch}
            />
          )}
          {activeTab === "richieste" && (
            <FamilyDetailSectionRichieste
              data={detail}
              readOnly={readOnly}
              onPatch={handlePatch}
            />
          )}
          {activeTab === "tempistiche" && (
            <FamilyDetailSectionTempistiche
              data={detail}
              readOnly={readOnly}
              onPatch={handlePatch}
            />
          )}
          {activeTab === "annuncio" && (
            <FamilyDetailSectionAnnuncio
              data={detail}
              readOnly={readOnly}
              onPatch={handlePatch}
              onCreate={() => onCreateAnnuncio?.(lead.id)}
            />
          )}
        </div>

        {/* Footer commenti */}
        <FamilyCommentsSection
          comments={lead.comments}
          onAddComment={(text) => onAddComment?.(lead.id, text)}
        />
      </SheetContent>
    </Sheet>
  )
}

// Suppress unused warning (stageInfo is reserved for future visual use)
export const _FAMILY_STAGE_INFO_CHECK = (s: FamilyStage) => s
