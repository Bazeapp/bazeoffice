import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { RicercaDetailCardData, RicercaDetailSectionEdit } from "../lib/ricerca-detail-view.types"
import {
  RicercaDetailEditableDateField,
  RicercaDetailEditableTextField,
  RicercaDetailSectionEditBar,
} from "./ricerca-detail-view-shared"

type Props = {
  card: RicercaDetailCardData
  sectionEdit: RicercaDetailSectionEdit
}

export function RicercaDetailViewSectionTempistiche({ card, sectionEdit }: Props) {
  return (
    <AccordionItem value="tempistiche">
      <AccordionTrigger
        titleAction={<RicercaDetailSectionEditBar {...sectionEdit} />}
      >
        Tempistiche
      </AccordionTrigger>
      <AccordionContent className="space-y-3">
        <RicercaDetailEditableDateField
          label="Deadline"
          name="deadline_mobile"
          value={card.deadlineMobileRaw || card.deadlineMobile}
          editing={sectionEdit.editing}
        />
        <RicercaDetailEditableTextField
          label="Disponibilità colloqui"
          name="disponibilita_colloqui_in_presenza"
          value={card.disponibilitaColloquiInPresenza}
          editing={sectionEdit.editing}
          multiline
        />
        <RicercaDetailEditableDateField
          label="Data assegnazione"
          name="data_assegnazione"
          value={card.dataAssegnazioneRaw || card.dataAssegnazione}
          editing={sectionEdit.editing}
        />
      </AccordionContent>
    </AccordionItem>
  )
}
