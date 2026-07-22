import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { LookupOption } from "@/modules/lavoratori/lib"
import type { RicercaDetailCardData, RicercaDetailSectionEdit } from "../lib/ricerca-detail-view.types"
import {
  RicercaDetailEditableTextField,
  RicercaDetailSectionEditBar,
} from "./ricerca-detail-view-shared"
import { RicercaDetailReadOnlyField } from "./ricerca-detail-view-states"

type Props = {
  card: RicercaDetailCardData
  sectionEdit: RicercaDetailSectionEdit
  provincieOptions: LookupOption[]
  saveAddressPatch: (section: string, patch: Record<string, unknown>) => void | Promise<void>
}

export function RicercaDetailViewSectionLuogoLavoro({
  card,
  sectionEdit,
  provincieOptions,
  saveAddressPatch,
}: Props) {
  return (
    <AccordionItem value="luogo-lavoro">
      <AccordionTrigger
        titleAction={<RicercaDetailSectionEditBar {...sectionEdit} />}
      >
        Luogo di lavoro
      </AccordionTrigger>
      <AccordionContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <FieldLabel>Provincia</FieldLabel>
            {sectionEdit.editing ? (
              <Select
                value={card.indirizzoProvincia || "none"}
                onValueChange={(next) => {
                  const value = next === "none" ? "" : next
                  void saveAddressPatch("luogo-lavoro", {
                    provincia_sigla: value || null,
                  })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona provincia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {provincieOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm">{card.indirizzoProvincia || "—"}</p>
            )}
          </div>
          <RicercaDetailEditableTextField
            label="CAP"
            name="cap"
            value={card.indirizzoCap}
            editing={sectionEdit.editing}
          />
        </div>
        <RicercaDetailEditableTextField
          label="Quartiere"
          name="note"
          value={card.indirizzoNote}
          editing={sectionEdit.editing}
        />
        {sectionEdit.editing ? (
          <div className="grid grid-cols-2 gap-3">
            <RicercaDetailEditableTextField
              label="Via"
              name="via"
              value={card.indirizzoVia}
              editing
            />
            <RicercaDetailEditableTextField
              label="Civico"
              name="civico"
              value={card.indirizzoCivico}
              editing
            />
            <RicercaDetailEditableTextField
              label="Comune"
              name="citta"
              value={card.indirizzoComune}
              editing
            />
            <RicercaDetailEditableTextField
              label="Citofono"
              name="citofono"
              value={card.indirizzoCitofono}
              editing
            />
          </div>
        ) : (
          <RicercaDetailReadOnlyField
            label="Indirizzo completo"
            value={card.indirizzoCompleto}
          />
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
