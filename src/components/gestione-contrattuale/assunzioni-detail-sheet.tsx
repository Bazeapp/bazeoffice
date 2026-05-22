import * as React from "react"
import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  ExternalLinkIcon,
  FileTextIcon,
  MailIcon,
  OctagonAlertIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"

import type { AssunzioneRecord, AssunzioniBoardCardData } from "@/hooks/use-assunzioni-board"
import { AssociationSearchField } from "@/components/shared-next/association-search-field"
import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  createRecord,
  fetchAssunzioni,
  fetchDocumentiLavoratoriByWorker,
  fetchLookupValues,
  updateRecord,
} from "@/lib/anagrafiche-api"
import { useDebouncedSave } from "@/hooks/use-debounced-save"
import { buildAttachmentPayload, normalizeAttachmentArray } from "@/lib/attachments"
import {
  findLookupOption,
  getLookupSelectValue,
} from "@/features/lavoratori/lib/lookup-utils"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
import type { DocumentoLavoratoreRecord } from "@/types/entities/documento-lavoratore"

function formatDate(value: string | null | undefined) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

type DetailTarget = "datore" | "lavoratore"
type LookupOption = { value: string; label: string }

const TIPO_CONTRATTO_OPTIONS = ["A", "B", "BS", "C", "CS", "D", "DS"] as const
const REGIME_NON_CONVIVENTE = "Il lavoratore NON è convivente"
const REGIME_CONVIVENTE = "Il lavoratore è convivente"
const TIPO_UTENTE_OPTIONS = ["DATORE LAVORO", "LAVORATORE"] as const
const ASSUNZIONE_DATORE_FORM_TYPE = "DATORE LAVORO"
const ASSUNZIONE_LAVORATORE_FORM_TYPE = "LAVORATORE"
const SCONTO_APPLICATO_OPTIONS: LookupOption[] = [
  { value: "50%", label: "50%" },
  { value: "prova_gratuita", label: "prova_gratuita" },
  { value: "100€", label: "100€" },
]

const ASSUNZIONE_DETAIL_SELECT = [
  "id",
  "creato_il",
  "delega_inps_allegati",
  "civico_se_diverso_residenza",
  "codice_fiscale_allegati",
  "comune_se_diverso_residenza",
  "dati_bancari_lavoratore",
  "documento_identita_allegati",
  "documento_identita_numero",
  "documento_identita_scadenza",
  "documento_identita_tipo",
  "famiglia_id",
  "cittadino_extracomunitario",
  "info_anagrafiche_cap",
  "info_anagrafiche_cittadidanza",
  "info_anagrafiche_civico",
  "info_anagrafiche_codice_fiscale",
  "info_anagrafiche_cognome",
  "info_anagrafiche_data_di_nascita",
  "info_anagrafiche_email",
  "info_anagrafiche_indirizzo",
  "info_anagrafiche_localita",
  "info_anagrafiche_luogo_di_nascita",
  "info_anagrafiche_nome",
  "info_anagrafiche_numero_fisso",
  "info_anagrafiche_numero_mobile",
  "luogo_lavoro_se_diverso_da_residenza",
  "mezza_giornata_di_riposo",
  "ore_di_lavoro",
  "ore_giovedi",
  "ore_lunedi",
  "ore_martedi",
  "ore_mercoledi",
  "ore_sabato",
  "ore_venerdi",
  "provincia",
  "permesso_di_soggiorno_allegati",
  "rapporto_di_lavoro_residenza",
  "rapporto_lavorativo_datore_lavoro_id",
  "rapporto_lavorativo_lavoratore_id",
  "lavoratore_id",
  "regime_convivenza",
  "ricevuta_rinnovo_permesso_allegati",
  "telecamere_posto_lavoro",
  "tredicesima_rateizzata_mensile",
  "note_aggiuntive",
  "data_assunzione",
  "type_of_compilazione_form",
] satisfies string[]

function SingleSelectField({
  value,
  placeholder,
  options,
  onValueChange,
}: {
  value: string
  placeholder: string
  options: readonly string[]
  onValueChange: (value: string) => void
}) {
  const optionValues = value && !options.includes(value) ? [value, ...options] : options

  return (
    <Select value={value || undefined} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {optionValues.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function toNullableNumber(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toInputValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return ""
  return String(value)
}

function normalizeRegimeConvivenza(value: string | null | undefined) {
  if (!value) return REGIME_NON_CONVIVENTE
  if (value === "Il lavoratore NON e convivente") return REGIME_NON_CONVIVENTE
  if (value === "Il lavoratore e convivente") return REGIME_CONVIVENTE
  return value
}

function sanitizeFileName(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "documento"
}

type AssunzioneAttachmentSlot =
  | "documento_identita_allegati"
  | "codice_fiscale_allegati"
  | "delega_inps_allegati"
  | "permesso_di_soggiorno_allegati"
  | "ricevuta_rinnovo_permesso_allegati"

type AssunzioneAttachmentTarget = "datore" | "lavoratore"

type AssunzioneCandidatesByTarget = Record<DetailTarget, AssunzioneRecord[]>

function compactText(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text || null
}

function resolveAssunzioneDisplayName(record: AssunzioneRecord) {
  return (
    [compactText(record.info_anagrafiche_nome), compactText(record.info_anagrafiche_cognome)]
      .filter(Boolean)
      .join(" ")
      .trim() || null
  )
}

function resolveAssunzioneFormLabel(
  record: AssunzioneRecord,
  target: DetailTarget,
  card: AssunzioniBoardCardData | null
) {
  return (
    resolveAssunzioneDisplayName(record) ??
    (target === "datore" ? card?.nomeFamiglia : card?.nomeLavoratore) ??
    "Senza nome"
  )
}

function resolveAssunzioneFormSubLabel(
  record: AssunzioneRecord,
  target: DetailTarget,
  card: AssunzioniBoardCardData | null
) {
  return (
    compactText(record.info_anagrafiche_email) ??
    (target === "datore" ? compactText(card?.email) : compactText(card?.lavoratore?.email)) ??
    (target === "datore" ? compactText(card?.telefono) : compactText(card?.lavoratore?.telefono)) ??
    "-"
  )
}

function formatSelectedAssunzioneLabel(
  record: AssunzioneRecord,
  target: DetailTarget,
  card: AssunzioniBoardCardData | null
) {
  return `${resolveAssunzioneFormLabel(record, target, card)} • ${resolveAssunzioneFormSubLabel(
    record,
    target,
    card
  )}`
}

function matchesAssunzioneSearch(record: AssunzioneRecord, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  const values = [
    record.id,
    record.info_anagrafiche_nome,
    record.info_anagrafiche_cognome,
    [record.info_anagrafiche_nome, record.info_anagrafiche_cognome].filter(Boolean).join(" "),
    [record.info_anagrafiche_cognome, record.info_anagrafiche_nome].filter(Boolean).join(" "),
    record.info_anagrafiche_email,
    record.info_anagrafiche_numero_mobile,
    record.info_anagrafiche_codice_fiscale,
  ]
    .map((value) => compactText(value)?.toLowerCase())
    .filter((value): value is string => Boolean(value))

  const haystack = values.join(" ")
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  return tokens.every((token) => haystack.includes(token))
}

function mergeAssunzioneOptions(
  currentRecord: AssunzioneRecord | null | undefined,
  records: AssunzioneRecord[]
) {
  const merged = new Map<string, AssunzioneRecord>()
  for (const record of records) {
    if (record.id) merged.set(record.id, record)
  }
  if (currentRecord?.id && !merged.has(currentRecord.id)) {
    merged.set(currentRecord.id, currentRecord)
  }
  return Array.from(merged.values())
}

function buildLookupOptions(
  rows: Array<{
    entity_table: string | null
    entity_field: string | null
    value_key: string | null
    value_label: string | null
    is_active: boolean | null
  }>,
  entityTable: string,
  entityField: string,
  fallbackValue?: string | null
) {
  const options = rows
    .filter(
      (row) =>
        row.is_active &&
        row.entity_table === entityTable &&
        row.entity_field === entityField &&
        row.value_key &&
        row.value_label
    )
    .map((row) => ({
      value: row.value_key as string,
      label: row.value_label as string,
    }))

  const fallback = fallbackValue?.trim()
  if (fallback && !findLookupOption(options, fallback)) {
    return [{ value: fallback, label: fallback }, ...options]
  }
  return options
}

function getLookupSelectDisplayValue(
  value: string | null | undefined,
  options: LookupOption[]
) {
  return getLookupSelectValue(value, options, "") || undefined
}

function getLookupLabelForSave(value: string, options: LookupOption[]) {
  return findLookupOption(options, value)?.label ?? value
}

function hasAssunzioneCoreDetails(assunzione: AssunzioneRecord | null | undefined) {
  return Boolean(
    assunzione?.info_anagrafiche_codice_fiscale ||
      assunzione?.info_anagrafiche_data_di_nascita ||
      assunzione?.info_anagrafiche_luogo_di_nascita ||
      assunzione?.info_anagrafiche_indirizzo ||
      assunzione?.info_anagrafiche_cap ||
      assunzione?.documento_identita_numero ||
      assunzione?.dati_bancari_lavoratore
  )
}

function collectAttachmentValues(...values: unknown[]) {
  const attachments = values.flatMap((value) => {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  })

  return attachments.length > 0 ? attachments : null
}

function collectDocumentAttachments(
  documents: DocumentoLavoratoreRecord[],
  fields: Array<keyof DocumentoLavoratoreRecord>
) {
  const attachments: unknown[] = []

  for (const document of documents) {
    for (const field of fields) {
      const value = document[field]
      if (!value) continue
      if (Array.isArray(value)) {
        attachments.push(...value)
      } else {
        attachments.push(value)
      }
    }
  }

  return attachments.length > 0 ? attachments : null
}

function EditableField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="ui-type-label">{label}</p>
      {children}
    </div>
  )
}

function RelatedSubjectCard({
  role,
  name,
  email,
  phone,
  value,
  selected,
  isComplete,
}: {
  role: string
  name: string
  email: string | null | undefined
  phone: string | null | undefined
  value: DetailTarget
  selected: boolean
  isComplete: boolean
}) {
  return (
    <FieldLabel
      htmlFor={`assunzione-target-${value}`}
      className="h-full border-0 p-0 has-[>[data-slot=field]]:border-0"
    >
      <Field
        orientation="horizontal"
        className={cn(
          "h-full items-start rounded-xl border bg-background p-5 transition-colors",
          isComplete ? "border-emerald-400" : "border-red-400",
          selected && (isComplete ? "border-emerald-500" : "border-red-500")
        )}
      >
        <div className="flex size-12 shrink-0 items-center justify-center">
          {isComplete ? (
            <CheckCircle2Icon className="size-7 text-emerald-600" />
          ) : (
            <OctagonAlertIcon className="size-7 text-red-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            {role}
          </p>
          <FieldDescription className="mt-1 text-sm font-semibold text-foreground">
            {name}
          </FieldDescription>
          <div className="mt-4 space-y-2">
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <MailIcon className="size-4 shrink-0" />
              <span className="truncate">{email ?? "-"}</span>
            </p>
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <PhoneIcon className="size-4 shrink-0" />
              <span>{phone ?? "-"}</span>
            </p>
          </div>
        </div>
        <RadioGroupItem
          value={value}
          id={`assunzione-target-${value}`}
          aria-label={`Seleziona ${role.toLowerCase()}`}
        />
      </Field>
    </FieldLabel>
  )
}

function RapportoDetailSections({
  card,
  onRapportoPatch,
  onAssunzionePatch,
}: {
  card: AssunzioniBoardCardData
  onRapportoPatch: (patch: Record<string, unknown>) => Promise<void>
  onAssunzionePatch: (patch: Record<string, unknown>) => Promise<void>
}) {
  const rapporto = card.rapporto
  const assunzione = card.assunzione
  const [draft, setDraft] = React.useState(() => ({
    regimeConvivenza: normalizeRegimeConvivenza(assunzione?.regime_convivenza),
    rapportoCorrispondeResidenza: assunzione?.rapporto_di_lavoro_residenza === false ? "No" : "Si",
    tredicesimaRateizzata: assunzione?.tredicesima_rateizzata_mensile ?? "",
    telecamerePostoLavoro: assunzione?.telecamere_posto_lavoro ?? "No",
  }))

  React.useEffect(() => {
    setDraft({
      regimeConvivenza: normalizeRegimeConvivenza(assunzione?.regime_convivenza),
      rapportoCorrispondeResidenza: assunzione?.rapporto_di_lavoro_residenza === false ? "No" : "Si",
      tredicesimaRateizzata: assunzione?.tredicesima_rateizzata_mensile ?? "",
      telecamerePostoLavoro: assunzione?.telecamere_posto_lavoro ?? "No",
    })
  }, [assunzione?.id, card.id, rapporto?.id])

  const setValue = (key: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const { value: totaleOreLavorative, onChange: onTotaleOreLavorativeChange } = useDebouncedSave(
    toInputValue(assunzione?.ore_di_lavoro) || (rapporto?.ore_a_settimana ? String(rapporto.ore_a_settimana) : ""),
    async (value) => {
      await Promise.all([
        onRapportoPatch({ ore_a_settimana: toNullableNumber(value) }),
        onAssunzionePatch({ ore_di_lavoro: toNullableNumber(value) }),
      ])
    }
  )

  const { value: distribuzioneOreSettimanali, onChange: onDistribuzioneChange } = useDebouncedSave(
    rapporto?.distribuzione_ore_settimana ?? "",
    async (value) => { await onRapportoPatch({ distribuzione_ore_settimana: value || null }) }
  )

  const { value: oreLunedi, onChange: onOreLunediChange } = useDebouncedSave(
    toInputValue(assunzione?.ore_lunedi),
    async (value) => { await onAssunzionePatch({ ore_lunedi: toNullableNumber(value) }) }
  )

  const { value: oreMartedi, onChange: onOreMartediChange } = useDebouncedSave(
    toInputValue(assunzione?.ore_martedi),
    async (value) => { await onAssunzionePatch({ ore_martedi: toNullableNumber(value) }) }
  )

  const { value: oreMercoledi, onChange: onOreMercolediChange } = useDebouncedSave(
    toInputValue(assunzione?.ore_mercoledi),
    async (value) => { await onAssunzionePatch({ ore_mercoledi: toNullableNumber(value) }) }
  )

  const { value: oreGiovedi, onChange: onOreGiovediChange } = useDebouncedSave(
    toInputValue(assunzione?.ore_giovedi),
    async (value) => { await onAssunzionePatch({ ore_giovedi: toNullableNumber(value) }) }
  )

  const { value: oreVenerdi, onChange: onOreVenerdiChange } = useDebouncedSave(
    toInputValue(assunzione?.ore_venerdi),
    async (value) => { await onAssunzionePatch({ ore_venerdi: toNullableNumber(value) }) }
  )

  const { value: oreSabato, onChange: onOreSabatoChange } = useDebouncedSave(
    toInputValue(assunzione?.ore_sabato),
    async (value) => { await onAssunzionePatch({ ore_sabato: toNullableNumber(value) }) }
  )

  const { value: mezzaGiornataRiposo, onChange: onMezzaGiornataRiposoChange } = useDebouncedSave(
    assunzione?.mezza_giornata_di_riposo ?? "",
    async (value) => { await onAssunzionePatch({ mezza_giornata_di_riposo: value || null }) }
  )

  const { value: pagaOraria, onChange: onPagaOrariaChange } = useDebouncedSave(
    rapporto?.paga_oraria_lorda ? String(rapporto.paga_oraria_lorda) : "",
    async (value) => { await onRapportoPatch({ paga_oraria_lorda: toNullableNumber(value) }) }
  )

  const { value: pagaMensile, onChange: onPagaMensileChange } = useDebouncedSave(
    rapporto?.paga_mensile_lorda ? String(rapporto.paga_mensile_lorda) : "",
    async (value) => { await onRapportoPatch({ paga_mensile_lorda: toNullableNumber(value) }) }
  )

  const { value: dataAssunzioneRapporto, onChange: onDataAssunzioneRapportoChange } = useDebouncedSave(
    assunzione?.data_assunzione ?? rapporto?.data_inizio_rapporto ?? "",
    async (value) => {
      await Promise.all([
        onRapportoPatch({ data_inizio_rapporto: value || null }),
        onAssunzionePatch({ data_assunzione: value || null }),
      ])
    }
  )

  const { value: appuntiExtra, onChange: onAppuntiExtraChange } = useDebouncedSave(
    assunzione?.note_aggiuntive ?? "",
    async (value) => { await onAssunzionePatch({ note_aggiuntive: value || null }) }
  )

  return (
    <>
      <DetailSectionBlock
        title="Convivenza e orario"
        icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Regime di convivenza">
          <Select
            value={draft.regimeConvivenza}
            onValueChange={(value) => {
              setValue("regimeConvivenza", value)
              void onAssunzionePatch({ regime_convivenza: value || null })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={REGIME_NON_CONVIVENTE}>{REGIME_NON_CONVIVENTE}</SelectItem>
              <SelectItem value={REGIME_CONVIVENTE}>{REGIME_CONVIVENTE}</SelectItem>
            </SelectContent>
          </Select>
        </EditableField>
        <EditableField label="Ore di lavoro a settimana">
          <Input
            type="number"
            value={totaleOreLavorative}
            onChange={(event) => onTotaleOreLavorativeChange(event.target.value)}
          />
        </EditableField>
        <EditableField label="Distribuzione ore settimanali">
          <div className="space-y-2">
            <p className="ui-type-meta">Parte da domenica</p>
            <Input
              value={distribuzioneOreSettimanali}
              placeholder="0-0-0-0-0-0-0"
              onChange={(event) => onDistribuzioneChange(event.target.value)}
            />
          </div>
        </EditableField>
        <div className="grid gap-4 md:grid-cols-3">
          <EditableField label="Ore lunedi">
            <Input
              type="number"
              step="0.25"
              value={oreLunedi}
              onChange={(event) => onOreLunediChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Ore martedi">
            <Input
              type="number"
              step="0.25"
              value={oreMartedi}
              onChange={(event) => onOreMartediChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Ore mercoledi">
            <Input
              type="number"
              step="0.25"
              value={oreMercoledi}
              onChange={(event) => onOreMercolediChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Ore giovedi">
            <Input
              type="number"
              step="0.25"
              value={oreGiovedi}
              onChange={(event) => onOreGiovediChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Ore venerdi">
            <Input
              type="number"
              step="0.25"
              value={oreVenerdi}
              onChange={(event) => onOreVenerdiChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Ore sabato">
            <Input
              type="number"
              step="0.25"
              value={oreSabato}
              onChange={(event) => onOreSabatoChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Giorno/mezza giornata di riposo">
            <Input
              value={mezzaGiornataRiposo}
              onChange={(event) => onMezzaGiornataRiposoChange(event.target.value)}
            />
          </EditableField>
        </div>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Altri dettagli rapporto di lavoro"
        icon={<CalendarDaysIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Il rapporto di lavoro corrisponde alla residenza?">
          <Select
            value={draft.rapportoCorrispondeResidenza}
            onValueChange={(value) => {
              setValue("rapportoCorrispondeResidenza", value)
              void onAssunzionePatch({ rapporto_di_lavoro_residenza: value === "Si" })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Si">Si</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </EditableField>
        <EditableField label="Tredicesima rateizzata?">
          <Select
            value={draft.tredicesimaRateizzata}
            onValueChange={(value) => {
              setValue("tredicesimaRateizzata", value)
              void onAssunzionePatch({ tredicesima_rateizzata_mensile: value || null })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Si">Si</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </EditableField>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField label="Paga oraria">
            <Input
              type="number"
              step="0.01"
              value={pagaOraria}
              onChange={(event) => onPagaOrariaChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Paga mensile">
            <Input
              type="number"
              step="0.01"
              value={pagaMensile}
              onChange={(event) => onPagaMensileChange(event.target.value)}
            />
          </EditableField>
        </div>
        <EditableField label="Ci sono telecamere sul posto di lavoro?">
          <Select
            value={draft.telecamerePostoLavoro}
            onValueChange={(value) => {
              setValue("telecamerePostoLavoro", value)
              void onAssunzionePatch({ telecamere_posto_lavoro: value || null })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Si">Si</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </EditableField>
        <EditableField label="Data di assunzione">
          <Input
            type="date"
            value={dataAssunzioneRapporto}
            onChange={(event) => onDataAssunzioneRapportoChange(event.target.value)}
          />
        </EditableField>
        <EditableField label="Appunti extra">
          <Textarea
            value={appuntiExtra}
            onChange={(event) => onAppuntiExtraChange(event.target.value)}
            className="min-h-24"
            placeholder="Aggiungi note sul rapporto o sulla pratica"
          />
        </EditableField>
      </DetailSectionBlock>
    </>
  )
}

function DatoreDetail({
  card,
  onFamigliaPatch,
  onAssunzionePatch,
  onAttachmentAdd,
  onAttachmentRemove,
  onAttachmentPreview,
  uploadingAttachment,
}: {
  card: AssunzioniBoardCardData
  onFamigliaPatch: (patch: Record<string, unknown>) => Promise<void>
  onAssunzionePatch: (patch: Record<string, unknown>) => Promise<void>
  onAttachmentAdd: (target: AssunzioneAttachmentTarget, slot: AssunzioneAttachmentSlot, file: File) => void
  onAttachmentRemove: (target: AssunzioneAttachmentTarget, slot: AssunzioneAttachmentSlot, link: AttachmentLink) => void
  onAttachmentPreview: (link: AttachmentLink) => void
  uploadingAttachment: string | null
}) {
  const rapporto = card.rapporto
  const famiglia = card.famiglia
  const assunzione = card.assunzione
  const [draft, setDraft] = React.useState(() => ({
    tipoUtente: assunzione?.type_of_compilazione_form ?? "DATORE LAVORO",
    rapportoCorrispondeResidenza: assunzione?.rapporto_di_lavoro_residenza === false ? "No" : "Si",
    tipoDocumento: assunzione?.documento_identita_tipo ?? "Carta d'identita",
    cittadinoExtracomunitario: assunzione?.cittadino_extracomunitario ?? "No",
  }))

  React.useEffect(() => {
    setDraft({
      tipoUtente: assunzione?.type_of_compilazione_form ?? "DATORE LAVORO",
      rapportoCorrispondeResidenza: assunzione?.rapporto_di_lavoro_residenza === false ? "No" : "Si",
      tipoDocumento: assunzione?.documento_identita_tipo ?? "Carta d'identita",
      cittadinoExtracomunitario: assunzione?.cittadino_extracomunitario ?? "No",
    })
  }, [assunzione?.id, card.id, famiglia?.id, rapporto?.id])

  const setValue = (key: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const { value: nomeD, onChange: onNomeDChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_nome ?? famiglia?.nome ?? card.nomeFamiglia.split(" ")[0] ?? "",
    async (value) => { await onFamigliaPatch({ nome: value || null }) }
  )

  const { value: cognomeD, onChange: onCognomeDChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_cognome ?? famiglia?.cognome ?? card.nomeFamiglia.split(" ").slice(1).join(" ") ?? "",
    async (value) => { await onFamigliaPatch({ cognome: value || null }) }
  )

  const { value: emailD, onChange: onEmailDChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_email ?? famiglia?.email ?? "",
    async (value) => { await onFamigliaPatch({ email: value || null }) }
  )

  const { value: cellulareD, onChange: onCellulareDChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_numero_mobile ?? famiglia?.telefono ?? "",
    async (value) => { await onFamigliaPatch({ telefono: value || null }) }
  )

  const { value: codiceFiscaleD, onChange: onCodiceFiscaleDChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_codice_fiscale ?? "",
    async (value) => { await onAssunzionePatch({ info_anagrafiche_codice_fiscale: value || null }) }
  )

  const { value: cittadinanzaD, onChange: onCittadinanzaDChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_cittadidanza ?? "Italiana",
    async (value) => { await onAssunzionePatch({ info_anagrafiche_cittadidanza: value || null }) }
  )

  const { value: telefonoFissoD, onChange: onTelefonoFissoDChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_numero_fisso ?? "",
    async (value) => { await onAssunzionePatch({ info_anagrafiche_numero_fisso: value || null }) }
  )

  const { value: dataNascitaD, onChange: onDataNascitaDChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_data_di_nascita ?? "",
    async (value) => { await onAssunzionePatch({ info_anagrafiche_data_di_nascita: value || null }) }
  )

  const { value: luogoNascitaD, onChange: onLuogoNascitaDChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_luogo_di_nascita ?? "",
    async (value) => { await onAssunzionePatch({ info_anagrafiche_luogo_di_nascita: value || null }) }
  )

  const { value: indirizzoResidenzaD, onChange: onIndirizzoResidenzaDChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_indirizzo ?? "",
    async (value) => { await onAssunzionePatch({ info_anagrafiche_indirizzo: value || null }) }
  )

  const { value: civicoD, onChange: onCivicoDChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_civico ?? "",
    async (value) => { await onAssunzionePatch({ info_anagrafiche_civico: value || null }) }
  )

  const { value: localitaD, onChange: onLocalitaDChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_localita ?? "",
    async (value) => { await onAssunzionePatch({ info_anagrafiche_localita: value || null }) }
  )

  const { value: capD, onChange: onCapDChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_cap ?? "",
    async (value) => { await onAssunzionePatch({ info_anagrafiche_cap: value || null }) }
  )

  const { value: luogoLavoroIndirizzoD, onChange: onLuogoLavoroIndirizzoDChange } = useDebouncedSave(
    assunzione?.luogo_lavoro_se_diverso_da_residenza ?? "",
    async (value) => { await onAssunzionePatch({ luogo_lavoro_se_diverso_da_residenza: value || null }) }
  )

  const { value: luogoLavoroCivicoD, onChange: onLuogoLavoroCivicoDChange } = useDebouncedSave(
    assunzione?.civico_se_diverso_residenza ?? "",
    async (value) => { await onAssunzionePatch({ civico_se_diverso_residenza: value || null }) }
  )

  const { value: luogoLavoroComuneD, onChange: onLuogoLavoroComuneDChange } = useDebouncedSave(
    assunzione?.comune_se_diverso_residenza ?? "",
    async (value) => { await onAssunzionePatch({ comune_se_diverso_residenza: value || null }) }
  )

  const { value: luogoLavoroProvinciaD, onChange: onLuogoLavoroProvinciaDChange } = useDebouncedSave(
    assunzione?.provincia ?? "",
    async (value) => { await onAssunzionePatch({ provincia: value || null }) }
  )

  const { value: numeroDocumentoD, onChange: onNumeroDocumentoDChange } = useDebouncedSave(
    assunzione?.documento_identita_numero ?? "",
    async (value) => { await onAssunzionePatch({ documento_identita_numero: value || null }) }
  )

  const { value: scadenzaDocumentoD, onChange: onScadenzaDocumentoDChange } = useDebouncedSave(
    assunzione?.documento_identita_scadenza ?? "",
    async (value) => { await onAssunzionePatch({ documento_identita_scadenza: value || null }) }
  )

  const documentoIdentitaAllegati = collectAttachmentValues(
    assunzione?.documento_identita_allegati
  )
  const codiceFiscaleAllegati = collectAttachmentValues(
    assunzione?.codice_fiscale_allegati
  )
  const permessoSoggiornoAllegati = collectAttachmentValues(
    assunzione?.permesso_di_soggiorno_allegati,
    assunzione?.ricevuta_rinnovo_permesso_allegati
  )

  return (
    <div className="space-y-5">
      <DetailSectionBlock
        title="Riepilogo datore"
        icon={<UsersIcon className="text-muted-foreground size-4" />}
        contentClassName="grid gap-4 md:grid-cols-2"
      >
        <EditableField label="Nome">
          <Input
            value={nomeD}
            onChange={(event) => onNomeDChange(event.target.value)}
          />
        </EditableField>
        <EditableField label="Cognome">
          <Input
            value={cognomeD}
            onChange={(event) => onCognomeDChange(event.target.value)}
          />
        </EditableField>
        <EditableField label="Email">
          <Input
            value={emailD}
            onChange={(event) => onEmailDChange(event.target.value)}
          />
        </EditableField>
        <EditableField label="Cellulare">
          <Input
            value={cellulareD}
            onChange={(event) => onCellulareDChange(event.target.value)}
          />
        </EditableField>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Informazioni generali"
        icon={<UserIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
          <EditableField label="Tipo utente">
          <SingleSelectField
            value={draft.tipoUtente}
            placeholder="Seleziona tipo utente"
            options={TIPO_UTENTE_OPTIONS}
            onValueChange={(value) => {
              setValue("tipoUtente", value)
              void onAssunzionePatch({ type_of_compilazione_form: value || null })
            }}
          />
        </EditableField>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField label="Nome">
            <Input
              value={nomeD}
              onChange={(event) => onNomeDChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Cognome">
            <Input
              value={cognomeD}
              onChange={(event) => onCognomeDChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Codice fiscale">
            <Input
              value={codiceFiscaleD}
              onChange={(event) => onCodiceFiscaleDChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Cittadinanza">
            <Input
              value={cittadinanzaD}
              onChange={(event) => onCittadinanzaDChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Email">
            <Input
              value={emailD}
              onChange={(event) => onEmailDChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Cellulare">
            <Input
              value={cellulareD}
              onChange={(event) => onCellulareDChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Telefono fisso">
            <Input
              value={telefonoFissoD}
              onChange={(event) => onTelefonoFissoDChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Data di nascita">
            <Input
              type="date"
              value={dataNascitaD}
              onChange={(event) => onDataNascitaDChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Luogo di nascita">
            <Input
              value={luogoNascitaD}
              onChange={(event) => onLuogoNascitaDChange(event.target.value)}
            />
          </EditableField>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField label="Indirizzo di residenza">
            <Input
              value={indirizzoResidenzaD}
              onChange={(event) => onIndirizzoResidenzaDChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Civico">
            <Input
              value={civicoD}
              onChange={(event) => onCivicoDChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Localita">
            <Input
              value={localitaD}
              onChange={(event) => onLocalitaDChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="CAP">
            <Input
              value={capD}
              onChange={(event) => onCapDChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Il luogo di residenza corrisponde al luogo di lavoro?">
            <Select
              value={draft.rapportoCorrispondeResidenza}
              onValueChange={(value) => {
                setValue("rapportoCorrispondeResidenza", value)
                void onAssunzionePatch({ rapporto_di_lavoro_residenza: value === "Si" })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Si">Si</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </EditableField>
          {draft.rapportoCorrispondeResidenza === "No" ? (
            <>
              <EditableField label="Indirizzo luogo lavoro">
                <Input
                  value={luogoLavoroIndirizzoD}
                  onChange={(event) => onLuogoLavoroIndirizzoDChange(event.target.value)}
                />
              </EditableField>
              <EditableField label="Civico luogo lavoro">
                <Input
                  value={luogoLavoroCivicoD}
                  onChange={(event) => onLuogoLavoroCivicoDChange(event.target.value)}
                />
              </EditableField>
              <EditableField label="Comune luogo lavoro">
                <Input
                  value={luogoLavoroComuneD}
                  onChange={(event) => onLuogoLavoroComuneDChange(event.target.value)}
                />
              </EditableField>
              <EditableField label="Provincia luogo lavoro">
                <Input
                  value={luogoLavoroProvinciaD}
                  onChange={(event) => onLuogoLavoroProvinciaDChange(event.target.value)}
                />
              </EditableField>
            </>
          ) : null}
          <EditableField label="Tipo documento">
            <Select
              value={draft.tipoDocumento}
              onValueChange={(value) => {
                setValue("tipoDocumento", value)
                void onAssunzionePatch({ documento_identita_tipo: value || null })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo documento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Carta d'identita">Carta d'identita</SelectItem>
                <SelectItem value="Passaporto">Passaporto</SelectItem>
                <SelectItem value="Patente">Patente</SelectItem>
              </SelectContent>
            </Select>
          </EditableField>
          <EditableField label="Numero documento">
            <Input
              value={numeroDocumentoD}
              onChange={(event) => onNumeroDocumentoDChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Scadenza documento">
            <Input
              type="date"
              value={scadenzaDocumentoD}
              onChange={(event) => onScadenzaDocumentoDChange(event.target.value)}
            />
          </EditableField>
        </div>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Cittadini extracomunitari"
        icon={<ShieldCheckIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="E extracomunitario?">
          <Select
            value={draft.cittadinoExtracomunitario}
            onValueChange={(value) => {
              setValue("cittadinoExtracomunitario", value)
              void onAssunzionePatch({ cittadino_extracomunitario: value || null })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Si">Si</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </EditableField>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Documenti datore"
        icon={<ShieldCheckIcon className="text-muted-foreground size-4" />}
        contentClassName="grid gap-3 md:grid-cols-3"
      >
        <AttachmentUploadSlot
          label="Documento identita"
          value={documentoIdentitaAllegati}
          onAdd={(file) => onAttachmentAdd("datore", "documento_identita_allegati", file)}
          onRemove={(link) => onAttachmentRemove("datore", "documento_identita_allegati", link)}
          onPreviewOpen={onAttachmentPreview}
          isUploading={uploadingAttachment === "datore:documento_identita_allegati"}
          multiple={false}
        />
        <AttachmentUploadSlot
          label="Codice fiscale"
          value={codiceFiscaleAllegati}
          onAdd={(file) => onAttachmentAdd("datore", "codice_fiscale_allegati", file)}
          onRemove={(link) => onAttachmentRemove("datore", "codice_fiscale_allegati", link)}
          onPreviewOpen={onAttachmentPreview}
          isUploading={uploadingAttachment === "datore:codice_fiscale_allegati"}
          multiple={false}
        />
        <AttachmentUploadSlot
          label="Permesso di soggiorno"
          value={permessoSoggiornoAllegati}
          onAdd={(file) => onAttachmentAdd("datore", "permesso_di_soggiorno_allegati", file)}
          onRemove={(link) => onAttachmentRemove("datore", "permesso_di_soggiorno_allegati", link)}
          onPreviewOpen={onAttachmentPreview}
          isUploading={uploadingAttachment === "datore:permesso_di_soggiorno_allegati"}
          multiple={false}
        />
      </DetailSectionBlock>
    </div>
  )
}

function LavoratoreDetail({
  card,
  documents,
  onLavoratorePatch,
  onLavoratoreAssunzionePatch,
  onAttachmentAdd,
  onAttachmentRemove,
  onAttachmentPreview,
  uploadingAttachment,
}: {
  card: AssunzioniBoardCardData
  documents: DocumentoLavoratoreRecord[]
  onLavoratorePatch: (patch: Record<string, unknown>) => Promise<void>
  onLavoratoreAssunzionePatch: (patch: Record<string, unknown>) => Promise<void>
  onAttachmentAdd: (target: AssunzioneAttachmentTarget, slot: AssunzioneAttachmentSlot, file: File) => void
  onAttachmentRemove: (target: AssunzioneAttachmentTarget, slot: AssunzioneAttachmentSlot, link: AttachmentLink) => void
  onAttachmentPreview: (link: AttachmentLink) => void
  uploadingAttachment: string | null
}) {
  const rapporto = card.rapporto
  const lavoratore = card.lavoratore
  const assunzione = card.lavoratoreAssunzione
  const fullName = card.nomeLavoratore
  const [draft, setDraft] = React.useState(() => ({
    tipoUtente: assunzione?.type_of_compilazione_form ?? "LAVORATORE",
    tipoDocumento: assunzione?.documento_identita_tipo ?? "Carta d'identita",
    cittadinoExtracomunitario: assunzione?.cittadino_extracomunitario ?? "No",
  }))

  React.useEffect(() => {
    setDraft({
      tipoUtente: assunzione?.type_of_compilazione_form ?? "LAVORATORE",
      tipoDocumento: assunzione?.documento_identita_tipo ?? "Carta d'identita",
      cittadinoExtracomunitario: assunzione?.cittadino_extracomunitario ?? "No",
    })
  }, [assunzione?.id, card.id, lavoratore?.id, rapporto?.id])

  const setValue = (key: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const { value: nomeL, onChange: onNomeLChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_nome ?? lavoratore?.nome ?? fullName.split(" ")[0] ?? "",
    async (value) => { await onLavoratorePatch({ nome: value || null }) }
  )

  const { value: cognomeL, onChange: onCognomeLChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_cognome ?? lavoratore?.cognome ?? fullName.split(" ").slice(1).join(" ") ?? "",
    async (value) => { await onLavoratorePatch({ cognome: value || null }) }
  )

  const { value: emailL, onChange: onEmailLChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_email ?? lavoratore?.email ?? "",
    async (value) => { await onLavoratorePatch({ email: value || null }) }
  )

  const { value: cellulareL, onChange: onCellulareLChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_numero_mobile ?? lavoratore?.telefono ?? "",
    async (value) => { await onLavoratorePatch({ telefono: value || null }) }
  )

  const { value: cittadinanzaL, onChange: onCittadinanzaLChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_cittadidanza ?? lavoratore?.nazionalita ?? "",
    async (value) => {
      await Promise.all([
        onLavoratorePatch({ nazionalita: value || null }),
        onLavoratoreAssunzionePatch({ info_anagrafiche_cittadidanza: value || null }),
      ])
    }
  )

  const { value: dataAssunzioneL, onChange: onDataAssunzioneLChange } = useDebouncedSave(
    rapporto?.data_inizio_rapporto ?? "",
    async (value) => { await onLavoratoreAssunzionePatch({ data_assunzione: value || null }) }
  )

  const { value: codiceFiscaleL, onChange: onCodiceFiscaleLChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_codice_fiscale ?? "",
    async (value) => { await onLavoratoreAssunzionePatch({ info_anagrafiche_codice_fiscale: value || null }) }
  )

  const { value: telefonoFissoL, onChange: onTelefonoFissoLChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_numero_fisso ?? "",
    async (value) => { await onLavoratoreAssunzionePatch({ info_anagrafiche_numero_fisso: value || null }) }
  )

  const { value: dataNascitaL, onChange: onDataNascitaLChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_data_di_nascita ?? "",
    async (value) => { await onLavoratoreAssunzionePatch({ info_anagrafiche_data_di_nascita: value || null }) }
  )

  const { value: luogoNascitaL, onChange: onLuogoNascitaLChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_luogo_di_nascita ?? "",
    async (value) => { await onLavoratoreAssunzionePatch({ info_anagrafiche_luogo_di_nascita: value || null }) }
  )

  const { value: indirizzoResidenzaL, onChange: onIndirizzoResidenzaLChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_indirizzo ?? "",
    async (value) => { await onLavoratoreAssunzionePatch({ info_anagrafiche_indirizzo: value || null }) }
  )

  const { value: civicoL, onChange: onCivicoLChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_civico ?? "",
    async (value) => { await onLavoratoreAssunzionePatch({ info_anagrafiche_civico: value || null }) }
  )

  const { value: localitaL, onChange: onLocalitaLChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_localita ?? "",
    async (value) => { await onLavoratoreAssunzionePatch({ info_anagrafiche_localita: value || null }) }
  )

  const { value: capL, onChange: onCapLChange } = useDebouncedSave(
    assunzione?.info_anagrafiche_cap ?? "",
    async (value) => { await onLavoratoreAssunzionePatch({ info_anagrafiche_cap: value || null }) }
  )

  const { value: numeroDocumentoL, onChange: onNumeroDocumentoLChange } = useDebouncedSave(
    assunzione?.documento_identita_numero ?? "",
    async (value) => { await onLavoratoreAssunzionePatch({ documento_identita_numero: value || null }) }
  )

  const { value: scadenzaDocumentoL, onChange: onScadenzaDocumentoLChange } = useDebouncedSave(
    assunzione?.documento_identita_scadenza ?? "",
    async (value) => { await onLavoratoreAssunzionePatch({ documento_identita_scadenza: value || null }) }
  )

  const { value: datiBancariL, onChange: onDatiBancariLChange } = useDebouncedSave(
    lavoratore?.iban ?? assunzione?.dati_bancari_lavoratore ?? "",
    async (value) => {
      await Promise.all([
        onLavoratorePatch({ iban: value || null }),
        onLavoratoreAssunzionePatch({ dati_bancari_lavoratore: value || null }),
      ])
    }
  )

  const { value: appuntiExtraL, onChange: onAppuntiExtraLChange } = useDebouncedSave(
    "",
    async (value) => { await onLavoratoreAssunzionePatch({ note_aggiuntive: value || null }) }
  )

  const documentoIdentitaAllegati =
    collectDocumentAttachments(documents, [
      "allegato_documento_identita_fronte",
      "allegato_documento_identita_retro",
    ]) ?? assunzione?.documento_identita_allegati ?? null
  const codiceFiscaleAllegati =
    collectDocumentAttachments(documents, [
      "allegato_codice_fiscale_fronte",
      "allegato_codice_fiscale_retro",
    ]) ?? assunzione?.codice_fiscale_allegati ?? null
  const permessoSoggiornoAllegati =
    collectDocumentAttachments(documents, [
      "allegato_permesso_di_soggiorno_fronte",
      "allegato_permesso_di_soggiorno_retro",
      "allegato_ricevuta_rinnovo_permesso",
    ]) ??
    collectAttachmentValues(
      assunzione?.permesso_di_soggiorno_allegati,
      assunzione?.ricevuta_rinnovo_permesso_allegati
    )

  return (
    <div className="space-y-5">
      <DetailSectionBlock
        title="Riepilogo lavoratore"
        icon={<UserIcon className="text-muted-foreground size-4" />}
        contentClassName="grid gap-4 md:grid-cols-2"
      >
        <EditableField label="Nome">
          <Input
            value={nomeL}
            onChange={(event) => onNomeLChange(event.target.value)}
          />
        </EditableField>
        <EditableField label="Cognome">
          <Input
            value={cognomeL}
            onChange={(event) => onCognomeLChange(event.target.value)}
          />
        </EditableField>
        <EditableField label="Email">
          <Input
            value={emailL}
            onChange={(event) => onEmailLChange(event.target.value)}
          />
        </EditableField>
        <EditableField label="Cellulare">
          <Input
            value={cellulareL}
            onChange={(event) => onCellulareLChange(event.target.value)}
          />
        </EditableField>
        <EditableField label="Cittadinanza">
          <Input
            value={cittadinanzaL}
            onChange={(event) => onCittadinanzaLChange(event.target.value)}
          />
        </EditableField>
        <EditableField label="Data assunzione">
          <Input
            type="date"
            value={dataAssunzioneL}
            onChange={(event) => onDataAssunzioneLChange(event.target.value)}
          />
        </EditableField>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Informazioni generali"
        icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Tipo utente">
          <SingleSelectField
            value={draft.tipoUtente}
            placeholder="Seleziona tipo utente"
            options={TIPO_UTENTE_OPTIONS}
            onValueChange={(value) => {
              setValue("tipoUtente", value)
              void onLavoratoreAssunzionePatch({ type_of_compilazione_form: value || null })
            }}
          />
        </EditableField>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField label="Nome">
            <Input
              value={nomeL}
              onChange={(event) => onNomeLChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Cognome">
            <Input
              value={cognomeL}
              onChange={(event) => onCognomeLChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Codice fiscale">
            <Input
              value={codiceFiscaleL}
              onChange={(event) => onCodiceFiscaleLChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Cittadinanza">
            <Input
              value={cittadinanzaL}
              onChange={(event) => onCittadinanzaLChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Email">
            <Input
              value={emailL}
              onChange={(event) => onEmailLChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Cellulare">
            <Input
              value={cellulareL}
              onChange={(event) => onCellulareLChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Telefono fisso">
            <Input
              value={telefonoFissoL}
              onChange={(event) => onTelefonoFissoLChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Data di nascita">
            <Input
              type="date"
              value={dataNascitaL}
              onChange={(event) => onDataNascitaLChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Luogo di nascita">
            <Input
              value={luogoNascitaL}
              onChange={(event) => onLuogoNascitaLChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Indirizzo di residenza">
            <Input
              value={indirizzoResidenzaL}
              onChange={(event) => onIndirizzoResidenzaLChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Civico">
            <Input
              value={civicoL}
              onChange={(event) => onCivicoLChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Localita">
            <Input
              value={localitaL}
              onChange={(event) => onLocalitaLChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="CAP">
            <Input
              value={capL}
              onChange={(event) => onCapLChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Tipo documento">
            <Select
              value={draft.tipoDocumento}
              onValueChange={(value) => {
                setValue("tipoDocumento", value)
                void onLavoratoreAssunzionePatch({ documento_identita_tipo: value || null })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo documento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Carta d'identita">Carta d'identita</SelectItem>
                <SelectItem value="Passaporto">Passaporto</SelectItem>
                <SelectItem value="Patente">Patente</SelectItem>
              </SelectContent>
            </Select>
          </EditableField>
          <EditableField label="Numero documento">
            <Input
              value={numeroDocumentoL}
              onChange={(event) => onNumeroDocumentoLChange(event.target.value)}
            />
          </EditableField>
          <EditableField label="Scadenza documento">
            <Input
              type="date"
              value={scadenzaDocumentoL}
              onChange={(event) => onScadenzaDocumentoLChange(event.target.value)}
            />
          </EditableField>
        </div>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Dati bancari"
        icon={<CreditCardIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Dati bancari">
          <Textarea
            value={datiBancariL}
            onChange={(event) => onDatiBancariLChange(event.target.value)}
            className="min-h-24 font-mono"
            placeholder="IBAN..."
          />
        </EditableField>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Cittadini extracomunitari"
        icon={<ShieldCheckIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="E extracomunitario?">
          <Select
            value={draft.cittadinoExtracomunitario}
            onValueChange={(value) => {
              setValue("cittadinoExtracomunitario", value)
              void onLavoratoreAssunzionePatch({ cittadino_extracomunitario: value || null })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Si">Si</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </EditableField>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Dati lavoratore"
        icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Appunti extra">
          <Textarea
            value={appuntiExtraL}
            onChange={(event) => onAppuntiExtraLChange(event.target.value)}
            className="min-h-24"
            placeholder="Aggiungi note sul lavoratore o sulla pratica"
          />
        </EditableField>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Documenti lavoratore"
        icon={<ShieldCheckIcon className="text-muted-foreground size-4" />}
        contentClassName="grid gap-3 md:grid-cols-3"
      >
        <AttachmentUploadSlot
          label="Documento identità"
          value={documentoIdentitaAllegati}
          onAdd={(file) => onAttachmentAdd("lavoratore", "documento_identita_allegati", file)}
          onRemove={(link) => onAttachmentRemove("lavoratore", "documento_identita_allegati", link)}
          onPreviewOpen={onAttachmentPreview}
          isUploading={uploadingAttachment === "lavoratore:documento_identita_allegati"}
          multiple={false}
        />
        <AttachmentUploadSlot
          label="Codice fiscale"
          value={codiceFiscaleAllegati}
          onAdd={(file) => onAttachmentAdd("lavoratore", "codice_fiscale_allegati", file)}
          onRemove={(link) => onAttachmentRemove("lavoratore", "codice_fiscale_allegati", link)}
          onPreviewOpen={onAttachmentPreview}
          isUploading={uploadingAttachment === "lavoratore:codice_fiscale_allegati"}
          multiple={false}
        />
        <AttachmentUploadSlot
          label="Permesso di soggiorno"
          value={permessoSoggiornoAllegati}
          onAdd={(file) => onAttachmentAdd("lavoratore", "permesso_di_soggiorno_allegati", file)}
          onRemove={(link) => onAttachmentRemove("lavoratore", "permesso_di_soggiorno_allegati", link)}
          onPreviewOpen={onAttachmentPreview}
          isUploading={uploadingAttachment === "lavoratore:permesso_di_soggiorno_allegati"}
          multiple={false}
        />
      </DetailSectionBlock>

    </div>
  )
}

export function AssunzioniDetailSheet({
  card,
  open,
  onCardChange,
  onOpenChange,
}: {
  card: AssunzioniBoardCardData | null
  open: boolean
  onCardChange: (card: AssunzioniBoardCardData) => void
  onOpenChange: (open: boolean) => void
}) {
  const [target, setTarget] = React.useState<DetailTarget>("datore")
  const [statoAssunzioneOptions, setStatoAssunzioneOptions] = React.useState<LookupOption[]>([])
  const [tipoRapportoOptions, setTipoRapportoOptions] = React.useState<LookupOption[]>([])
  const [offertaOptions, setOffertaOptions] = React.useState<LookupOption[]>(SCONTO_APPLICATO_OPTIONS)
  const [workerDocuments, setWorkerDocuments] = React.useState<DocumentoLavoratoreRecord[]>([])
  const [assunzioneCandidates, setAssunzioneCandidates] =
    React.useState<AssunzioneCandidatesByTarget>({
      datore: [],
      lavoratore: [],
    })
  const [assunzioneSearchQuery, setAssunzioneSearchQuery] = React.useState("")
  const [loadingAssunzioneCandidates, setLoadingAssunzioneCandidates] = React.useState(false)
  const [savingPractice, setSavingPractice] = React.useState(false)
  const [practiceError, setPracticeError] = React.useState<string | null>(null)
  const [uploadingAttachment, setUploadingAttachment] = React.useState<string | null>(null)
  const hydratedAssunzioniRef = React.useRef<Set<string>>(new Set())
  const latestCardRef = React.useRef<AssunzioniBoardCardData | null>(card)
  const datoreAssunzioneCreateRef = React.useRef<Promise<AssunzioneRecord> | null>(null)
  const lavoratoreAssunzioneCreateRef = React.useRef<Promise<AssunzioneRecord> | null>(null)

  React.useEffect(() => {
    latestCardRef.current = card
  }, [card])

  const applyCardChange = React.useCallback(
    (nextCard: AssunzioniBoardCardData) => {
      latestCardRef.current = nextCard
      onCardChange(nextCard)
    },
    [onCardChange]
  )

  const makePracticeDraft = React.useCallback(
    () => ({
      statoAssunzione: card?.stage ?? "",
      tipoRapporto: card?.tipoRapporto ?? "",
      tipoContratto: card?.rapporto?.tipo_contratto ?? "",
      dataAssunzione: card?.rapporto?.data_inizio_rapporto ?? "",
      idRapportoInps: card?.rapporto?.id_rapporto ?? "",
      codiceRapportoWebcolf:
        typeof card?.rapporto?.codice_datore_webcolf === "number"
          ? String(card.rapporto.codice_datore_webcolf)
          : "",
      codiceLavoratoreWebcolf:
        typeof card?.rapporto?.codice_dipendente_webcolf === "number"
          ? String(card.rapporto.codice_dipendente_webcolf)
          : "",
    }),
    [
      card?.rapporto?.codice_datore_webcolf,
      card?.rapporto?.codice_dipendente_webcolf,
      card?.rapporto?.data_inizio_rapporto,
      card?.rapporto?.id_rapporto,
      card?.rapporto?.tipo_contratto,
      card?.stage,
      card?.tipoRapporto,
    ]
  )
  const [practiceDraft, setPracticeDraft] = React.useState(makePracticeDraft)
  const datoreIsLinked = React.useMemo(
    () => Boolean(card?.assunzione?.id),
    [card]
  )
  const lavoratoreIsLinked = React.useMemo(() => Boolean(card?.lavoratoreAssunzione?.id), [card])
  const datoreAssunzioneOptions = React.useMemo(
    () => mergeAssunzioneOptions(card?.assunzione, assunzioneCandidates.datore),
    [assunzioneCandidates.datore, card?.assunzione]
  )
  const lavoratoreAssunzioneOptions = React.useMemo(
    () => mergeAssunzioneOptions(card?.lavoratoreAssunzione, assunzioneCandidates.lavoratore),
    [assunzioneCandidates.lavoratore, card?.lavoratoreAssunzione]
  )
  const currentOffertaOptions = React.useMemo(() => {
    const currentOfferta = card?.process?.offerta?.trim()
    if (!currentOfferta || findLookupOption(offertaOptions, currentOfferta)) {
      return offertaOptions
    }
    return [{ value: currentOfferta, label: currentOfferta }, ...offertaOptions]
  }, [card?.process?.offerta, offertaOptions])
  const selectedAssunzioneOptions =
    target === "datore" ? datoreAssunzioneOptions : lavoratoreAssunzioneOptions
  const selectedAssunzioneId =
    target === "datore" ? card?.assunzione?.id : card?.lavoratoreAssunzione?.id
  const selectedAssunzioneRecord = React.useMemo(
    () =>
      selectedAssunzioneId
        ? selectedAssunzioneOptions.find((record) => record.id === selectedAssunzioneId) ?? null
        : null,
    [selectedAssunzioneId, selectedAssunzioneOptions]
  )
  const filteredAssunzioneOptions = React.useMemo(() => {
    const query = assunzioneSearchQuery.trim()
    if (!query) return selectedAssunzioneOptions.slice(0, 10)
    if (query.length < 2) return []
    return selectedAssunzioneOptions
      .filter((record) => matchesAssunzioneSearch(record, query))
      .slice(0, 80)
  }, [assunzioneSearchQuery, selectedAssunzioneOptions])

  React.useEffect(() => {
    if (!open) return
    setTarget("datore")
  }, [open, card?.id])

  React.useEffect(() => {
    setAssunzioneSearchQuery(
      selectedAssunzioneRecord
        ? formatSelectedAssunzioneLabel(selectedAssunzioneRecord, target, card)
        : ""
    )
  }, [card, selectedAssunzioneRecord, target])

  React.useEffect(() => {
    if (!open || !card?.id) {
      setAssunzioneCandidates({ datore: [], lavoratore: [] })
      return
    }

    let isActive = true
    const currentCard = card

    async function loadAssunzioneCandidates() {
      setLoadingAssunzioneCandidates(true)
      setPracticeError(null)

      try {
        const [datoreResponse, lavoratoreResponse] = await Promise.all([
          fetchAssunzioni({
            select: ASSUNZIONE_DETAIL_SELECT,
            limit: 1000,
            offset: 0,
            orderBy: [{ field: "creato_il", ascending: false }],
            filters: {
              kind: "group",
              id: `assunzioni-candidates-datore-root-${currentCard.id}`,
              logic: "and",
              nodes: [
                {
                  kind: "condition",
                  id: `assunzioni-candidates-datore-type-${currentCard.id}`,
                  field: "type_of_compilazione_form",
                  operator: "is",
                  value: ASSUNZIONE_DATORE_FORM_TYPE,
                },
              ],
            },
          }),
          fetchAssunzioni({
            select: ASSUNZIONE_DETAIL_SELECT,
            limit: 1000,
            offset: 0,
            orderBy: [{ field: "creato_il", ascending: false }],
            filters: {
              kind: "group",
              id: `assunzioni-candidates-lavoratore-root-${currentCard.id}`,
              logic: "and",
              nodes: [
                {
                  kind: "condition",
                  id: `assunzioni-candidates-lavoratore-type-${currentCard.id}`,
                  field: "type_of_compilazione_form",
                  operator: "is",
                  value: ASSUNZIONE_LAVORATORE_FORM_TYPE,
                },
              ],
            },
          }),
        ])

        if (!isActive) return
        setAssunzioneCandidates({
          datore: datoreResponse.rows as AssunzioneRecord[],
          lavoratore: lavoratoreResponse.rows as AssunzioneRecord[],
        })
      } catch (caughtError) {
        if (!isActive) return
        setAssunzioneCandidates({ datore: [], lavoratore: [] })
        setPracticeError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore caricando form assunzione"
        )
      } finally {
        if (isActive) setLoadingAssunzioneCandidates(false)
      }
    }

    void loadAssunzioneCandidates()

    return () => {
      isActive = false
    }
  }, [card?.id, open])

  React.useEffect(() => {
    if (!open || !card?.lavoratore?.id) {
      setWorkerDocuments([])
      return
    }

    let isActive = true
    const workerId = card.lavoratore.id

    async function loadWorkerDocuments() {
      try {
        const response = await fetchDocumentiLavoratoriByWorker(workerId)
        if (!isActive) return
        setWorkerDocuments(response.rows)
      } catch {
        if (!isActive) return
        setWorkerDocuments([])
      }
    }

    void loadWorkerDocuments()

    return () => {
      isActive = false
    }
  }, [card?.lavoratore?.id, open])

  React.useEffect(() => {
    if (!open || !card?.id) return
    const currentCard = card
    if (
      hasAssunzioneCoreDetails(currentCard.assunzione) &&
      hasAssunzioneCoreDetails(currentCard.lavoratoreAssunzione)
    ) {
      return
    }
    const hydrationKey = `assunzioni-detail-v2:${currentCard.id}`
    if (hydratedAssunzioniRef.current.has(hydrationKey)) return
    hydratedAssunzioniRef.current.add(hydrationKey)

    let isActive = true

    async function hydrateLinkedAssunzioni() {
      try {
        const datoreFilterNodes = [
          {
            kind: "condition" as const,
            id: `assunzioni-detail-datore-id-${currentCard.id}`,
            field: "rapporto_lavorativo_datore_lavoro_id",
            operator: "in" as const,
            value: currentCard.id,
          },
          ...(currentCard.famigliaId
            ? [
                {
                  kind: "condition" as const,
                  id: `assunzioni-detail-datore-famiglia-id-${currentCard.id}`,
                  field: "famiglia_id",
                  operator: "in" as const,
                  value: currentCard.famigliaId,
                },
              ]
            : []),
        ]
        const lavoratoreFilterNodes = [
          {
            kind: "condition" as const,
            id: `assunzioni-detail-lavoratore-id-${currentCard.id}`,
            field: "rapporto_lavorativo_lavoratore_id",
            operator: "in" as const,
            value: currentCard.id,
          },
          ...(currentCard.lavoratore?.id
            ? [
                {
                  kind: "condition" as const,
                  id: `assunzioni-detail-lavoratore-worker-id-${currentCard.id}`,
                  field: "lavoratore_id",
                  operator: "in" as const,
                  value: currentCard.lavoratore.id,
                },
              ]
            : []),
        ]
        const [datoreResponse, lavoratoreResponse] = await Promise.all([
          fetchAssunzioni({
            select: ASSUNZIONE_DETAIL_SELECT,
            limit: 5,
            offset: 0,
            orderBy: [{ field: "creato_il", ascending: false }],
            filters: {
              kind: "group",
              id: `assunzioni-detail-datore-${currentCard.id}`,
              logic: "or",
              nodes: datoreFilterNodes,
            },
          }),
          fetchAssunzioni({
            select: ASSUNZIONE_DETAIL_SELECT,
            limit: 5,
            offset: 0,
            orderBy: [{ field: "creato_il", ascending: false }],
            filters: {
              kind: "group",
              id: `assunzioni-detail-lavoratore-${currentCard.id}`,
              logic: "or",
              nodes: lavoratoreFilterNodes,
            },
          }),
        ])

        if (!isActive) return

        const rows = [
          ...(datoreResponse.rows as AssunzioneRecord[]),
          ...(lavoratoreResponse.rows as AssunzioneRecord[]),
        ]
        if (rows.length === 0) return

        let nextCard: AssunzioniBoardCardData = currentCard
        let changed = false
        let datoreHydrated = false
        let lavoratoreHydrated = false

        for (const row of rows) {
          if (
            !datoreHydrated &&
            ((currentCard.famigliaId && row.famiglia_id === currentCard.famigliaId) ||
              row.rapporto_lavorativo_datore_lavoro_id === currentCard.id)
          ) {
            nextCard = {
              ...nextCard,
              assunzione: {
                ...(nextCard.assunzione ?? {}),
                ...row,
              },
            }
            changed = true
            datoreHydrated = true
          }

          if (
            !lavoratoreHydrated &&
            ((currentCard.lavoratore?.id && row.lavoratore_id === currentCard.lavoratore.id) ||
              row.rapporto_lavorativo_lavoratore_id === currentCard.id)
          ) {
            nextCard = {
              ...nextCard,
              lavoratoreAssunzione: {
                ...(nextCard.lavoratoreAssunzione ?? {}),
                ...row,
              },
            }
            changed = true
            lavoratoreHydrated = true
          }
        }

        if (changed) {
          applyCardChange(nextCard)
        }
      } catch (caughtError) {
        if (!isActive) return
        setPracticeError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore caricando dati assunzione"
        )
      }
    }

    void hydrateLinkedAssunzioni()

    return () => {
      isActive = false
    }
  }, [applyCardChange, card, open])

  React.useEffect(() => {
    setPracticeDraft(makePracticeDraft())
  }, [makePracticeDraft])

  React.useEffect(() => {
    let isActive = true

    async function loadLookupOptions() {
      try {
        const response = await fetchLookupValues()
        if (!isActive) return

        setStatoAssunzioneOptions(
          buildLookupOptions(
            response.rows,
            "processi_matching",
            "stato_assunzione",
            card?.stage ?? null
          )
        )
        setTipoRapportoOptions(
          buildLookupOptions(
            response.rows,
            "rapporti_lavorativi",
            "tipo_rapporto",
            card?.tipoRapporto ?? null
          )
        )
        const nextOffertaOptions = buildLookupOptions(
          response.rows,
          "processi_matching",
          "offerta",
          card?.process?.offerta ?? null
        )
        setOffertaOptions(nextOffertaOptions.length > 0 ? nextOffertaOptions : SCONTO_APPLICATO_OPTIONS)
      } catch {
        if (!isActive) return
        setStatoAssunzioneOptions(
          card?.stage ? [{ value: card.stage, label: card.stage }] : []
        )
        setTipoRapportoOptions(
          card?.tipoRapporto ? [{ value: card.tipoRapporto, label: card.tipoRapporto }] : []
        )
        setOffertaOptions(SCONTO_APPLICATO_OPTIONS)
      }
    }

    void loadLookupOptions()

    return () => {
      isActive = false
    }
  }, [card?.process?.offerta, card?.stage, card?.tipoRapporto])

  const saveRapportoPatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard || Object.keys(patch).length === 0) return

      setPracticeError(null)
      setSavingPractice(true)

      try {
        const response = await updateRecord("rapporti_lavorativi", currentCard.id, patch)
        const baseCard = latestCardRef.current ?? currentCard
        const nextRapporto = {
          ...(baseCard.rapporto ?? {}),
          ...response.row,
        } as NonNullable<AssunzioniBoardCardData["rapporto"]>
        const nextStage =
          typeof nextRapporto.stato_assunzione === "string" && nextRapporto.stato_assunzione
            ? nextRapporto.stato_assunzione
            : baseCard.stage
        const nextTipoRapporto = nextRapporto.tipo_rapporto ?? baseCard.tipoRapporto

        applyCardChange({
          ...baseCard,
          stage: nextStage,
          rapporto: nextRapporto,
          tipoRapporto: nextTipoRapporto,
          deadline: formatDate(nextRapporto.data_inizio_rapporto),
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore salvando assunzione"
        )
      } finally {
        setSavingPractice(false)
      }
    },
    [applyCardChange, card]
  )

  const saveProcessPatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard?.process?.id || Object.keys(patch).length === 0) return

      try {
        const response = await updateRecord("processi_matching", currentCard.process.id, patch)
        const baseCard = latestCardRef.current ?? currentCard
        const baseProcess = baseCard.process ?? currentCard.process
        applyCardChange({
          ...baseCard,
          process: {
            ...baseProcess,
            ...response.row,
          },
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore salvando processo"
        )
      }
    },
    [applyCardChange, card]
  )

  const saveFamigliaPatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard?.famigliaId || Object.keys(patch).length === 0) return

      setPracticeError(null)
      setSavingPractice(true)

      try {
        const response = await updateRecord("famiglie", currentCard.famigliaId, patch)
        const baseCard = latestCardRef.current ?? currentCard
        const nextFamiglia = {
          ...(baseCard.famiglia ?? {}),
          ...response.row,
        } as NonNullable<AssunzioniBoardCardData["famiglia"]>
        const nextNomeFamiglia =
          [nextFamiglia.cognome, nextFamiglia.nome].filter(Boolean).join(" ").trim() ||
          baseCard.nomeFamiglia

        applyCardChange({
          ...baseCard,
          famiglia: nextFamiglia,
          nomeFamiglia: nextNomeFamiglia,
          email: nextFamiglia.email ?? baseCard.email,
          telefono: nextFamiglia.telefono ?? baseCard.telefono,
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore salvando datore"
        )
      } finally {
        setSavingPractice(false)
      }
    },
    [applyCardChange, card]
  )

  const saveAssunzionePatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard || Object.keys(patch).length === 0) return

      setPracticeError(null)
      setSavingPractice(true)

      try {
        let nextAssunzione: AssunzioneRecord
        const existingAssunzioneId =
          currentCard.assunzione?.id ?? latestCardRef.current?.assunzione?.id

        if (existingAssunzioneId) {
          const response = await updateRecord("assunzioni", existingAssunzioneId, patch)
          nextAssunzione = response.row as AssunzioneRecord
        } else {
          let createdByThisCall = false
          if (!datoreAssunzioneCreateRef.current) {
            createdByThisCall = true
            datoreAssunzioneCreateRef.current = createRecord("assunzioni", {
              ...patch,
              rapporto_lavorativo_datore_lavoro_id: currentCard.id,
              famiglia_id: currentCard.famigliaId,
            })
              .then((response) => response.row as AssunzioneRecord)
              .finally(() => {
                datoreAssunzioneCreateRef.current = null
              })
          }

          const createdAssunzione = await datoreAssunzioneCreateRef.current
          if (createdByThisCall) {
            nextAssunzione = createdAssunzione
          } else {
            const response = await updateRecord("assunzioni", createdAssunzione.id, patch)
            nextAssunzione = {
              ...createdAssunzione,
              ...response.row,
            } as AssunzioneRecord
          }
        }

        const baseCard = latestCardRef.current ?? currentCard
        applyCardChange({
          ...baseCard,
          assunzione: {
            ...(baseCard.assunzione ?? {}),
            ...nextAssunzione,
          } as AssunzioniBoardCardData["assunzione"],
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore salvando dati assunzione"
        )
      } finally {
        setSavingPractice(false)
      }
    },
    [applyCardChange, card]
  )

  const saveLavoratoreAssunzionePatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard || Object.keys(patch).length === 0) return

      setPracticeError(null)
      setSavingPractice(true)

      try {
        let nextAssunzione: AssunzioneRecord
        const existingAssunzioneId =
          currentCard.lavoratoreAssunzione?.id ?? latestCardRef.current?.lavoratoreAssunzione?.id

        if (existingAssunzioneId) {
          const response = await updateRecord("assunzioni", existingAssunzioneId, patch)
          nextAssunzione = response.row as AssunzioneRecord
        } else {
          let createdByThisCall = false
          if (!lavoratoreAssunzioneCreateRef.current) {
            createdByThisCall = true
            lavoratoreAssunzioneCreateRef.current = createRecord("assunzioni", {
              ...patch,
              rapporto_lavorativo_lavoratore_id: currentCard.id,
              lavoratore_id: currentCard.lavoratore?.id,
            })
              .then((response) => response.row as AssunzioneRecord)
              .finally(() => {
                lavoratoreAssunzioneCreateRef.current = null
              })
          }

          const createdAssunzione = await lavoratoreAssunzioneCreateRef.current
          if (createdByThisCall) {
            nextAssunzione = createdAssunzione
          } else {
            const response = await updateRecord("assunzioni", createdAssunzione.id, patch)
            nextAssunzione = {
              ...createdAssunzione,
              ...response.row,
            } as AssunzioneRecord
          }
        }

        const baseCard = latestCardRef.current ?? currentCard
        applyCardChange({
          ...baseCard,
          lavoratoreAssunzione: {
            ...(baseCard.lavoratoreAssunzione ?? {}),
            ...nextAssunzione,
          } as AssunzioniBoardCardData["lavoratoreAssunzione"],
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore salvando dati lavoratore"
        )
      } finally {
        setSavingPractice(false)
      }
    },
    [applyCardChange, card]
  )

  const saveLavoratorePatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard?.lavoratore?.id || Object.keys(patch).length === 0) return

      setPracticeError(null)
      setSavingPractice(true)

      try {
        const response = await updateRecord("lavoratori", currentCard.lavoratore.id, patch)
        const baseCard = latestCardRef.current ?? currentCard
        const nextLavoratore = {
          ...baseCard.lavoratore,
          ...response.row,
        } as NonNullable<AssunzioniBoardCardData["lavoratore"]>
        const nextNomeLavoratore =
          [nextLavoratore.cognome, nextLavoratore.nome].filter(Boolean).join(" ").trim() ||
          baseCard.nomeLavoratore

        applyCardChange({
          ...baseCard,
          lavoratore: nextLavoratore,
          nomeLavoratore: nextNomeLavoratore,
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore salvando lavoratore"
        )
      } finally {
        setSavingPractice(false)
      }
    },
    [applyCardChange, card]
  )

  const linkAssunzioneRecord = React.useCallback(
    async (assunzioneId: string) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard) return

      const sourceOptions = target === "datore" ? datoreAssunzioneOptions : lavoratoreAssunzioneOptions
      const selectedRecord = sourceOptions.find((record) => record.id === assunzioneId)
      if (!selectedRecord) return

      setPracticeError(null)
      setSavingPractice(true)

      try {
        const patch =
          target === "datore"
            ? {
                rapporto_lavorativo_datore_lavoro_id: currentCard.id,
                famiglia_id: currentCard.famigliaId,
              }
            : {
                rapporto_lavorativo_lavoratore_id: currentCard.id,
                lavoratore_id: currentCard.lavoratore?.id ?? null,
              }

        const response = await updateRecord("assunzioni", assunzioneId, patch)
        const nextRecord = {
          ...selectedRecord,
          ...response.row,
        } as AssunzioneRecord

        setAssunzioneCandidates((current) => ({
          ...current,
          [target]: current[target].map((record) =>
            record.id === assunzioneId ? nextRecord : record
          ),
        }))
        setAssunzioneSearchQuery(formatSelectedAssunzioneLabel(nextRecord, target, currentCard))

        applyCardChange(
          target === "datore"
            ? {
                ...currentCard,
                assunzione: nextRecord,
                nomeFamiglia: resolveAssunzioneDisplayName(nextRecord) ?? currentCard.nomeFamiglia,
                email: nextRecord.info_anagrafiche_email ?? currentCard.email,
                telefono: nextRecord.info_anagrafiche_numero_mobile ?? currentCard.telefono,
              }
            : {
                ...currentCard,
                lavoratoreAssunzione: nextRecord,
                nomeLavoratore: resolveAssunzioneDisplayName(nextRecord) ?? currentCard.nomeLavoratore,
              }
        )
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore associando form assunzione"
        )
      } finally {
        setSavingPractice(false)
      }
    },
    [
      card,
      datoreAssunzioneOptions,
      lavoratoreAssunzioneOptions,
      applyCardChange,
      target,
    ]
  )

  const unlinkAssunzioneRecord = React.useCallback(async () => {
    const currentCard = latestCardRef.current ?? card
    if (!currentCard) return

    const currentRecord = target === "datore" ? currentCard.assunzione : currentCard.lavoratoreAssunzione
    if (!currentRecord?.id) return

    setPracticeError(null)
    setSavingPractice(true)

    try {
      const patch =
        target === "datore"
          ? {
              rapporto_lavorativo_datore_lavoro_id: null,
              famiglia_id: null,
            }
          : {
              rapporto_lavorativo_lavoratore_id: null,
              lavoratore_id: null,
            }

      const response = await updateRecord("assunzioni", currentRecord.id, patch)
      const nextRecord = {
        ...currentRecord,
        ...response.row,
      } as AssunzioneRecord

      setAssunzioneCandidates((current) => ({
        ...current,
        [target]: current[target].map((record) =>
          record.id === currentRecord.id ? nextRecord : record
        ),
      }))
      setAssunzioneSearchQuery("")

      applyCardChange(
        target === "datore"
          ? {
              ...currentCard,
              assunzione: null,
            }
          : {
              ...currentCard,
              lavoratoreAssunzione: null,
            }
      )
    } catch (caughtError) {
      setPracticeError(
        caughtError instanceof Error
          ? caughtError.message
          : "Errore scollegando form assunzione"
      )
    } finally {
      setSavingPractice(false)
    }
  }, [applyCardChange, card, target])

  const uploadAssunzioneAttachment = React.useCallback(
    async (
      target: AssunzioneAttachmentTarget,
      slot: AssunzioneAttachmentSlot,
      file: File
    ) => {
      if (!card) return

      const currentRecord = target === "datore" ? card.assunzione : card.lavoratoreAssunzione
      const key = `${target}:${slot}`
      setUploadingAttachment(key)
      setPracticeError(null)

      try {
        const safeName = sanitizeFileName(file.name || "documento")
        const storagePath = [
          "assunzioni",
          card.id,
          target,
          slot,
          `${Date.now()}-${safeName}`,
        ].join("/")

        const uploadResult = await supabase.storage.from("baze-bucket").upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })

        if (uploadResult.error) {
          throw uploadResult.error
        }

        const payload = buildAttachmentPayload(file, storagePath)
        const nextValue = [...normalizeAttachmentArray(currentRecord?.[slot]), payload]
        if (target === "datore") {
          await saveAssunzionePatch({ [slot]: nextValue })
        } else {
          await saveLavoratoreAssunzionePatch({ [slot]: nextValue })
        }
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore caricando documento"
        )
      } finally {
        setUploadingAttachment(null)
      }
    },
    [card, saveAssunzionePatch, saveLavoratoreAssunzionePatch]
  )

  const uploadRapportoAttachment = React.useCallback(
    async (
      slot: "accordo_di_lavoro_allegati" | "ricevuta_inps_allegati",
      file: File
    ) => {
      if (!card?.rapporto) return

      const key = `rapporto:${slot}`
      setUploadingAttachment(key)
      setPracticeError(null)

      try {
        const safeName = sanitizeFileName(file.name || "documento")
        const storagePath = [
          "rapporti_lavorativi",
          card.id,
          slot,
          `${Date.now()}-${safeName}`,
        ].join("/")

        const uploadResult = await supabase.storage.from("baze-bucket").upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })

        if (uploadResult.error) {
          throw uploadResult.error
        }

        const payload = buildAttachmentPayload(file, storagePath)
        await saveRapportoPatch({
          [slot]: [...normalizeAttachmentArray(card.rapporto[slot]), payload],
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore caricando documento"
        )
      } finally {
        setUploadingAttachment(null)
      }
    },
    [card, saveRapportoPatch]
  )

  const removeAssunzioneAttachment = React.useCallback(
    async (
      target: AssunzioneAttachmentTarget,
      slot: AssunzioneAttachmentSlot,
      link: AttachmentLink,
    ) => {
      if (!card) return

      const currentRecord = target === "datore" ? card.assunzione : card.lavoratoreAssunzione
      const key = `${target}:${slot}`
      setUploadingAttachment(key)
      setPracticeError(null)

      try {
        const nextValue = normalizeAttachmentArray(currentRecord?.[slot]).filter(
          (a) => !(link.path && a.path === link.path) && a.name !== link.label,
        )

        if (link.path?.startsWith("baze-bucket/")) {
          await supabase.storage
            .from("baze-bucket")
            .remove([link.path.replace(/^baze-bucket\//, "")])
        }

        const patch = { [slot]: nextValue.length > 0 ? nextValue : null }
        if (target === "datore") {
          await saveAssunzionePatch(patch)
        } else {
          await saveLavoratoreAssunzionePatch(patch)
        }
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore rimuovendo documento",
        )
      } finally {
        setUploadingAttachment(null)
      }
    },
    [card, saveAssunzionePatch, saveLavoratoreAssunzionePatch],
  )

  const removeRapportoAttachment = React.useCallback(
    async (
      slot: "accordo_di_lavoro_allegati" | "ricevuta_inps_allegati",
      link: AttachmentLink,
    ) => {
      if (!card?.rapporto) return

      const key = `rapporto:${slot}`
      setUploadingAttachment(key)
      setPracticeError(null)

      try {
        const nextValue = normalizeAttachmentArray(card.rapporto[slot]).filter(
          (a) => !(link.path && a.path === link.path) && a.name !== link.label,
        )

        if (link.path?.startsWith("baze-bucket/")) {
          await supabase.storage
            .from("baze-bucket")
            .remove([link.path.replace(/^baze-bucket\//, "")])
        }

        await saveRapportoPatch({
          [slot]: nextValue.length > 0 ? nextValue : null,
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore rimuovendo documento",
        )
      } finally {
        setUploadingAttachment(null)
      }
    },
    [card, saveRapportoPatch],
  )

  function openAttachmentPreview(link: AttachmentLink) {
    window.open(link.url, "_blank", "noopener,noreferrer")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none">
        <SheetHeader className="border-b bg-surface px-5 py-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <SheetTitle className="truncate text-xl font-semibold">
                  {card ? `${card.nomeFamiglia} - ${card.nomeLavoratore}` : "Dettaglio assunzione"}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Dettaglio pratica di assunzione con dati del datore e del lavoratore.
                </SheetDescription>
                <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="flex items-center gap-1.5">
                    <CalendarDaysIcon className="size-4" />
                    {card ? formatDate(card.rapporto?.data_inizio_rapporto) : "-"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BriefcaseBusinessIcon className="size-4" />
                    {card?.tipoRapporto ?? "-"}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </SheetHeader>

        {card ? (
          <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
            <div className="mx-auto max-w-5xl space-y-5">
              <LinkedRapportoSummaryCard
                title={`${card.nomeFamiglia} – ${card.nomeLavoratore}`}
                rapporto={card.rapporto}
                type={card.rapporto?.tipo_rapporto ?? card.tipoRapporto}
              />

              <DetailSectionBlock
                title="Contesto pratica"
                icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
                contentClassName="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <EditableField label="Stato assunzione">
                    <Select
                      value={getLookupSelectDisplayValue(
                        practiceDraft.statoAssunzione,
                        statoAssunzioneOptions
                      )}
                      onValueChange={(value) => {
                        const nextValue = getLookupLabelForSave(value, statoAssunzioneOptions)
                        setPracticeDraft((current) => ({
                          ...current,
                          statoAssunzione: nextValue,
                        }))
                        void saveRapportoPatch({ stato_assunzione: nextValue || null })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona stato" />
                      </SelectTrigger>
                      <SelectContent>
                        {statoAssunzioneOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </EditableField>
                  <EditableField label="Tipologia contratto">
                    <SingleSelectField
                      value={practiceDraft.tipoContratto}
                      placeholder="Seleziona tipologia contratto"
                      options={TIPO_CONTRATTO_OPTIONS}
                      onValueChange={(value) => {
                        setPracticeDraft((current) => ({
                          ...current,
                          tipoContratto: value,
                        }))
                        void saveRapportoPatch({
                          tipo_contratto: value || null,
                        })
                      }}
                    />
                  </EditableField>
                  <EditableField label="Tipo rapporto">
                    <Select
                      value={getLookupSelectDisplayValue(
                        practiceDraft.tipoRapporto,
                        tipoRapportoOptions
                      )}
                      onValueChange={(value) => {
                        const nextValue = getLookupLabelForSave(value, tipoRapportoOptions)
                        setPracticeDraft((current) => ({
                          ...current,
                          tipoRapporto: nextValue,
                        }))
                        void saveRapportoPatch({ tipo_rapporto: nextValue || null })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo rapporto" />
                      </SelectTrigger>
                      <SelectContent>
                        {tipoRapportoOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </EditableField>
                  <EditableField label="Data di assunzione">
                    <Input
                      type="date"
                      value={practiceDraft.dataAssunzione}
                      onChange={(event) =>
                        setPracticeDraft((current) => ({
                          ...current,
                          dataAssunzione: event.target.value,
                        }))
                      }
                      onBlur={() =>
                        void saveRapportoPatch({
                          data_inizio_rapporto: practiceDraft.dataAssunzione || null,
                        })
                      }
                    />
                  </EditableField>
                  <EditableField label="ID rapporto INPS">
                    <Input
                      value={practiceDraft.idRapportoInps}
                      onChange={(event) =>
                        setPracticeDraft((current) => ({
                          ...current,
                          idRapportoInps: event.target.value,
                        }))
                      }
                      onBlur={() =>
                        void saveRapportoPatch({
                          id_rapporto: practiceDraft.idRapportoInps || null,
                        })
                      }
                    />
                  </EditableField>
                  <EditableField label="Cod. Rapporto WebColf">
                    <Input
                      type="number"
                      value={practiceDraft.codiceRapportoWebcolf}
                      onChange={(event) =>
                        setPracticeDraft((current) => ({
                          ...current,
                          codiceRapportoWebcolf: event.target.value,
                        }))
                      }
                      onBlur={() =>
                        void saveRapportoPatch({
                          codice_datore_webcolf: toNullableNumber(
                            practiceDraft.codiceRapportoWebcolf
                          ),
                        })
                      }
                    />
                  </EditableField>
                  <EditableField label="Fee concordata">
                    <Input
                      key={card.richiestaAttivazione?.id ?? "no-richiesta"}
                      type="number"
                      step="0.01"
                      defaultValue={card.richiestaAttivazione?.fee_concordata ?? ""}
                      disabled={!card.richiestaAttivazione?.id}
                      placeholder="-"
                      onBlur={(event) => {
                        const richiestaId = card.richiestaAttivazione?.id
                        if (!richiestaId) return
                        const rawValue = event.target.value.trim()
                        const nextValue = rawValue ? Number(rawValue) : null
                        if (rawValue && Number.isNaN(nextValue)) return
                        void updateRecord("richieste_attivazione", richiestaId, {
                          fee_concordata: nextValue,
                        })
                      }}
                    />
                  </EditableField>
                  <EditableField label="URL origine">
                    {card.process?.source_url ? (
                      <Button type="button" variant="outline" className="w-full justify-between" asChild>
                        <a
                          href={card.process.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Apri URL origine
                          <ExternalLinkIcon className="size-4" />
                        </a>
                      </Button>
                    ) : (
                      <Input value="-" readOnly />
                    )}
                  </EditableField>
                  <EditableField label="Sconto applicato">
                    <Select
                      value={getLookupSelectDisplayValue(
                        card.process?.offerta,
                        currentOffertaOptions
                      )}
                      onValueChange={(value) => {
                        const nextValue = getLookupLabelForSave(value, currentOffertaOptions)
                        void saveProcessPatch({ offerta: nextValue || null })
                      }}
                      disabled={!card.process?.id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona sconto" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentOffertaOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </EditableField>
                  <EditableField label="Cod. Lavoratore WebColf">
                    <Input
                      type="number"
                      value={practiceDraft.codiceLavoratoreWebcolf}
                      onChange={(event) =>
                        setPracticeDraft((current) => ({
                          ...current,
                          codiceLavoratoreWebcolf: event.target.value,
                        }))
                      }
                      onBlur={() =>
                        void saveRapportoPatch({
                          codice_dipendente_webcolf: toNullableNumber(
                            practiceDraft.codiceLavoratoreWebcolf
                          ),
                        })
                      }
                    />
                  </EditableField>
                </div>
                {savingPractice ? (
                  <p className="text-muted-foreground text-xs">Salvataggio in corso...</p>
                ) : null}
                {practiceError ? (
                  <p className="text-xs font-medium text-red-600">{practiceError}</p>
                ) : null}
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Documenti del rapporto"
                icon={<FileTextIcon className="text-muted-foreground size-4" />}
                contentClassName="space-y-4"
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <AttachmentUploadSlot
                    label="Accordo di lavoro"
                    value={card.rapporto?.accordo_di_lavoro_allegati ?? null}
                    onAdd={(file) => uploadRapportoAttachment("accordo_di_lavoro_allegati", file)}
                    onRemove={(link) => void removeRapportoAttachment("accordo_di_lavoro_allegati", link)}
                    onPreviewOpen={openAttachmentPreview}
                    isUploading={uploadingAttachment === "rapporto:accordo_di_lavoro_allegati"}
                    showStatusIndicator
                  />
                  <AttachmentUploadSlot
                    label="Ricevuta INPS"
                    value={card.rapporto?.ricevuta_inps_allegati ?? null}
                    onAdd={(file) => uploadRapportoAttachment("ricevuta_inps_allegati", file)}
                    onRemove={(link) => void removeRapportoAttachment("ricevuta_inps_allegati", link)}
                    onPreviewOpen={openAttachmentPreview}
                    isUploading={uploadingAttachment === "rapporto:ricevuta_inps_allegati"}
                    showStatusIndicator
                  />
                  <AttachmentUploadSlot
                    label="Delega INPS"
                    value={
                      card.assunzione?.delega_inps_allegati ??
                      (card.rapporto?.metadati_migrazione &&
                      typeof card.rapporto.metadati_migrazione === "object"
                        ? (card.rapporto.metadati_migrazione as Record<string, unknown>)
                            .delega_inps_allegati ?? null
                        : null)
                    }
                    onAdd={(file) => uploadAssunzioneAttachment("datore", "delega_inps_allegati", file)}
                    onRemove={(link) => void removeAssunzioneAttachment("datore", "delega_inps_allegati", link)}
                    onPreviewOpen={openAttachmentPreview}
                    isUploading={uploadingAttachment === "datore:delega_inps_allegati"}
                    showStatusIndicator
                  />
                </div>
              </DetailSectionBlock>

              <RapportoDetailSections
                card={card}
                onRapportoPatch={saveRapportoPatch}
                onAssunzionePatch={saveAssunzionePatch}
              />

              <RadioGroup
                value={target}
                onValueChange={(value) => setTarget(value as DetailTarget)}
                className="grid gap-3 md:grid-cols-2"
              >
                <RelatedSubjectCard
                  role="Datore collegato"
                  name={card.nomeFamiglia}
                  email={card.email}
                  phone={card.telefono}
                  value="datore"
                  selected={target === "datore"}
                  isComplete={datoreIsLinked}
                />
                <RelatedSubjectCard
                  role="Lavoratore collegato"
                  name={card.nomeLavoratore}
                  email={card.lavoratore?.email}
                  phone={card.lavoratore?.telefono}
                  value="lavoratore"
                  selected={target === "lavoratore"}
                  isComplete={lavoratoreIsLinked}
                />
              </RadioGroup>

              <DetailSectionBlock
                title="Associazione form"
                icon={<FileTextIcon className="text-muted-foreground size-4" />}
                contentClassName="space-y-2"
              >
                <EditableField
                  label={
                    target === "datore"
                      ? "Form assunzione famiglia"
                      : "Form assunzione lavoratore"
                  }
                >
                  <AssociationSearchField
                    query={assunzioneSearchQuery}
                    onQueryChange={setAssunzioneSearchQuery}
                    options={filteredAssunzioneOptions.map((record) => ({
                      id: record.id,
                      primaryLabel: resolveAssunzioneFormLabel(record, target, card),
                      secondaryLabel: resolveAssunzioneFormSubLabel(record, target, card),
                    }))}
                    selectedId={selectedAssunzioneId ?? null}
                    onSelect={(id) => void linkAssunzioneRecord(id)}
                    onUnlink={() => void unlinkAssunzioneRecord()}
                    canUnlink={Boolean(selectedAssunzioneId)}
                    disabled={savingPractice}
                    loading={loadingAssunzioneCandidates}
                    placeholder="Nome, cognome o email"
                    emptyMessage="Nessun form trovato."
                  />
                </EditableField>
              </DetailSectionBlock>

              {target === "datore" ? (
                <DatoreDetail
                  card={card}
                  onFamigliaPatch={saveFamigliaPatch}
                  onAssunzionePatch={saveAssunzionePatch}
                  onAttachmentAdd={uploadAssunzioneAttachment}
                  onAttachmentRemove={removeAssunzioneAttachment}
                  onAttachmentPreview={openAttachmentPreview}
                  uploadingAttachment={uploadingAttachment}
                />
              ) : (
                <LavoratoreDetail
                  card={card}
                  documents={workerDocuments}
                  onLavoratorePatch={saveLavoratorePatch}
                  onLavoratoreAssunzionePatch={saveLavoratoreAssunzionePatch}
                  onAttachmentAdd={uploadAssunzioneAttachment}
                  onAttachmentRemove={removeAssunzioneAttachment}
                  onAttachmentPreview={openAttachmentPreview}
                  uploadingAttachment={uploadingAttachment}
                />
              )}
            </div>
          </section>
        ) : (
          <DetailSheetSkeleton />
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailSheetSkeleton() {
  return (
    <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
      <div className="mx-auto max-w-5xl space-y-5">
        <Skeleton className="h-24 rounded-lg" />
        <div className="rounded-lg border bg-surface p-4">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
