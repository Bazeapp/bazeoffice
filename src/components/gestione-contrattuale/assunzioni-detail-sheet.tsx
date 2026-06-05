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
import { Form } from "@/components/ui/form"
import {
  FieldInput,
  FieldTextarea,
} from "@/components/forms/field-components"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { useController } from "react-hook-form"
import {
  createRecord,
  fetchAssunzioniByIds,
  fetchAssunzioniByFormType,
  fetchDocumentiLavoratoriByWorker,
  fetchLookupValues,
  updateRecord,
} from "@/lib/anagrafiche-api"
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

// Il campo "Tipologia contratto" accetta solo i livelli CCNL qui sopra. Valori
// che arrivano da altre fonti (es. "Indeterminato" dal sync esterno) non sono
// validi: li trattiamo come vuoto così il campo mostra il placeholder invece di
// un'opzione inesistente.
function isValidTipoContratto(value: string | null | undefined) {
  return Boolean(value) && (TIPO_CONTRATTO_OPTIONS as readonly string[]).includes(value as string)
}
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
  "mansione_lavoratore",
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

// FASE 5 BIS — wrapper form-aware per i Select a opzioni fisse (Si/No,
// tipo documento, regime, tipo utente, tipologia contratto). Il form
// memorizza il valore da salvare; eventuali valori esterni non in lista
// vengono mostrati comunque (come SingleSelectField).
function FieldSingleSelect({
  name,
  placeholder,
  options,
}: {
  name: string
  placeholder: string
  options: readonly string[]
}) {
  const { field } = useController({ name })
  const value = typeof field.value === "string" ? field.value : ""
  const optionValues = value && !options.includes(value) ? [value, ...options] : options
  return (
    <Select value={value || undefined} onValueChange={field.onChange}>
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

// FASE 5 BIS — wrapper form-aware per i Select di lookup (label↔key). Il form
// memorizza la LABEL da salvare (come l'originale: getLookupLabelForSave),
// mentre il trigger mostra la value_key risolta.
function FieldLookupSelect({
  name,
  options,
  placeholder,
  disabled,
}: {
  name: string
  options: LookupOption[]
  placeholder: string
  disabled?: boolean
}) {
  const { field } = useController({ name })
  const current = typeof field.value === "string" ? field.value : ""
  return (
    <Select
      value={getLookupSelectDisplayValue(current, options)}
      onValueChange={(value) => field.onChange(getLookupLabelForSave(value, options))}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
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
}: {
  card: AssunzioniBoardCardData
  onRapportoPatch: (patch: Record<string, unknown>) => Promise<void>
}) {
  const rapporto = card.rapporto

  // FASE 5 BIS — form + autosave (sostituisce i 5 useDebouncedSave). onSave
  // instrada tutto su onRapportoPatch con le trasformazioni originali
  // (toNullableNumber per ore/paga, ||null per distribuzione/data).
  const form = useAutoSaveForm({
    defaults: {
      ore_a_settimana: rapporto?.ore_a_settimana ? String(rapporto.ore_a_settimana) : "",
      distribuzione_ore_settimana: rapporto?.distribuzione_ore_settimana ?? "",
      paga_oraria_lorda: rapporto?.paga_oraria_lorda ? String(rapporto.paga_oraria_lorda) : "",
      paga_mensile_lorda: rapporto?.paga_mensile_lorda ? String(rapporto.paga_mensile_lorda) : "",
      data_inizio_rapporto: rapporto?.data_inizio_rapporto ?? "",
    },
    onSave: async (patch) => {
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(patch)) {
        out[key] =
          key === "ore_a_settimana" ||
          key === "paga_oraria_lorda" ||
          key === "paga_mensile_lorda"
            ? toNullableNumber(value as string)
            : (value as string) || null
      }
      await onRapportoPatch(out)
    },
  })

  return (
    <Form {...form}>
      <DetailSectionBlock
        title="Orario e paga rapporto"
        icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Ore di lavoro a settimana">
          <FieldInput name="ore_a_settimana" type="number" />
        </EditableField>
        <EditableField label="Distribuzione ore settimanali">
          <div className="space-y-2">
            <p className="ui-type-meta">Parte da domenica</p>
            <FieldInput name="distribuzione_ore_settimana" placeholder="0-0-0-0-0-0-0" />
          </div>
        </EditableField>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField label="Paga oraria">
            <FieldInput name="paga_oraria_lorda" type="number" step="0.01" />
          </EditableField>
          <EditableField label="Paga mensile">
            <FieldInput name="paga_mensile_lorda" type="number" step="0.01" />
          </EditableField>
        </div>
        <EditableField label="Data di assunzione">
          <FieldInput name="data_inizio_rapporto" type="date" />
        </EditableField>
      </DetailSectionBlock>
    </Form>
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
  const famiglia = card.famiglia
  const assunzione = card.assunzione

  // FASE 5 BIS — form + autosave: unica source of truth per i campi editabili
  // del datore. Sostituisce i ~25 useDebouncedSave + draft/setDraft per i Select.
  // onSave instrada per chiave a 2 target: nome/cognome/email/telefono →
  // onFamigliaPatch, tutto il resto → onAssunzionePatch (con le stesse
  // trasformazioni: ore_* numeriche → toNullableNumber, rapporto_di_lavoro_residenza
  // Si/No → boolean, resto ""→null). Resync realtime senza clobber: keepDirtyValues.
  const form = useAutoSaveForm({
    defaults: {
      nome: assunzione?.info_anagrafiche_nome ?? famiglia?.nome ?? card.nomeFamiglia.split(" ")[0] ?? "",
      cognome:
        assunzione?.info_anagrafiche_cognome ??
        famiglia?.cognome ??
        card.nomeFamiglia.split(" ").slice(1).join(" ") ??
        "",
      email: assunzione?.info_anagrafiche_email ?? famiglia?.email ?? "",
      telefono: assunzione?.info_anagrafiche_numero_mobile ?? famiglia?.telefono ?? "",
      type_of_compilazione_form: assunzione?.type_of_compilazione_form ?? "DATORE LAVORO",
      rapporto_di_lavoro_residenza:
        assunzione?.rapporto_di_lavoro_residenza === false ? "No" : "Si",
      documento_identita_tipo: assunzione?.documento_identita_tipo ?? "Carta d'identita",
      cittadino_extracomunitario: assunzione?.cittadino_extracomunitario ?? "No",
      regime_convivenza: normalizeRegimeConvivenza(assunzione?.regime_convivenza),
      tredicesima_rateizzata_mensile: assunzione?.tredicesima_rateizzata_mensile ?? "",
      telecamere_posto_lavoro: assunzione?.telecamere_posto_lavoro ?? "No",
      info_anagrafiche_codice_fiscale: assunzione?.info_anagrafiche_codice_fiscale ?? "",
      info_anagrafiche_cittadidanza: assunzione?.info_anagrafiche_cittadidanza ?? "Italiana",
      info_anagrafiche_numero_fisso: assunzione?.info_anagrafiche_numero_fisso ?? "",
      info_anagrafiche_data_di_nascita: assunzione?.info_anagrafiche_data_di_nascita ?? "",
      info_anagrafiche_luogo_di_nascita: assunzione?.info_anagrafiche_luogo_di_nascita ?? "",
      info_anagrafiche_indirizzo: assunzione?.info_anagrafiche_indirizzo ?? "",
      info_anagrafiche_civico: assunzione?.info_anagrafiche_civico ?? "",
      info_anagrafiche_localita: assunzione?.info_anagrafiche_localita ?? "",
      info_anagrafiche_cap: assunzione?.info_anagrafiche_cap ?? "",
      luogo_lavoro_se_diverso_da_residenza:
        assunzione?.luogo_lavoro_se_diverso_da_residenza ?? "",
      civico_se_diverso_residenza: assunzione?.civico_se_diverso_residenza ?? "",
      comune_se_diverso_residenza: assunzione?.comune_se_diverso_residenza ?? "",
      provincia: assunzione?.provincia ?? "",
      documento_identita_numero: assunzione?.documento_identita_numero ?? "",
      documento_identita_scadenza: assunzione?.documento_identita_scadenza ?? "",
      ore_di_lavoro: toInputValue(assunzione?.ore_di_lavoro),
      ore_lunedi: toInputValue(assunzione?.ore_lunedi),
      ore_martedi: toInputValue(assunzione?.ore_martedi),
      ore_mercoledi: toInputValue(assunzione?.ore_mercoledi),
      ore_giovedi: toInputValue(assunzione?.ore_giovedi),
      ore_venerdi: toInputValue(assunzione?.ore_venerdi),
      ore_sabato: toInputValue(assunzione?.ore_sabato),
      mezza_giornata_di_riposo: assunzione?.mezza_giornata_di_riposo ?? "",
      data_assunzione: assunzione?.data_assunzione ?? "",
      note_aggiuntive: assunzione?.note_aggiuntive ?? "",
    },
    onSave: async (patch) => {
      const famigliaKeys = new Set(["nome", "cognome", "email", "telefono"])
      const oreKeys = new Set([
        "ore_di_lavoro",
        "ore_lunedi",
        "ore_martedi",
        "ore_mercoledi",
        "ore_giovedi",
        "ore_venerdi",
        "ore_sabato",
      ])
      const famigliaPatch: Record<string, unknown> = {}
      const assunzionePatch: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(patch)) {
        if (famigliaKeys.has(key)) {
          famigliaPatch[key] = (value as string) || null
        } else if (key === "rapporto_di_lavoro_residenza") {
          assunzionePatch[key] = value === "Si"
        } else if (oreKeys.has(key)) {
          assunzionePatch[key] = toNullableNumber(value as string)
        } else {
          assunzionePatch[key] = (value as string) || null
        }
      }
      if (Object.keys(famigliaPatch).length > 0) await onFamigliaPatch(famigliaPatch)
      if (Object.keys(assunzionePatch).length > 0) await onAssunzionePatch(assunzionePatch)
    },
  })
  const rapportoCorrispondeResidenza = form.watch("rapporto_di_lavoro_residenza")

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
  const delegaInpsAllegati = collectAttachmentValues(
    assunzione?.delega_inps_allegati
  )

  return (
    <Form {...form}>
    <div className="space-y-5">
      <DetailSectionBlock
        title="Riepilogo datore"
        icon={<UsersIcon className="text-muted-foreground size-4" />}
        contentClassName="grid gap-4 md:grid-cols-2"
      >
        <EditableField label="Nome">
          <FieldInput name="nome" />
        </EditableField>
        <EditableField label="Cognome">
          <FieldInput name="cognome" />
        </EditableField>
        <EditableField label="Email">
          <FieldInput name="email" />
        </EditableField>
        <EditableField label="Cellulare">
          <FieldInput name="telefono" />
        </EditableField>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Informazioni generali"
        icon={<UserIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
          <EditableField label="Tipo utente">
          <FieldSingleSelect
            name="type_of_compilazione_form"
            placeholder="Seleziona tipo utente"
            options={TIPO_UTENTE_OPTIONS}
          />
        </EditableField>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField label="Nome">
            <FieldInput name="nome" />
          </EditableField>
          <EditableField label="Cognome">
            <FieldInput name="cognome" />
          </EditableField>
          <EditableField label="Codice fiscale">
            <FieldInput name="info_anagrafiche_codice_fiscale" />
          </EditableField>
          <EditableField label="Cittadinanza">
            <FieldInput name="info_anagrafiche_cittadidanza" />
          </EditableField>
          <EditableField label="Email">
            <FieldInput name="email" />
          </EditableField>
          <EditableField label="Cellulare">
            <FieldInput name="telefono" />
          </EditableField>
          <EditableField label="Telefono fisso">
            <FieldInput name="info_anagrafiche_numero_fisso" />
          </EditableField>
          <EditableField label="Data di nascita">
            <FieldInput name="info_anagrafiche_data_di_nascita" type="date" />
          </EditableField>
          <EditableField label="Luogo di nascita">
            <FieldInput name="info_anagrafiche_luogo_di_nascita" />
          </EditableField>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField label="Indirizzo di residenza">
            <FieldInput name="info_anagrafiche_indirizzo" />
          </EditableField>
          <EditableField label="Civico">
            <FieldInput name="info_anagrafiche_civico" />
          </EditableField>
          <EditableField label="Localita">
            <FieldInput name="info_anagrafiche_localita" />
          </EditableField>
          <EditableField label="CAP">
            <FieldInput name="info_anagrafiche_cap" />
          </EditableField>
          <EditableField label="Il luogo di residenza corrisponde al luogo di lavoro?">
            <FieldSingleSelect
              name="rapporto_di_lavoro_residenza"
              placeholder="Seleziona..."
              options={["Si", "No"]}
            />
          </EditableField>
          {rapportoCorrispondeResidenza === "No" ? (
            <>
              <EditableField label="Indirizzo luogo lavoro">
                <FieldInput name="luogo_lavoro_se_diverso_da_residenza" />
              </EditableField>
              <EditableField label="Civico luogo lavoro">
                <FieldInput name="civico_se_diverso_residenza" />
              </EditableField>
              <EditableField label="Comune luogo lavoro">
                <FieldInput name="comune_se_diverso_residenza" />
              </EditableField>
              <EditableField label="Provincia luogo lavoro">
                <FieldInput name="provincia" />
              </EditableField>
            </>
          ) : null}
          <EditableField label="Tipo documento">
            <FieldSingleSelect
              name="documento_identita_tipo"
              placeholder="Seleziona tipo documento"
              options={["Carta d'identita", "Passaporto", "Patente"]}
            />
          </EditableField>
          <EditableField label="Numero documento">
            <FieldInput name="documento_identita_numero" />
          </EditableField>
          <EditableField label="Scadenza documento">
            <FieldInput name="documento_identita_scadenza" type="date" />
          </EditableField>
        </div>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Cittadini extracomunitari"
        icon={<ShieldCheckIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="E extracomunitario?">
          <FieldSingleSelect
            name="cittadino_extracomunitario"
            placeholder="Seleziona..."
            options={["Si", "No"]}
          />
        </EditableField>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Convivenza e orario (form famiglia)"
        icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Mansione indicata dalla famiglia">
          <div className="flex min-h-10 items-center rounded-md border bg-surface px-3 py-2 text-sm">
            {assunzione?.mansione_lavoratore || "—"}
          </div>
        </EditableField>
        <EditableField label="Regime di convivenza">
          <FieldSingleSelect
            name="regime_convivenza"
            placeholder="Seleziona..."
            options={[REGIME_NON_CONVIVENTE, REGIME_CONVIVENTE]}
          />
        </EditableField>
        <EditableField label="Ore di lavoro a settimana">
          <FieldInput name="ore_di_lavoro" type="number" />
        </EditableField>
        <div className="grid gap-4 md:grid-cols-3">
          <EditableField label="Ore lunedi">
            <FieldInput name="ore_lunedi" type="number" step="0.25" />
          </EditableField>
          <EditableField label="Ore martedi">
            <FieldInput name="ore_martedi" type="number" step="0.25" />
          </EditableField>
          <EditableField label="Ore mercoledi">
            <FieldInput name="ore_mercoledi" type="number" step="0.25" />
          </EditableField>
          <EditableField label="Ore giovedi">
            <FieldInput name="ore_giovedi" type="number" step="0.25" />
          </EditableField>
          <EditableField label="Ore venerdi">
            <FieldInput name="ore_venerdi" type="number" step="0.25" />
          </EditableField>
          <EditableField label="Ore sabato">
            <FieldInput name="ore_sabato" type="number" step="0.25" />
          </EditableField>
          <EditableField label="Giorno/mezza giornata di riposo">
            <FieldInput name="mezza_giornata_di_riposo" />
          </EditableField>
        </div>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Altri dettagli (form famiglia)"
        icon={<CalendarDaysIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Tredicesima rateizzata?">
          <FieldSingleSelect
            name="tredicesima_rateizzata_mensile"
            placeholder="Seleziona..."
            options={["Si", "No"]}
          />
        </EditableField>
        <EditableField label="Ci sono telecamere sul posto di lavoro?">
          <FieldSingleSelect
            name="telecamere_posto_lavoro"
            placeholder="Seleziona..."
            options={["Si", "No"]}
          />
        </EditableField>
        <EditableField label="Data di assunzione">
          <FieldInput name="data_assunzione" type="date" />
        </EditableField>
        <EditableField label="Appunti extra">
          <FieldTextarea
            name="note_aggiuntive"
            className="min-h-24"
            placeholder="Aggiungi note sul rapporto o sulla pratica"
          />
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
        <AttachmentUploadSlot
          label="Delega INPS"
          value={delegaInpsAllegati}
          onAdd={(file) => onAttachmentAdd("datore", "delega_inps_allegati", file)}
          onRemove={(link) => onAttachmentRemove("datore", "delega_inps_allegati", link)}
          onPreviewOpen={onAttachmentPreview}
          isUploading={uploadingAttachment === "datore:delega_inps_allegati"}
          multiple={false}
        />
      </DetailSectionBlock>
    </div>
    </Form>
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

  // FASE 5 BIS — form + autosave: unica source of truth per i campi editabili
  // del lavoratore. Sostituisce i ~18 useDebouncedSave + draft/setDraft per i
  // Select. onSave instrada per chiave a 2 target: nome/cognome/email/telefono
  // → onLavoratorePatch (lavoratori), il resto → onLavoratoreAssunzionePatch
  // (assunzioni). Due campi a doppio target come l'originale: cittadinanza →
  // nazionalita + info_anagrafiche_cittadidanza, dati_bancari → iban +
  // dati_bancari_lavoratore. Resync realtime senza clobber: keepDirtyValues.
  const form = useAutoSaveForm({
    defaults: {
      nome: assunzione?.info_anagrafiche_nome ?? lavoratore?.nome ?? fullName.split(" ")[0] ?? "",
      cognome:
        assunzione?.info_anagrafiche_cognome ??
        lavoratore?.cognome ??
        fullName.split(" ").slice(1).join(" ") ??
        "",
      email: assunzione?.info_anagrafiche_email ?? lavoratore?.email ?? "",
      telefono: assunzione?.info_anagrafiche_numero_mobile ?? lavoratore?.telefono ?? "",
      cittadinanza: assunzione?.info_anagrafiche_cittadidanza ?? lavoratore?.nazionalita ?? "",
      data_assunzione: rapporto?.data_inizio_rapporto ?? "",
      type_of_compilazione_form: assunzione?.type_of_compilazione_form ?? "LAVORATORE",
      documento_identita_tipo: assunzione?.documento_identita_tipo ?? "Carta d'identita",
      cittadino_extracomunitario: assunzione?.cittadino_extracomunitario ?? "No",
      info_anagrafiche_codice_fiscale: assunzione?.info_anagrafiche_codice_fiscale ?? "",
      info_anagrafiche_numero_fisso: assunzione?.info_anagrafiche_numero_fisso ?? "",
      info_anagrafiche_data_di_nascita: assunzione?.info_anagrafiche_data_di_nascita ?? "",
      info_anagrafiche_luogo_di_nascita: assunzione?.info_anagrafiche_luogo_di_nascita ?? "",
      info_anagrafiche_indirizzo: assunzione?.info_anagrafiche_indirizzo ?? "",
      info_anagrafiche_civico: assunzione?.info_anagrafiche_civico ?? "",
      info_anagrafiche_localita: assunzione?.info_anagrafiche_localita ?? "",
      info_anagrafiche_cap: assunzione?.info_anagrafiche_cap ?? "",
      documento_identita_numero: assunzione?.documento_identita_numero ?? "",
      documento_identita_scadenza: assunzione?.documento_identita_scadenza ?? "",
      dati_bancari: lavoratore?.iban ?? assunzione?.dati_bancari_lavoratore ?? "",
      note_aggiuntive: "",
    },
    onSave: async (patch) => {
      const lavoratoreKeys = new Set(["nome", "cognome", "email", "telefono"])
      const lavoratorePatch: Record<string, unknown> = {}
      const assunzionePatch: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(patch)) {
        const next = (value as string) || null
        if (lavoratoreKeys.has(key)) {
          lavoratorePatch[key] = next
        } else if (key === "cittadinanza") {
          lavoratorePatch.nazionalita = next
          assunzionePatch.info_anagrafiche_cittadidanza = next
        } else if (key === "dati_bancari") {
          lavoratorePatch.iban = next
          assunzionePatch.dati_bancari_lavoratore = next
        } else {
          assunzionePatch[key] = next
        }
      }
      await Promise.all([
        Object.keys(lavoratorePatch).length > 0
          ? onLavoratorePatch(lavoratorePatch)
          : Promise.resolve(),
        Object.keys(assunzionePatch).length > 0
          ? onLavoratoreAssunzionePatch(assunzionePatch)
          : Promise.resolve(),
      ])
    },
  })

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
    <Form {...form}>
    <div className="space-y-5">
      <DetailSectionBlock
        title="Riepilogo lavoratore"
        icon={<UserIcon className="text-muted-foreground size-4" />}
        contentClassName="grid gap-4 md:grid-cols-2"
      >
        <EditableField label="Nome">
          <FieldInput name="nome" />
        </EditableField>
        <EditableField label="Cognome">
          <FieldInput name="cognome" />
        </EditableField>
        <EditableField label="Email">
          <FieldInput name="email" />
        </EditableField>
        <EditableField label="Cellulare">
          <FieldInput name="telefono" />
        </EditableField>
        <EditableField label="Cittadinanza">
          <FieldInput name="cittadinanza" />
        </EditableField>
        <EditableField label="Data assunzione">
          <FieldInput name="data_assunzione" type="date" />
        </EditableField>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Informazioni generali"
        icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Tipo utente">
          <FieldSingleSelect
            name="type_of_compilazione_form"
            placeholder="Seleziona tipo utente"
            options={TIPO_UTENTE_OPTIONS}
          />
        </EditableField>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField label="Nome">
            <FieldInput name="nome" />
          </EditableField>
          <EditableField label="Cognome">
            <FieldInput name="cognome" />
          </EditableField>
          <EditableField label="Codice fiscale">
            <FieldInput name="info_anagrafiche_codice_fiscale" />
          </EditableField>
          <EditableField label="Cittadinanza">
            <FieldInput name="cittadinanza" />
          </EditableField>
          <EditableField label="Email">
            <FieldInput name="email" />
          </EditableField>
          <EditableField label="Cellulare">
            <FieldInput name="telefono" />
          </EditableField>
          <EditableField label="Telefono fisso">
            <FieldInput name="info_anagrafiche_numero_fisso" />
          </EditableField>
          <EditableField label="Data di nascita">
            <FieldInput name="info_anagrafiche_data_di_nascita" type="date" />
          </EditableField>
          <EditableField label="Luogo di nascita">
            <FieldInput name="info_anagrafiche_luogo_di_nascita" />
          </EditableField>
          <EditableField label="Indirizzo di residenza">
            <FieldInput name="info_anagrafiche_indirizzo" />
          </EditableField>
          <EditableField label="Civico">
            <FieldInput name="info_anagrafiche_civico" />
          </EditableField>
          <EditableField label="Localita">
            <FieldInput name="info_anagrafiche_localita" />
          </EditableField>
          <EditableField label="CAP">
            <FieldInput name="info_anagrafiche_cap" />
          </EditableField>
          <EditableField label="Tipo documento">
            <FieldSingleSelect
              name="documento_identita_tipo"
              placeholder="Seleziona tipo documento"
              options={["Carta d'identita", "Passaporto", "Patente"]}
            />
          </EditableField>
          <EditableField label="Numero documento">
            <FieldInput name="documento_identita_numero" />
          </EditableField>
          <EditableField label="Scadenza documento">
            <FieldInput name="documento_identita_scadenza" type="date" />
          </EditableField>
        </div>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Dati bancari"
        icon={<CreditCardIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Dati bancari">
          <FieldTextarea
            name="dati_bancari"
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
          <FieldSingleSelect
            name="cittadino_extracomunitario"
            placeholder="Seleziona..."
            options={["Si", "No"]}
          />
        </EditableField>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Dati lavoratore"
        icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Appunti extra">
          <FieldTextarea
            name="note_aggiuntive"
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
    </Form>
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

    async function loadAssunzioneCandidates() {
      setLoadingAssunzioneCandidates(true)
      setPracticeError(null)

      try {
        const candidatesColumns = ASSUNZIONE_DETAIL_SELECT.join(",")
        const [datoreResponse, lavoratoreResponse] = await Promise.all([
          fetchAssunzioniByFormType(ASSUNZIONE_DATORE_FORM_TYPE, candidatesColumns),
          fetchAssunzioniByFormType(ASSUNZIONE_LAVORATORE_FORM_TYPE, candidatesColumns),
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
        const datoreAssunzioneId = currentCard.assunzione?.id ?? null
        const lavoratoreAssunzioneId = currentCard.lavoratoreAssunzione?.id ?? null
        const emptyResponse = { rows: [] as AssunzioneRecord[], total: 0, columns: [] }
        const detailColumns = ASSUNZIONE_DETAIL_SELECT.join(",")
        const [datoreResponse, lavoratoreResponse] = await Promise.all([
          datoreAssunzioneId
            ? fetchAssunzioniByIds([datoreAssunzioneId], detailColumns)
            : Promise.resolve(emptyResponse),
          lavoratoreAssunzioneId
            ? fetchAssunzioniByIds([lavoratoreAssunzioneId], detailColumns)
            : Promise.resolve(emptyResponse),
        ])

        if (!isActive) return

        const datoreRow = (datoreResponse.rows as AssunzioneRecord[])[0] ?? null
        const lavoratoreRow = (lavoratoreResponse.rows as AssunzioneRecord[])[0] ?? null
        if (!datoreRow && !lavoratoreRow) return

        let nextCard: AssunzioniBoardCardData = currentCard
        let changed = false

        if (datoreRow) {
          nextCard = {
            ...nextCard,
            assunzione: {
              ...(nextCard.assunzione ?? {}),
              ...datoreRow,
            },
          }
          changed = true
        }

        if (lavoratoreRow) {
          nextCard = {
            ...nextCard,
            lavoratoreAssunzione: {
              ...(nextCard.lavoratoreAssunzione ?? {}),
              ...lavoratoreRow,
            },
          }
          changed = true
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
    // Options derive from the static lookup domain, not from the current
    // card values. Including card fields in the deps would re-fetch on every
    // autosave and cause a network round-trip per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

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

  // FASE 5 BIS — form + autosave per la sezione "Contesto pratica" (sostituisce
  // i 5 DebouncedInput committedValue + practiceDraft/setPracticeDraft + il
  // resync effect). onSave instrada per chiave a 3 target con le trasformazioni
  // originali: stato/tipo/data/id/codici → saveRapportoPatch (lookup label per
  // stato_assunzione/tipo_rapporto, toNullableNumber per i codici), offerta →
  // saveProcessPatch, fee_concordata → updateRecord("richieste_attivazione")
  // con la stessa validazione (guard se manca id, skip se non numerico).
  const richiestaAttivazioneId = card?.richiestaAttivazione?.id
  const practiceForm = useAutoSaveForm({
    defaults: {
      stato_assunzione: card?.stage ?? "",
      tipo_rapporto: card?.tipoRapporto ?? "",
      tipo_contratto: isValidTipoContratto(card?.rapporto?.tipo_contratto)
        ? (card?.rapporto?.tipo_contratto ?? "")
        : "",
      data_inizio_rapporto: card?.rapporto?.data_inizio_rapporto ?? "",
      id_rapporto: card?.rapporto?.id_rapporto ?? "",
      codice_datore_webcolf:
        typeof card?.rapporto?.codice_datore_webcolf === "number"
          ? String(card.rapporto.codice_datore_webcolf)
          : "",
      codice_dipendente_webcolf:
        typeof card?.rapporto?.codice_dipendente_webcolf === "number"
          ? String(card.rapporto.codice_dipendente_webcolf)
          : "",
      offerta: card?.process?.offerta ?? "",
      fee_concordata:
        card?.richiestaAttivazione?.fee_concordata != null
          ? String(card.richiestaAttivazione.fee_concordata)
          : "",
    },
    onSave: async (patch) => {
      const rapportoPatch: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(patch)) {
        if (key === "offerta") {
          await saveProcessPatch({ offerta: (value as string) || null })
        } else if (key === "fee_concordata") {
          if (!richiestaAttivazioneId) continue
          const rawValue = String(value ?? "").trim()
          const nextValue = rawValue ? Number(rawValue) : null
          if (rawValue && Number.isNaN(nextValue)) continue
          await updateRecord("richieste_attivazione", richiestaAttivazioneId, {
            fee_concordata: nextValue,
          })
        } else if (
          key === "codice_datore_webcolf" ||
          key === "codice_dipendente_webcolf"
        ) {
          rapportoPatch[key] = toNullableNumber(value as string)
        } else {
          rapportoPatch[key] = (value as string) || null
        }
      }
      if (Object.keys(rapportoPatch).length > 0) await saveRapportoPatch(rapportoPatch)
    },
  })

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
              famiglia_id: currentCard.famigliaId,
            })
              .then(async (response) => {
                const created = response.row as AssunzioneRecord
                await updateRecord("rapporti_lavorativi", currentCard.id, {
                  assunzione_datore_id: created.id,
                })
                return created
              })
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
              lavoratore_id: currentCard.lavoratore?.id,
            })
              .then(async (response) => {
                const created = response.row as AssunzioneRecord
                await updateRecord("rapporti_lavorativi", currentCard.id, {
                  assunzione_lavoratore_id: created.id,
                })
                return created
              })
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
        const response = await updateRecord(
          "rapporti_lavorativi",
          currentCard.id,
          target === "datore"
            ? { assunzione_datore_id: assunzioneId }
            : { assunzione_lavoratore_id: assunzioneId }
        )
        const nextRecord = selectedRecord
        const nextRapporto = {
          ...(currentCard.rapporto ?? {}),
          ...response.row,
        } as AssunzioniBoardCardData["rapporto"]

        setAssunzioneSearchQuery(formatSelectedAssunzioneLabel(nextRecord, target, currentCard))

        applyCardChange(
          target === "datore"
            ? {
                ...currentCard,
                rapporto: nextRapporto,
                assunzione: nextRecord,
                nomeFamiglia: resolveAssunzioneDisplayName(nextRecord) ?? currentCard.nomeFamiglia,
                email: nextRecord.info_anagrafiche_email ?? currentCard.email,
                telefono: nextRecord.info_anagrafiche_numero_mobile ?? currentCard.telefono,
              }
            : {
                ...currentCard,
                rapporto: nextRapporto,
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
      const response = await updateRecord(
        "rapporti_lavorativi",
        currentCard.id,
        target === "datore"
          ? { assunzione_datore_id: null }
          : { assunzione_lavoratore_id: null }
      )
      const nextRapporto = {
        ...(currentCard.rapporto ?? {}),
        ...response.row,
      } as AssunzioniBoardCardData["rapporto"]

      setAssunzioneSearchQuery("")

      applyCardChange(
        target === "datore"
          ? {
              ...currentCard,
              rapporto: nextRapporto,
              assunzione: null,
            }
          : {
              ...currentCard,
              rapporto: nextRapporto,
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
    <Form {...practiceForm}>
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
                    <FieldLookupSelect
                      name="stato_assunzione"
                      options={statoAssunzioneOptions}
                      placeholder="Seleziona stato"
                    />
                  </EditableField>
                  <EditableField label="Tipologia contratto">
                    <FieldSingleSelect
                      name="tipo_contratto"
                      placeholder="Seleziona tipologia contratto"
                      options={TIPO_CONTRATTO_OPTIONS}
                    />
                  </EditableField>
                  <EditableField label="Tipo rapporto">
                    <FieldLookupSelect
                      name="tipo_rapporto"
                      options={tipoRapportoOptions}
                      placeholder="Seleziona tipo rapporto"
                    />
                  </EditableField>
                  <EditableField label="Data di assunzione">
                    <FieldInput name="data_inizio_rapporto" type="date" />
                  </EditableField>
                  <EditableField label="ID rapporto INPS">
                    <FieldInput name="id_rapporto" />
                  </EditableField>
                  <EditableField label="Cod. Rapporto WebColf">
                    <FieldInput name="codice_datore_webcolf" type="number" />
                  </EditableField>
                  <EditableField label="Fee concordata">
                    <FieldInput
                      name="fee_concordata"
                      type="number"
                      step="0.01"
                      placeholder="-"
                      disabled={!card.richiestaAttivazione?.id}
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
                    <FieldLookupSelect
                      name="offerta"
                      options={currentOffertaOptions}
                      placeholder="Seleziona sconto"
                      disabled={!card.process?.id}
                    />
                  </EditableField>
                  <EditableField label="Cod. Lavoratore WebColf">
                    <FieldInput name="codice_dipendente_webcolf" type="number" />
                  </EditableField>
                </div>
                {practiceError ? (
                  <p className="text-xs font-medium text-red-600">{practiceError}</p>
                ) : null}
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Documenti del rapporto"
                icon={<FileTextIcon className="text-muted-foreground size-4" />}
                contentClassName="space-y-4"
              >
                <div className="grid gap-3 md:grid-cols-2">
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
                </div>
              </DetailSectionBlock>

              <RapportoDetailSections
                card={card}
                onRapportoPatch={saveRapportoPatch}
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
    </Form>
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
