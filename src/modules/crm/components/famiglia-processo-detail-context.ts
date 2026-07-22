import * as React from "react"
import type { UseFormReturn } from "react-hook-form"

import type { AnnouncementRequiredField } from "../lib/famiglia-processo-announcement"
import type { FamigliaProcessoHeaderFormValues } from "../lib/famiglia-processo-header-form"
import type {
  FamigliaProcessoSectionId,
  FamigliaProcessoSectionTab,
  FamigliaProcessoSectionVisibility,
} from "../lib/famiglia-processo-sections"
import type { CrmPipelineCardData, LookupOptionsByField } from "../types"
import type { FamigliaProcessoEditBlock } from "../hooks/use-famiglia-processo-edit-mode"

export type FamigliaProcessoDetailContextValue = {
  state: {
    card: CrmPipelineCardData | null
    readOnly: boolean
    editMode: "always" | "toggle"
    sectionVisibility: FamigliaProcessoSectionVisibility
    showHeaderMeta: boolean
    showPrimaryControls: boolean
    showContextCard: boolean
    showBlockEditActions: boolean
    blocksCollapsible: boolean
    firstBlockDefaultOpen: boolean
    blocksDefaultOpen: boolean
    visibleTabs: FamigliaProcessoSectionTab[]
    activeSection: FamigliaProcessoSectionId
    announcementMissingFields: AnnouncementRequiredField[]
    canEditStatoLead: boolean
    canEditOnboarding: boolean
    canEditAnnuncio: boolean
    isEditingFamilyHeader: boolean
    canEditFamilyHeader: boolean
    isDuplicating: boolean
    privateAreaUrl: string
    headerAction?: React.ReactNode
    className?: string
  }
  actions: {
    onChangeStatoSales?: (
      processId: string,
      targetStageId: string
    ) => void | Promise<void>
    onPatchProcess?: (
      processId: string,
      patch: Record<string, unknown>
    ) => void | Promise<void>
    onPatchFamily?: (
      familyId: string,
      patch: Record<string, unknown>
    ) => void | Promise<void>
    onPatchAddress?: (
      processId: string,
      addressId: string | null,
      patch: Record<string, unknown>
    ) => void | Promise<void>
    scrollToSection: (sectionId: FamigliaProcessoSectionId) => void
    toggleEdit: (block: FamigliaProcessoEditBlock) => void
    validateAnnouncementRequiredFields: () => boolean
    duplicateProcesso: () => void | Promise<void>
  }
  meta: {
    detailScrollRef: React.RefObject<HTMLDivElement | null>
    bindSectionRef: (
      sectionId: FamigliaProcessoSectionId
    ) => (node: HTMLDivElement | null) => void
    form: UseFormReturn<FamigliaProcessoHeaderFormValues>
    lookupOptionsByField: LookupOptionsByField
  }
}

export const FamigliaProcessoDetailContext =
  React.createContext<FamigliaProcessoDetailContextValue | null>(null)

export function useFamigliaProcessoDetail() {
  const context = React.useContext(FamigliaProcessoDetailContext)
  if (!context) {
    throw new Error(
      "useFamigliaProcessoDetail must be used within FamigliaProcessoDetailProvider"
    )
  }
  return context
}
