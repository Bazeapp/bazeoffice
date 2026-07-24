import { SirenIcon, UploadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { FieldInput } from "@/components/forms/field-components"
import { Form } from "@/components/ui/form"
import { FieldDocumentiInRegolaSelect } from "./field-documenti-in-regola-select"
import { FieldHaiReferenzeSelect } from "./field-hai-referenze-select"
import { FieldNonQualificatoTipoLavoro } from "./field-non-qualificato-tipo-lavoro"
import type { NonQualificatoIssue } from "../lib/status-utils"
import type { LookupOption } from "@/lib/lookup-utils"
import type { LavoratoriCercaDetailNonQualificatoProps } from "./lavoratori-cerca-detail.types"

type NonQualificatoIssueFieldProps = {
  issue: NonQualificatoIssue
  onUploadPhoto: () => void
  updatingNonQualificato: boolean
  uploadingWorkerPhoto: boolean
  documentiInRegolaOptions: LookupOption[]
  haiReferenzeOptions: LookupOption[]
  tipoLavoroDomesticoOptions: LookupOption[]
}

function NonQualificatoIssueField({
  issue,
  onUploadPhoto,
  updatingNonQualificato,
  uploadingWorkerPhoto,
  documentiInRegolaOptions,
  haiReferenzeOptions,
  tipoLavoroDomesticoOptions,
}: NonQualificatoIssueFieldProps) {
  switch (issue.id) {
    case "missing-description":
      return (
        <FieldInput name="descrizione_pubblica" placeholder="Inserisci descrizione" />
      )
    case "missing-photo":
      return (
        <Button
          type="button"
          variant="outline"
          onClick={onUploadPhoto}
          disabled={updatingNonQualificato || uploadingWorkerPhoto}
        >
          <UploadIcon className="size-4" />
          Carica foto
        </Button>
      )
    case "not-milano":
      return <FieldInput name="provincia" placeholder="Provincia (sigla)" />
    case "documenti":
      return (
        <FieldDocumentiInRegolaSelect
          name="documenti_in_regola"
          options={documentiInRegolaOptions}
          disabled={updatingNonQualificato}
        />
      )
    case "referenze":
      return (
        <FieldHaiReferenzeSelect
          name="hai_referenze"
          options={haiReferenzeOptions}
          disabled={updatingNonQualificato}
        />
      )
    case "age":
      return <FieldInput name="data_di_nascita" type="date" />
    case "tipo-lavoro":
      return (
        <FieldNonQualificatoTipoLavoro
          name="tipo_lavoro_domestico"
          options={tipoLavoroDomesticoOptions}
          disabled={updatingNonQualificato}
        />
      )
    case "esperienza":
      return (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <FieldInput
            name="anni_esperienza_colf"
            type="number"
            inputMode="decimal"
            placeholder="Anni esperienza colf"
          />
          <FieldInput
            name="anni_esperienza_babysitter"
            type="number"
            inputMode="decimal"
            placeholder="Anni esperienza babysitter"
          />
        </div>
      )
    default:
      return null
  }
}

export function LavoratoriCercaDetailNonQualificato({
  setWorkerSectionRef,
  selectedWorkerNonQualificatoIssues,
  nonQualificatoForm,
  onUploadPhoto,
  updatingNonQualificato,
  uploadingWorkerPhoto,
  documentiInRegolaOptions,
  haiReferenzeOptions,
  tipoLavoroDomesticoOptions,
}: LavoratoriCercaDetailNonQualificatoProps) {
  return (
    <div ref={setWorkerSectionRef("non-qualificato")}>
      <Form {...nonQualificatoForm}>
        <DetailSectionBlock
          title="Questo lavoratore non è qualificato"
          icon={<SirenIcon className="text-muted-foreground size-4" />}
          contentClassName="space-y-4"
        >
          <div className="space-y-3">
            {selectedWorkerNonQualificatoIssues.map((issue) => (
              <div key={issue.id} className="space-y-1">
                <p className="font-medium">{issue.title}</p>
                <div>
                  <NonQualificatoIssueField
                    issue={issue}
                    onUploadPhoto={onUploadPhoto}
                    updatingNonQualificato={updatingNonQualificato}
                    uploadingWorkerPhoto={uploadingWorkerPhoto}
                    documentiInRegolaOptions={documentiInRegolaOptions}
                    haiReferenzeOptions={haiReferenzeOptions}
                    tipoLavoroDomesticoOptions={tipoLavoroDomesticoOptions}
                  />
                </div>
              </div>
            ))}
          </div>
        </DetailSectionBlock>
      </Form>
    </div>
  )
}
