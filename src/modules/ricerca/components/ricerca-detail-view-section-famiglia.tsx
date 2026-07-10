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
  privateAreaUrl: string | null
}

export function RicercaDetailViewSectionFamiglia({
  card,
  sectionEdit,
  privateAreaUrl,
}: Props) {
  return (
    <AccordionItem value="famiglia">
      <AccordionTrigger
        titleAction={<RicercaDetailSectionEditBar {...sectionEdit} />}
      >
        Famiglia
      </AccordionTrigger>
      <AccordionContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field className="col-span-2">
            <FieldLabel variant="eyebrow">Link area privata</FieldLabel>
            {privateAreaUrl ? (
              <div className="flex min-w-0 items-center gap-2">
                <a
                  href={privateAreaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 truncate text-sm font-medium text-blue-600 underline-offset-2 hover:underline"
                >
                  Apri area privata
                </a>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 px-2"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(privateAreaUrl)
                      .then(() => toast.success("Link copiato"))
                      .catch(() => toast.error("Impossibile copiare"))
                  }}
                >
                  <CopyIcon className="size-3.5" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-foreground">—</p>
            )}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <RicercaDetailEditableTextField
            label="Nucleo famigliare"
            name="nucleo_famigliare"
            value={card.nucleoFamigliare}
            editing={sectionEdit.editing}
          />
        </div>
        <RicercaDetailEditableTextField
          label="Descrizione casa"
          name="descrizione_casa"
          value={card.descrizioneCasa}
          editing={sectionEdit.editing}
          multiline
        />
        <div className="grid grid-cols-2 gap-3">
          <RicercaDetailEditableTextField
            label="Metratura casa"
            name="metratura_casa"
            value={card.metraturaCasa}
            editing={sectionEdit.editing}
          />
        </div>
        <RicercaDetailEditableTextField
          label="Animali in casa"
          name="descrizione_animali_in_casa"
          value={card.descrizioneAnimaliInCasa}
          editing={sectionEdit.editing}
          multiline
        />
      </AccordionContent>
    </AccordionItem>
  )
}
