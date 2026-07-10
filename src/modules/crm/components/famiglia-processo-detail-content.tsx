import * as React from "react"
import { toast } from "sonner"

import { Form } from "@/components/ui/form"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { buildFamilyPrivateAreaUrl } from "@/lib/private-area-url"
import { cn } from "@/lib/utils"
import { useFamigliaProcessoDuplicate } from "../hooks/use-famiglia-processo-duplicate"
import { useFamigliaProcessoEditMode } from "../hooks/use-famiglia-processo-edit-mode"
import { useFamigliaProcessoSectionScroll } from "../hooks/use-famiglia-processo-section-scroll"
import {
  ANNOUNCEMENT_REQUIRED_FIELD_SECTION,
  formatMissingAnnouncementFieldLabels,
  getMissingAnnouncementFields,
  type AnnouncementRequiredField,
} from "../lib/famiglia-processo-announcement"
import {
  buildFamigliaProcessoHeaderFormDefaults,
  buildFamigliaProcessoHeaderFormSaveHandler,
} from "../lib/famiglia-processo-header-form"
import {
  getVisibleFamigliaProcessoTabs,
  resolveFamigliaProcessoSectionVisibility,
} from "../lib/famiglia-processo-sections"
import type { CrmPipelineCardData, LookupOptionsByField } from "../types"
import { FamigliaProcessoDetailBody } from "./famiglia-processo-detail-body"
import { FamigliaProcessoDetailHeader } from "./famiglia-processo-detail-header"
import {
  FamigliaProcessoDetailProvider,
} from "./famiglia-processo-detail-provider"
import type { FamigliaProcessoDetailContextValue } from "./famiglia-processo-detail-context"

export type FamigliaProcessoDetailContentProps = {
  card: CrmPipelineCardData | null
  lookupOptionsByField: LookupOptionsByField
  editMode?: "always" | "toggle"
  onChangeStatoSales?: (processId: string, targetStageId: string) => void | Promise<void>
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
  showTempistiche?: boolean
  showAnnuncio?: boolean
  showHeaderMeta?: boolean
  showPrimaryControls?: boolean
  showContextCard?: boolean
  showOrariFrequenza?: boolean
  showLuogoLavoro?: boolean
  showFamiglia?: boolean
  showCasa?: boolean
  showAnimali?: boolean
  showMansioni?: boolean
  showRichiesteSpecifiche?: boolean
  showBlockEditActions?: boolean
  blocksCollapsible?: boolean
  firstBlockDefaultOpen?: boolean
  blocksDefaultOpen?: boolean
  isActive?: boolean
  readOnly?: boolean
  headerAction?: React.ReactNode
  className?: string
}

export function FamigliaProcessoDetailContent({
  card,
  lookupOptionsByField,
  editMode = "always",
  onChangeStatoSales,
  onPatchProcess,
  onPatchFamily,
  onPatchAddress,
  showTempistiche = true,
  showAnnuncio = true,
  showHeaderMeta = true,
  showPrimaryControls = true,
  showContextCard = true,
  showOrariFrequenza = true,
  showLuogoLavoro = true,
  showFamiglia = true,
  showCasa = true,
  showAnimali = true,
  showMansioni = true,
  showRichiesteSpecifiche = true,
  showBlockEditActions = true,
  blocksCollapsible = true,
  firstBlockDefaultOpen = true,
  blocksDefaultOpen = true,
  isActive = true,
  readOnly = false,
  headerAction,
  className,
}: FamigliaProcessoDetailContentProps) {
  const sectionVisibility = React.useMemo(
    () =>
      resolveFamigliaProcessoSectionVisibility({
        "orari-frequenza": showOrariFrequenza,
        "luogo-lavoro": showLuogoLavoro,
        famiglia: showFamiglia,
        casa: showCasa,
        animali: showAnimali,
        mansioni: showMansioni,
        "richieste-specifiche": showRichiesteSpecifiche,
        tempistiche: showTempistiche,
        "creazione-annuncio": showAnnuncio,
      }),
    [
      showAnimali,
      showAnnuncio,
      showCasa,
      showFamiglia,
      showLuogoLavoro,
      showMansioni,
      showOrariFrequenza,
      showRichiesteSpecifiche,
      showTempistiche,
    ]
  )
  const visibleTabs = React.useMemo(
    () => getVisibleFamigliaProcessoTabs(sectionVisibility),
    [sectionVisibility]
  )

  const { detailScrollRef, activeSection, bindSectionRef, scrollToSection } =
    useFamigliaProcessoSectionScroll({
      visibleTabs,
      cardId: card?.id,
      isActive,
    })

  const {
    isEditingFamilyHeader,
    canEditStatoLead,
    canEditOnboarding,
    canEditAnnuncio,
    toggleEdit,
    setEditingOnboarding,
  } = useFamigliaProcessoEditMode({
    editMode,
    readOnly,
    isActive,
    cardId: card?.id,
  })

  const { isDuplicating, duplicateProcesso } = useFamigliaProcessoDuplicate(card?.id)

  const familyId = card?.famigliaId
  const processId = card?.id
  const form = useAutoSaveForm({
    defaults: buildFamigliaProcessoHeaderFormDefaults(card),
    onSave: buildFamigliaProcessoHeaderFormSaveHandler({
      familyId,
      processId,
      onPatchFamily,
      onPatchProcess,
    }),
  })

  const [announcementMissingFields, setAnnouncementMissingFields] = React.useState<
    AnnouncementRequiredField[]
  >([])

  React.useEffect(() => {
    setAnnouncementMissingFields([])
  }, [card?.id])

  const validateAnnouncementRequiredFields = React.useCallback(() => {
    const missing = getMissingAnnouncementFields(card)
    setAnnouncementMissingFields(missing)

    if (missing.length === 0) return true

    if (editMode === "toggle" && !readOnly) {
      setEditingOnboarding(true)
    }

    const firstVisibleSection = missing
      .map((field) => ANNOUNCEMENT_REQUIRED_FIELD_SECTION[field])
      .find((sectionId) => visibleTabs.some((tab) => tab.id === sectionId))

    if (firstVisibleSection) {
      window.setTimeout(() => scrollToSection(firstVisibleSection), 0)
    }

    toast.error(`Compila i campi obbligatori: ${formatMissingAnnouncementFieldLabels(missing)}`)
    return false
  }, [card, editMode, readOnly, scrollToSection, setEditingOnboarding, visibleTabs])

  const privateAreaUrl = buildFamilyPrivateAreaUrl(card?.email, card?.famigliaId) ?? ""
  const canEditFamilyHeader =
    !readOnly &&
    Boolean(onPatchFamily) &&
    Boolean(card?.famigliaId) &&
    card?.famigliaId !== "-"

  const contextValue = React.useMemo<FamigliaProcessoDetailContextValue>(
    () => ({
      state: {
        card,
        readOnly,
        editMode,
        sectionVisibility,
        showHeaderMeta,
        showPrimaryControls,
        showContextCard,
        showBlockEditActions,
        blocksCollapsible,
        firstBlockDefaultOpen,
        blocksDefaultOpen,
        visibleTabs,
        activeSection,
        announcementMissingFields,
        canEditStatoLead,
        canEditOnboarding,
        canEditAnnuncio,
        isEditingFamilyHeader,
        canEditFamilyHeader,
        isDuplicating,
        privateAreaUrl,
        headerAction,
        className,
      },
      actions: {
        onChangeStatoSales,
        onPatchProcess,
        onPatchFamily,
        onPatchAddress,
        scrollToSection,
        toggleEdit,
        validateAnnouncementRequiredFields,
        duplicateProcesso,
      },
      meta: {
        detailScrollRef,
        bindSectionRef,
        form,
        lookupOptionsByField,
      },
    }),
    [
      activeSection,
      announcementMissingFields,
      bindSectionRef,
      blocksCollapsible,
      blocksDefaultOpen,
      canEditAnnuncio,
      canEditFamilyHeader,
      canEditOnboarding,
      canEditStatoLead,
      card,
      className,
      detailScrollRef,
      duplicateProcesso,
      editMode,
      firstBlockDefaultOpen,
      form,
      headerAction,
      isDuplicating,
      isEditingFamilyHeader,
      lookupOptionsByField,
      onChangeStatoSales,
      onPatchAddress,
      onPatchFamily,
      onPatchProcess,
      privateAreaUrl,
      readOnly,
      scrollToSection,
      sectionVisibility,
      showBlockEditActions,
      showContextCard,
      showHeaderMeta,
      showPrimaryControls,
      toggleEdit,
      validateAnnouncementRequiredFields,
      visibleTabs,
    ]
  )

  return (
    <FamigliaProcessoDetailProvider value={contextValue}>
      <Form {...form}>
        <section
          ref={detailScrollRef}
          className={cn(
            "bg-surface-muted relative h-full min-h-0 overflow-y-auto",
            className
          )}
        >
          <FamigliaProcessoDetailHeader />
          <FamigliaProcessoDetailBody />
        </section>
      </Form>
    </FamigliaProcessoDetailProvider>
  )
}
