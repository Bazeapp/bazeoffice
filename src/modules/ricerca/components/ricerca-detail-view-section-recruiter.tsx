import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { OperatoreOption } from "@/hooks/use-operatori-options"
import type { RicercaDetailCardData, RicercaDetailSectionEdit } from "../lib/ricerca-detail-view.types"
import {
  RicercaDetailEditableDateField,
  RicercaDetailSectionEditBar,
} from "./ricerca-detail-view-shared"

type Props = {
  card: RicercaDetailCardData
  sectionEdit: RicercaDetailSectionEdit
  assignedRecruiter: OperatoreOption | null
  recruiterSelectOptions: OperatoreOption[]
  saveProcessPatch: (section: string, patch: Record<string, unknown>) => void | Promise<void>
}

export function RicercaDetailViewSectionRecruiter({
  card,
  sectionEdit,
  assignedRecruiter,
  recruiterSelectOptions,
  saveProcessPatch,
}: Props) {
  return (
    <AccordionItem value="recruiter">
      <AccordionTrigger
        titleAction={<RicercaDetailSectionEditBar {...sectionEdit} />}
      >
        Recruiter
      </AccordionTrigger>
      <AccordionContent className="space-y-3">
        <Field>
          <FieldLabel variant="eyebrow">Recruiter assegnato</FieldLabel>
          {sectionEdit.editing ? (
            <Select
              value={card.recruiterId || "none"}
              onValueChange={(next) =>
                void saveProcessPatch("recruiter", {
                  recruiter_ricerca_e_selezione_id: next === "none" ? null : next,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona recruiter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non assegnata</SelectItem>
                {recruiterSelectOptions.map((operator) => (
                  <SelectItem key={operator.id} value={operator.id}>
                    {operator.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-foreground">
              {assignedRecruiter?.label ?? "Non assegnata"}
            </p>
          )}
        </Field>
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
