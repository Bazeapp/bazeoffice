import { BriefcaseBusinessIcon, PencilIcon } from "lucide-react"

import {
  DetailField,
  DetailFieldControl,
  DetailSectionBlock,
} from "@/components/shared-next/detail-section-card"
import { FieldInput } from "@/components/forms/field-components"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { formatItalianCurrency } from "@/lib/format-utils"
import type { RapportoLavorativoRecord } from "@/types"

import { getDurationLabel } from "../lib/rapporto-detail-panel.utils"

type RapportoDetailPanelSectionContrattoProps = {
  sectionRef: (element: HTMLDivElement | null) => void
  rapportoView: RapportoLavorativoRecord
  startDateLabel: string
  isEditing: boolean
  onToggleEdit: () => void
}

export function RapportoDetailPanelSectionContratto({
  sectionRef,
  rapportoView,
  startDateLabel,
  isEditing,
  onToggleEdit,
}: RapportoDetailPanelSectionContrattoProps) {
  return (
    <div ref={sectionRef}>
      <DetailSectionBlock
        title="Caratteristiche del rapporto"
        icon={<BriefcaseBusinessIcon className="size-5" />}
        action={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleEdit}
            aria-label={
              isEditing
                ? "Chiudi modifica caratteristiche del rapporto"
                : "Modifica caratteristiche del rapporto"
            }
            title={
              isEditing
                ? "Chiudi modifica caratteristiche del rapporto"
                : "Modifica caratteristiche del rapporto"
            }
          >
            <PencilIcon className="size-4" />
          </Button>
        }
      >
        <div className="space-y-4">
          {isEditing ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DetailFieldControl label="Tipo contratto">
                <Input value={rapportoView.tipo_contratto ?? ""} readOnly />
              </DetailFieldControl>
              <DetailFieldControl label="Tipo rapporto">
                <Select value={rapportoView.tipo_rapporto || "__empty__"} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo rapporto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">Non impostato</SelectItem>
                    <SelectItem value="Lavoro ad ore">Lavoro ad ore</SelectItem>
                    <SelectItem value="Part time">Part time</SelectItem>
                    <SelectItem value="Convivente">Convivente</SelectItem>
                    <SelectItem value="Non convivente full-time">Non convivente full-time</SelectItem>
                    {rapportoView.tipo_rapporto &&
                    ![
                      "Lavoro ad ore",
                      "Part time",
                      "Convivente",
                      "Non convivente full-time",
                    ].includes(rapportoView.tipo_rapporto) ? (
                      <SelectItem value={rapportoView.tipo_rapporto}>
                        {rapportoView.tipo_rapporto}
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </DetailFieldControl>
              <DetailFieldControl label="Data inizio">
                <Input
                  type="date"
                  value={(rapportoView.data_inizio_rapporto ?? "").slice(0, 10)}
                  readOnly
                />
              </DetailFieldControl>
              <DetailField label="Durata" value={getDurationLabel(rapportoView.data_inizio_rapporto)} />
              <DetailFieldControl label="Stato assunzione">
                <Input value={rapportoView.stato_assunzione ?? ""} readOnly />
              </DetailFieldControl>
              <DetailFieldControl label="Relazione lavorativa">
                <Input value={rapportoView.relazione_lavorativa ?? ""} readOnly />
              </DetailFieldControl>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DetailField label="Tipo contratto" value={rapportoView.tipo_contratto ?? "-"} />
              <DetailField label="Tipo rapporto" value={rapportoView.tipo_rapporto ?? "-"} />
              <DetailField label="Data inizio" value={startDateLabel} />
              <DetailField label="Durata" value={getDurationLabel(rapportoView.data_inizio_rapporto)} />
              <DetailField label="Stato assunzione" value={rapportoView.stato_assunzione ?? "-"} />
              <DetailField label="Relazione lavorativa" value={rapportoView.relazione_lavorativa ?? "-"} />
            </div>
          )}
        </div>

        <Separator className="bg-border/60" />

        <div className="space-y-1">
          <p className="ui-type-label">Distribuzione ore settimanali</p>
          <p className="ui-type-meta">Parte da domenica</p>
          <p className="ui-type-value">{rapportoView.distribuzione_ore_settimana || "-"}</p>
        </div>

        <Separator className="bg-border/60" />

        <div className="space-y-4">
          {isEditing ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DetailFieldControl label="Paga oraria lorda">
                <Input
                  type="number"
                  step="0.01"
                  value={
                    typeof rapportoView.paga_oraria_lorda === "number"
                      ? String(rapportoView.paga_oraria_lorda)
                      : ""
                  }
                  readOnly
                />
              </DetailFieldControl>
              <DetailFieldControl label="Paga mensile lorda">
                <Input
                  type="number"
                  step="0.01"
                  value={
                    typeof rapportoView.paga_mensile_lorda === "number"
                      ? String(rapportoView.paga_mensile_lorda)
                      : ""
                  }
                  readOnly
                />
              </DetailFieldControl>
              <DetailFieldControl label="Cod. rapporto Webcolf">
                <FieldInput name="codice_datore_webcolf" type="number" />
              </DetailFieldControl>
              <DetailFieldControl label="Cod. lavoratore Webcolf">
                <FieldInput name="codice_dipendente_webcolf" type="number" />
              </DetailFieldControl>
              <DetailField label="ID rapporto INPS" value={rapportoView.id_rapporto ?? "-"} />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DetailField
                label="Paga oraria lorda"
                value={formatItalianCurrency(rapportoView.paga_oraria_lorda)}
              />
              <DetailField
                label="Paga mensile lorda"
                value={formatItalianCurrency(rapportoView.paga_mensile_lorda)}
              />
              <DetailField
                label="Cod. rapporto Webcolf"
                value={rapportoView.codice_datore_webcolf ? String(rapportoView.codice_datore_webcolf) : "-"}
              />
              <DetailField
                label="Cod. lavoratore Webcolf"
                value={
                  rapportoView.codice_dipendente_webcolf
                    ? String(rapportoView.codice_dipendente_webcolf)
                    : "-"
                }
              />
              <DetailField label="ID rapporto INPS" value={rapportoView.id_rapporto ?? "-"} />
            </div>
          )}
        </div>
      </DetailSectionBlock>
    </div>
  )
}
