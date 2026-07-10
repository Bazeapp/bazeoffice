import * as React from "react"
import { Clock3Icon, PencilIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FieldInput } from "@/components/forms/field-components"
import { Form } from "@/components/ui/form"
import { useComboboxAnchor } from "@/components/ui/combobox"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { useProvincieOptions } from "@/hooks/use-provincie"
import { asString, readArrayStrings } from "@/modules/lavoratori/lib"

import type {
  FamilyAddressDraft,
  WorkerAddressDraft,
  WorkerPipelineSummaryTravelTimeCardProps,
} from "../types/worker-pipeline-summary"
import { getTravelTimeTone, toNumber } from "../lib/worker-pipeline-summary.utils"
import {
  FieldFamilyProvinciaSelect,
  FieldMobilityCombobox,
  FieldWorkerProvinciaSelect,
  SectionToneBadge,
} from "./worker-pipeline-summary-shared"

export function WorkerPipelineSummaryTravelTimeCard({
  workerRow,
  selectionRow,
  onPatchWorkerField,
  onPatchWorkerAddress,
  onPatchProcessField,
  workerVia,
  workerCivico,
  workerCap,
  workerCitta,
  workerProvincia,
  workerCitofono,
  familyAddress,
  familyCap,
  familyProvince,
  familyStreet,
  familyCivicNumber,
  familyCity,
  familyIntercom,
  familyAddressNote,
  provinceOptions = [],
  mobilityOptions = [],
  updatingProcessAddress = false,
}: WorkerPipelineSummaryTravelTimeCardProps) {
  const travelMinutes = toNumber(
    selectionRow?.travel_time_tra_cap as string | number | null | undefined,
  )
  const roundedTravelMinutes =
    travelMinutes != null ? Math.round(travelMinutes) : null
  const [isEditing, setIsEditing] = React.useState(false)
  const mobilityAnchor = useComboboxAnchor()

  const workerProvincieOptions = useProvincieOptions()

  const commitAddressField = React.useCallback(
    async (
      field: "via" | "civico" | "cap" | "citta" | "provincia" | "citofono",
      rawValue: string,
    ) => {
      const nextValue = rawValue.trim()
      if (!onPatchWorkerAddress) return
      const dbField = field === "provincia" ? "provincia_sigla" : field
      await onPatchWorkerAddress(dbField as typeof field, nextValue || null)
    },
    [onPatchWorkerAddress],
  )

  const commitFamilyAddressField = React.useCallback(
    async (
      field:
        | "indirizzo_prova_provincia"
        | "indirizzo_prova_cap"
        | "indirizzo_prova_via"
        | "indirizzo_prova_civico"
        | "indirizzo_prova_comune"
        | "indirizzo_prova_citofono"
        | "indirizzo_prova_note",
      rawValue: string,
    ) => {
      if (!onPatchProcessField) return
      const nextValue = rawValue.trim()
      const currentValue =
        field === "indirizzo_prova_provincia"
          ? asString(familyProvince)
          : field === "indirizzo_prova_cap"
            ? asString(familyCap)
            : field === "indirizzo_prova_via"
              ? asString(familyAddress)
              : field === "indirizzo_prova_civico"
                ? asString(familyCivicNumber)
                : field === "indirizzo_prova_comune"
                  ? asString(familyCity)
                  : field === "indirizzo_prova_citofono"
                    ? asString(familyIntercom)
                    : asString(familyAddressNote)
      if (nextValue === currentValue) return
      await onPatchProcessField(field, nextValue || null)
    },
    [
      familyAddress,
      familyAddressNote,
      familyCap,
      familyCivicNumber,
      familyCity,
      familyIntercom,
      familyProvince,
      onPatchProcessField,
    ],
  )

  const handleMobilitaChange = React.useCallback(
    async (values: string[]) => {
      const nextValues = values.map((item) => item.trim()).filter(Boolean)
      if (!onPatchWorkerField) return
      const currentValues = readArrayStrings(workerRow.come_ti_sposti)
      if (JSON.stringify(nextValues) === JSON.stringify(currentValues)) return
      await onPatchWorkerField(
        "come_ti_sposti",
        nextValues.length > 0 ? nextValues : null,
      )
    },
    [onPatchWorkerField, workerRow.come_ti_sposti],
  )

  // FASE 5 BIS — form indirizzo lavoratore + mobilita. I defaults sono i valori
  // server (le stesse init dei vecchi draft). onSave instrada ogni chiave
  // cambiata a commitAddressField (testi + provincia) o handleMobilitaChange
  // (come_ti_sposti). Il resync senza-clobber è gestito da keepDirtyValues.
  const workerForm = useAutoSaveForm<WorkerAddressDraft>({
    defaults: {
      via: asString(workerVia),
      civico: asString(workerCivico),
      cap: asString(workerCap),
      citta: asString(workerCitta),
      provincia: asString(workerProvincia),
      citofono: asString(workerCitofono),
      come_ti_sposti: readArrayStrings(workerRow.come_ti_sposti),
    },
    onSave: async (patch) => {
      for (const [key, value] of Object.entries(patch)) {
        if (key === "come_ti_sposti") {
          await handleMobilitaChange(
            Array.isArray(value) ? (value as string[]) : [],
          )
        } else {
          await commitAddressField(
            key as "via" | "civico" | "cap" | "citta" | "provincia" | "citofono",
            (value as string) ?? "",
          )
        }
      }
    },
  })

  // FASE 5 BIS — form indirizzo prova (process). onSave instrada ogni chiave a
  // commitFamilyAddressField (che preserva il guard no-op verso il valore server).
  const familyForm = useAutoSaveForm<FamilyAddressDraft>({
    defaults: {
      indirizzo_prova_provincia: asString(familyProvince),
      indirizzo_prova_cap: asString(familyCap),
      indirizzo_prova_via: asString(familyStreet),
      indirizzo_prova_civico: asString(familyCivicNumber),
      indirizzo_prova_comune: asString(familyCity),
      indirizzo_prova_citofono: asString(familyIntercom),
      indirizzo_prova_note: asString(familyAddressNote),
    },
    onSave: async (patch) => {
      for (const [key, value] of Object.entries(patch)) {
        await commitFamilyAddressField(
          key as keyof FamilyAddressDraft,
          (value as string) ?? "",
        )
      }
    },
  })

  const travelTone = getTravelTimeTone(travelMinutes)
  const mobility = readArrayStrings(workerRow.come_ti_sposti)
  const travelTimeLabel =
    roundedTravelMinutes != null
      ? `${roundedTravelMinutes} min`
      : "Non dichiarato"
  const familyAddressFields: Array<{
    label: string
    name: keyof FamilyAddressDraft
    type?: "province"
  }> = [
    {
      label: "Provincia",
      name: "indirizzo_prova_provincia",
      type: "province",
    },
    { label: "CAP", name: "indirizzo_prova_cap" },
    { label: "Via", name: "indirizzo_prova_via" },
    { label: "Civico", name: "indirizzo_prova_civico" },
    { label: "Comune", name: "indirizzo_prova_comune" },
    { label: "Citofono", name: "indirizzo_prova_citofono" },
    { label: "Nota", name: "indirizzo_prova_note" },
  ]

  return (
    <DetailSectionBlock
      title="Travel time"
      icon={<Clock3Icon className="text-muted-foreground size-4" />}
      collapsible
      action={
        <div className="flex items-center gap-2">
          <SectionToneBadge label={travelTone.label} tone={travelTone.tone} />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              isEditing
                ? "Termina modifica travel time"
                : "Modifica travel time"
            }
            title={
              isEditing
                ? "Termina modifica travel time"
                : "Modifica travel time"
            }
            onClick={() => setIsEditing((current) => !current)}
          >
            <PencilIcon />
          </Button>
        </div>
      }
      contentClassName="space-y-4"
    >
      <div className="space-y-1.5 text-sm">
        <p className="text-muted-foreground text-xs font-medium tracking-wide">
          Tempo di viaggio dichiarato
        </p>
        {roundedTravelMinutes != null ? (
          <p className="text-foreground font-medium">{travelTimeLabel}</p>
        ) : (
          <p className="text-muted-foreground">Non dichiarato</p>
        )}
      </div>

      <Form {...workerForm}>
        <div className="space-y-1.5 text-sm">
          <p className="text-muted-foreground text-xs font-medium tracking-wide">
            Indirizzo lavoratore
          </p>
          {isEditing ? (
            <div className="grid gap-2">
              {(
                [
                  { key: "provincia" as const, label: "Provincia" },
                  { key: "cap" as const, label: "CAP" },
                  { key: "via" as const, label: "Via" },
                  { key: "civico" as const, label: "Civico" },
                  { key: "citta" as const, label: "Comune" },
                  { key: "citofono" as const, label: "Citofono" },
                ] as Array<{
                  key: "provincia" | "cap" | "via" | "civico" | "citta" | "citofono"
                  label: string
                }>
              ).map((item) => (
                <label key={item.key} className="grid gap-1">
                  <span className="text-muted-foreground text-xs font-medium">
                    {item.label}
                  </span>
                  {item.key === "provincia" ? (
                    <FieldWorkerProvinciaSelect
                      name="provincia"
                      options={workerProvincieOptions}
                    />
                  ) : (
                    <FieldInput
                      name={item.key}
                      className="h-9 text-sm"
                      placeholder={item.label}
                    />
                  )}
                </label>
              ))}
            </div>
          ) : (
            <p>
              {[workerVia, workerCivico, workerCap, workerCitta, workerProvincia]
                .map((v) => (typeof v === "string" ? v.trim() : ""))
                .filter((v) => v && v !== "-")
                .join(" • ") || "-"}
            </p>
          )}
        </div>

        <div className="space-y-1.5 text-sm">
          <p className="text-muted-foreground text-xs font-medium tracking-wide">
            Mobilita
          </p>
          {isEditing ? (
            <FieldMobilityCombobox
              name="come_ti_sposti"
              options={mobilityOptions}
              anchor={mobilityAnchor}
            />
          ) : mobility.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {mobility.map((value) => (
                <Badge key={value} variant="outline">
                  {value}
                </Badge>
              ))}
            </div>
          ) : (
            <p>-</p>
          )}
        </div>
      </Form>

      <Form {...familyForm}>
        <div className="space-y-1.5 text-sm">
          <p className="text-muted-foreground text-xs font-medium tracking-wide">
            Indirizzo prova
          </p>
          {isEditing ? (
            <div className="grid gap-2">
              {familyAddressFields.map((item) => (
                <label key={item.name} className="grid gap-1">
                  <span className="text-muted-foreground text-xs font-medium">
                    {item.label}
                  </span>
                  {item.type === "province" ? (
                    <FieldFamilyProvinciaSelect
                      name={item.name}
                      options={provinceOptions}
                      placeholder={item.label}
                      disabled={updatingProcessAddress}
                    />
                  ) : (
                    <FieldInput
                      name={item.name}
                      className="h-9 text-sm"
                      placeholder={item.label}
                    />
                  )}
                </label>
              ))}
            </div>
          ) : (
            <p>
              {[
                familyProvince,
                familyCap,
                familyStreet || familyAddress,
                familyCivicNumber,
                familyCity,
                asString(familyIntercom) && asString(familyIntercom) !== "-"
                  ? `Citofono ${familyIntercom}`
                  : null,
                familyAddressNote,
              ]
                .map((value) => (typeof value === "string" ? value.trim() : ""))
                .filter((value) => value && value !== "-")
                .join(" • ") || "-"}
            </p>
          )}
        </div>
      </Form>
    </DetailSectionBlock>
  )
}
