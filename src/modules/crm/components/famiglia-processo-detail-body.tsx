import type { ReactNode } from "react"

import { OnboardingContextCard } from "./cards/onboarding-context-card"
import { CreazioneAnnuncioCard } from "./cards/creazione-annuncio-card"
import { OnboardingCard } from "./cards/onboarding-card"
import {
  buildFamigliaProcessoSectionContainerProps,
  ONBOARDING_SECTION_IDS,
} from "../lib/famiglia-processo-sections"
import { FamigliaProcessoDetailEditToggleButton } from "./famiglia-processo-detail-edit-toggle-button"
import { useFamigliaProcessoDetail } from "./famiglia-processo-detail-context"

function EditableSection({
  canEdit,
  children,
}: {
  canEdit: boolean
  children: ReactNode
}) {
  return (
    <div className={canEdit ? "space-y-4" : "space-y-4 select-none"}>{children}</div>
  )
}

export function FamigliaProcessoDetailBody() {
  const { state, actions, meta } = useFamigliaProcessoDetail()
  const {
    card,
    readOnly,
    editMode,
    sectionVisibility,
    showContextCard,
    showBlockEditActions,
    blocksCollapsible,
    firstBlockDefaultOpen,
    blocksDefaultOpen,
    announcementMissingFields,
    canEditStatoLead,
    canEditOnboarding,
    canEditAnnuncio,
    privateAreaUrl,
  } = state
  const {
    onPatchProcess,
    onPatchFamily,
    onPatchAddress,
    toggleEdit,
    validateAnnouncementRequiredFields,
  } = actions
  const { bindSectionRef, lookupOptionsByField } = meta

  const visibleOnboardingSectionIds = ONBOARDING_SECTION_IDS.filter(
    (sectionId) => sectionVisibility[sectionId]
  )
  const sectionContainerProps = buildFamigliaProcessoSectionContainerProps(
    visibleOnboardingSectionIds,
    bindSectionRef
  )

  const statoLeadEditAction =
    showBlockEditActions && editMode === "toggle" && !readOnly ? (
      <FamigliaProcessoDetailEditToggleButton
        active={canEditStatoLead}
        onToggle={() => toggleEdit("statoLead")}
        labels={{
          on: "Termina modifica stato lead",
          off: "Modifica stato lead",
        }}
      />
    ) : undefined

  const onboardingEditAction =
    showBlockEditActions && editMode === "toggle" && !readOnly ? (
      <FamigliaProcessoDetailEditToggleButton
        active={canEditOnboarding}
        onToggle={() => toggleEdit("onboarding")}
        labels={{
          on: "Termina modifica onboarding",
          off: "Modifica onboarding",
        }}
      />
    ) : undefined

  const annuncioEditAction =
    showBlockEditActions && editMode === "toggle" && !readOnly ? (
      <FamigliaProcessoDetailEditToggleButton
        active={canEditAnnuncio}
        onToggle={() => toggleEdit("annuncio")}
        labels={{
          on: "Termina modifica creazione annuncio",
          off: "Modifica creazione annuncio",
        }}
      />
    ) : undefined

  return (
    <div className="space-y-4 p-4">
      {showContextCard ? (
        <EditableSection canEdit={canEditStatoLead}>
          <OnboardingContextCard
            card={card}
            lookupOptionsByField={lookupOptionsByField}
            titleAction={statoLeadEditAction}
            collapsible={blocksCollapsible}
            defaultOpen={firstBlockDefaultOpen}
            onPatchProcess={canEditStatoLead ? onPatchProcess : undefined}
            onPatchFamily={canEditStatoLead ? onPatchFamily : undefined}
          />
        </EditableSection>
      ) : null}

      <EditableSection canEdit={canEditOnboarding}>
        <OnboardingCard
          card={card}
          lookupOptionsByField={lookupOptionsByField}
          flattenSections
          sectionContainerProps={sectionContainerProps}
          showOrariFrequenza={sectionVisibility["orari-frequenza"]}
          showLuogoLavoro={sectionVisibility["luogo-lavoro"]}
          showFamiglia={sectionVisibility.famiglia}
          showCasa={sectionVisibility.casa}
          showAnimali={sectionVisibility.animali}
          showMansioni={sectionVisibility.mansioni}
          showRichiesteSpecifiche={sectionVisibility["richieste-specifiche"]}
          showTempistiche={sectionVisibility.tempistiche}
          requiredMissingFields={announcementMissingFields}
          privateAreaUrl={privateAreaUrl}
          sectionTitleAction={onboardingEditAction}
          sectionsCollapsible={blocksCollapsible}
          firstSectionDefaultOpen={firstBlockDefaultOpen}
          sectionsDefaultOpen={blocksDefaultOpen}
          onPatchProcess={canEditOnboarding ? onPatchProcess : undefined}
          onPatchAddress={canEditOnboarding ? onPatchAddress : undefined}
          readOnly={!canEditOnboarding}
        />
      </EditableSection>

      {sectionVisibility["creazione-annuncio"] ? (
        <EditableSection canEdit={canEditAnnuncio}>
          {readOnly ? (
            <CreazioneAnnuncioCard
              title="Annuncio"
              brief={card?.testoAnnuncioWhatsapp}
              briefOnly
              collapsible={blocksCollapsible}
              defaultOpen={blocksDefaultOpen}
              containerProps={{ ref: bindSectionRef("creazione-annuncio") }}
            />
          ) : (
            <CreazioneAnnuncioCard
              processId={card?.id ?? null}
              brief={card?.testoAnnuncioWhatsapp}
              onBeforeCreate={validateAnnouncementRequiredFields}
              containerProps={{ ref: bindSectionRef("creazione-annuncio") }}
              titleAction={annuncioEditAction}
              collapsible={blocksCollapsible}
              defaultOpen={blocksDefaultOpen}
            />
          )}
        </EditableSection>
      ) : null}
    </div>
  )
}
