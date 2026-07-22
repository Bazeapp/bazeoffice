import {
  CalendarIcon,
  Clock3Icon,
  MailIcon,
  MapPinIcon,
  PanelLeftCloseIcon,
  PhoneIcon,
} from "lucide-react"

import { CardMetaRow } from "@/components/shared-next/card-meta-row"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { OperatoreOption } from "@/hooks/use-operatori-options"
import type { LookupOption, LookupOptionsByField } from "@/modules/crm/types"
import { cn, toAvatarRingClass } from "@/lib/utils"
import type { RicercaDetailCardData, RicercaDetailSectionEdit } from "../lib/ricerca-detail-view.types"
import {
  RicercaDetailEditableDateField,
  RicercaDetailEditableTextField,
  RicercaDetailSectionEditBar,
} from "./ricerca-detail-view-shared"

export type RicercaDetailSidebarSummaryProps = {
  card: RicercaDetailCardData
  sectionEdit: RicercaDetailSectionEdit
  isNoMatchState: boolean
  statoRicercaOptions: LookupOption[]
  selectedStatoRicercaValue: string
  assignedRecruiter: OperatoreOption | null
  recruiterSelectOptions: OperatoreOption[]
  operatorOptionsLoading: boolean
  tipoIncontroOptions: LookupOption[]
  lookupOptionsByField: LookupOptionsByField
  resolveLookupValueKey: (field: string, rawValue: string) => string
  updateProcessCard?: (
    targetProcessId: string,
    patch: Record<string, unknown>,
  ) => void | Promise<void>
  currentProcessId: string
  oreGiorniLabel: string
  isDeadlineUrgent: boolean
  privateAreaUrl: string | null
  onCollapse: () => void
}

export function RicercaDetailViewSidebarSummary({
  card,
  sectionEdit,
  isNoMatchState,
  statoRicercaOptions,
  selectedStatoRicercaValue,
  assignedRecruiter,
  recruiterSelectOptions,
  operatorOptionsLoading,
  tipoIncontroOptions,
  lookupOptionsByField,
  resolveLookupValueKey,
  updateProcessCard,
  currentProcessId,
  oreGiorniLabel,
  isDeadlineUrgent,
  onCollapse,
}: RicercaDetailSidebarSummaryProps) {
  return (
    <div className="space-y-4">
      <Field>
        <div className="flex items-center justify-between gap-2">
          <FieldLabel variant="eyebrow">Famiglia</FieldLabel>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Comprimi dettagli famiglia"
            title="Comprimi dettagli famiglia"
            onClick={onCollapse}
          >
            <PanelLeftCloseIcon />
          </Button>
        </div>
        <div className="mt-3 flex min-w-0 items-start justify-between gap-3">
          <h2 className="min-w-0 flex-1 text-2xl font-semibold leading-tight tracking-tight">
            {card.nomeFamiglia ?? "—"}
          </h2>
          <RicercaDetailSectionEditBar {...sectionEdit} />
        </div>
      </Field>

      <Field>
        <FieldLabel variant="eyebrow">Stato</FieldLabel>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <Select
            value={selectedStatoRicercaValue}
            onValueChange={(next) => {
              if (!next || !card.id) return
              void updateProcessCard?.(card.id, {
                stato_res: next || null,
              })
            }}
            disabled={!card.id}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleziona stato" />
            </SelectTrigger>
            <SelectContent>
              {statoRicercaOptions.map((option) => (
                <SelectItem key={option.valueKey} value={option.valueKey}>
                  {option.valueLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={card.recruiterId || "none"}
            onValueChange={(next) => {
              if (!card.id) return
              void updateProcessCard?.(card.id, {
                recruiter_ricerca_e_selezione_id: next === "none" ? null : next,
              })
            }}
            disabled={!card.id}
          >
            <SelectTrigger
              className="flex h-10 w-10 min-w-10 items-center justify-center rounded-full border-border-subtle bg-surface-muted p-0 shadow-none [&>svg]:hidden"
              aria-label="Cambia recruiter assegnato"
              title={
                assignedRecruiter
                  ? `Recruiter: ${assignedRecruiter.label}`
                  : "Non assegnata"
              }
            >
              <Avatar
                size="md"
                fallback={
                  assignedRecruiter
                    ? assignedRecruiter.avatar
                    : card.recruiterId && operatorOptionsLoading
                      ? "..."
                      : "-"
                }
                className={
                  assignedRecruiter
                    ? toAvatarRingClass(assignedRecruiter.avatarBorderClassName)
                    : "ring-1 ring-zinc-300"
                }
              />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="none">Non assegnata</SelectItem>
              {recruiterSelectOptions.map((operator) => (
                <SelectItem key={operator.id} value={operator.id}>
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Avatar
                      size="sm"
                      fallback={operator.avatar}
                      className={toAvatarRingClass(operator.avatarBorderClassName)}
                    />
                    <span className="truncate">{operator.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Field>

      <Field>
        <FieldLabel variant="eyebrow">Tipologia di incontro</FieldLabel>
        <Select
          value={resolveLookupValueKey(
            "tipo_incontro_famiglia_lavoratore",
            card.tipoIncontroFamigliaLavoratore ?? "",
          )}
          onValueChange={(next) => {
            if (!card.id) return
            void updateProcessCard?.(card.id, {
              tipo_incontro_famiglia_lavoratore: next || null,
            })
          }}
          disabled={!card.id}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleziona tipologia" />
          </SelectTrigger>
          <SelectContent>
            {tipoIncontroOptions.map((option) => (
              <SelectItem key={option.valueKey} value={option.valueKey}>
                {option.valueLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {isNoMatchState ? (
        <Field>
          <FieldLabel variant="eyebrow">Motivo no match</FieldLabel>
          <Select
            value={resolveLookupValueKey("motivo_no_match", card.motivoNoMatch)}
            onValueChange={(next) => {
              void updateProcessCard?.(currentProcessId, {
                motivo_no_match: next || null,
              })
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleziona motivo no match" />
            </SelectTrigger>
            <SelectContent>
              {(lookupOptionsByField.motivo_no_match ?? []).map((option) => (
                <SelectItem key={option.valueKey} value={option.valueKey}>
                  {option.valueLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      {(card.tipoLavoroBadges && card.tipoLavoroBadges.length > 0) ||
      card.tipoLavoroBadge ||
      card.tipoRapportoBadge ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {(card.tipoLavoroBadges && card.tipoLavoroBadges.length > 0
            ? card.tipoLavoroBadges
            : card.tipoLavoroBadge
              ? [card.tipoLavoroBadge]
              : []
          ).map((tipoLavoro) => (
            <Badge
              key={tipoLavoro}
              className="border-emerald-200 bg-emerald-100 text-emerald-700"
            >
              {tipoLavoro}
            </Badge>
          ))}
          {card.tipoRapportoBadge ? (
            <Badge className="border-amber-200 bg-amber-100 text-amber-700">
              {card.tipoRapportoBadge}
            </Badge>
          ) : null}
        </div>
      ) : null}

      {sectionEdit.editing ? (
        <div className="space-y-3 rounded-md border border-border-subtle bg-surface-muted p-3">
          <div className="grid grid-cols-2 gap-3">
            <RicercaDetailEditableTextField
              label="Telefono"
              name="telefono"
              value={card.telefono}
              editing
            />
            <RicercaDetailEditableTextField
              label="Email"
              name="email"
              value={card.email}
              editing
            />
          </div>
          <RicercaDetailEditableDateField
            label="Deadline"
            name="deadline_mobile"
            value={card.deadlineMobileRaw || card.deadlineMobile}
            editing
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        {card.telefono && card.telefono !== "-" ? (
          <CardMetaRow icon={<PhoneIcon />}>{card.telefono}</CardMetaRow>
        ) : null}
        {card.email && card.email !== "-" ? (
          <CardMetaRow icon={<MailIcon />}>{card.email}</CardMetaRow>
        ) : null}
        {card.indirizzoNote && card.indirizzoNote !== "-" ? (
          <CardMetaRow icon={<MapPinIcon />}>{card.indirizzoNote}</CardMetaRow>
        ) : null}
        {oreGiorniLabel !== "-" ? (
          <CardMetaRow icon={<Clock3Icon />}>{oreGiorniLabel}</CardMetaRow>
        ) : null}
        {card.deadlineMobile && card.deadlineMobile !== "-" ? (
          <div
            className={cn(
              "flex min-w-0 items-center gap-2 text-[12.5px]",
              isDeadlineUrgent ? "text-red-600" : "text-foreground-muted",
            )}
          >
            <CalendarIcon
              className={cn(
                "size-3 shrink-0",
                isDeadlineUrgent ? "text-red-600" : "text-foreground-faint",
              )}
            />
            <span
              className={cn(
                "min-w-0 truncate",
                isDeadlineUrgent && "font-medium",
              )}
            >
              Deadline: {card.deadlineMobile}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
