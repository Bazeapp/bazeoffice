import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { RicercaDetailCardData, RicercaDetailSectionEdit } from "../lib/ricerca-detail-view.types"
import {
  RicercaDetailEditableTextField,
  RicercaDetailSectionEditBar,
} from "./ricerca-detail-view-shared"

type Props = {
  card: RicercaDetailCardData
  sectionEdit: RicercaDetailSectionEdit
}

export function RicercaDetailViewSectionMansioni({ card, sectionEdit }: Props) {
  return (
    <AccordionItem value="mansioni">
      <AccordionTrigger
        titleAction={<RicercaDetailSectionEditBar {...sectionEdit} />}
      >
        Mansioni
      </AccordionTrigger>
      <AccordionContent className="space-y-3">
        <RicercaDetailEditableTextField
          label="Mansioni richieste"
          name="mansioni_richieste"
          value={card.mansioniRichieste}
          editing={sectionEdit.editing}
          multiline
        />
      </AccordionContent>
    </AccordionItem>
  )
}
