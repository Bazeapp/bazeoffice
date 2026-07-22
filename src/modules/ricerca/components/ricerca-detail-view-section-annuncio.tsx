import { CopyIcon } from "lucide-react"
import { toast } from "sonner"

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import type { RicercaDetailCardData, RicercaDetailSectionEdit } from "../lib/ricerca-detail-view.types"
import {
  RicercaDetailEditableTextField,
  RicercaDetailSectionEditBar,
} from "./ricerca-detail-view-shared"

type Props = {
  card: RicercaDetailCardData
  sectionEdit: RicercaDetailSectionEdit
}

export function RicercaDetailViewSectionAnnuncio({ card, sectionEdit }: Props) {
  const brief = card.testoAnnuncioWhatsapp?.trim() ?? ""
  const hasBrief = brief && brief !== "-"

  return (
    <AccordionItem value="annuncio">
      <AccordionTrigger
        titleAction={<RicercaDetailSectionEditBar {...sectionEdit} />}
      >
        Annuncio
      </AccordionTrigger>
      <AccordionContent className="space-y-3">
        {sectionEdit.editing ? (
          <RicercaDetailEditableTextField
            label="Testo per WhatsApp"
            name="testo_annuncio_whatsapp"
            value={card.testoAnnuncioWhatsapp}
            editing
            multiline
          />
        ) : null}
        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel variant="eyebrow">Testo per WhatsApp</FieldLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasBrief}
              onClick={() => {
                if (!hasBrief) return
                void navigator.clipboard
                  .writeText(brief)
                  .then(() => toast.success("Testo copiato"))
                  .catch(() => toast.error("Impossibile copiare"))
              }}
            >
              <CopyIcon className="size-3.5" />
              Copia
            </Button>
          </div>
          <div className="rounded-md border bg-surface-muted p-3">
            {hasBrief ? (
              <div className="ml-auto max-w-[92%] whitespace-pre-wrap rounded-xl rounded-br-sm border border-emerald-200 bg-emerald-100/80 px-3 py-2 text-sm leading-relaxed text-foreground shadow-sm">
                {brief}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nessun annuncio disponibile.
              </p>
            )}
          </div>
        </Field>
      </AccordionContent>
    </AccordionItem>
  )
}
