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
import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  createRecord,
  fetchAssunzioni,
  fetchDocumentiLavoratoriByWorker,
  fetchLookupValues,
  updateRecord,
} from "@/lib/anagrafiche-api"
import { cn } from "@/lib/utils"
import type { DocumentoLavoratoreRecord } from "@/types/entities/documento-lavoratore"

function formatDate(value: string | null | undefined) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

type DetailTarget = "datore" | "lavoratore"
type LookupOption = { value: string; label: string }

const TIPO_CONTRATTO_OPTIONS = ["A", "B", "C", "I"] as const
const TIPO_RAPPORTO_OPTIONS = ["CS", "B", "BS", "A", "C"] as const
const TIPO_UTENTE_OPTIONS = ["DATORE LAVORO", "LAVORATORE"] as const
const SCONTO_APPLICATO_OPTIONS: LookupOption[] = [
  { value: "50%", label: "50%" },
  { value: "prova_gratuita", label: "prova_gratuita" },
  { value: "100€", label: "100€" },
]

const ASSUNZIONE_DETAIL_SELECT = [
  "id",
  "civico_se_diverso_residenza",
  "codice_fiscale_allegati",
  "comune_se_diverso_residenza",
  "dati_bancari_lavoratore",
  "documento_identita_allegati",
  "documento_identita_numero",
  "documento_identita_scadenza",
  "documento_identita_tipo",
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
  "provincia",
  "permesso_di_soggiorno_allegati",
  "rapporto_di_lavoro_residenza",
  "rapporto_lavorativo_datore_lavoro_id",
  "rapporto_lavorativo_lavoratore_id",
  "ricevuta_rinnovo_permesso_allegati",
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

  if (options.length > 0) return options
  if (fallbackValue && fallbackValue.trim()) {
    return [{ value: fallbackValue, label: fallbackValue }]
  }
  return []
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

function pickDocumentAttachment(
  documents: DocumentoLavoratoreRecord[],
  fields: Array<keyof DocumentoLavoratoreRecord>
) {
  for (const document of documents) {
    for (const field of fields) {
      const value = document[field]
      if (value) return value
    }
  }

  return null
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
  const [draft, setDraft] = React.useState(() => ({
    tipologiaContratto: rapporto?.tipo_contratto ?? "",
    tipologiaRapporto: rapporto?.tipo_rapporto ?? card.tipoRapporto ?? "",
    regimeConvivenza: "Il lavoratore NON e convivente",
    totaleOreLavorative: rapporto?.ore_a_settimana ? String(rapporto.ore_a_settimana) : "",
    oreLunedi: "",
    oreMartedi: "",
    oreMercoledi: "",
    oreGiovedi: "",
    oreVenerdi: "",
    oreSabato: "",
    rapportoCorrispondeResidenza: "Si",
    tredicesimaRateizzata: "",
    pagaOraria: rapporto?.paga_oraria_lorda ? String(rapporto.paga_oraria_lorda) : "",
    pagaMensile: rapporto?.paga_mensile_lorda ? String(rapporto.paga_mensile_lorda) : "",
    telecamerePostoLavoro: "No",
    dataAssunzione: rapporto?.data_inizio_rapporto ?? "",
    appuntiExtra: "",
  }))

  React.useEffect(() => {
    setDraft({
      tipologiaContratto: rapporto?.tipo_contratto ?? "",
      tipologiaRapporto: rapporto?.tipo_rapporto ?? card.tipoRapporto ?? "",
      regimeConvivenza: "Il lavoratore NON e convivente",
      totaleOreLavorative: rapporto?.ore_a_settimana ? String(rapporto.ore_a_settimana) : "",
      oreLunedi: "",
      oreMartedi: "",
      oreMercoledi: "",
      oreGiovedi: "",
      oreVenerdi: "",
      oreSabato: "",
      rapportoCorrispondeResidenza: "Si",
      tredicesimaRateizzata: "",
      pagaOraria: rapporto?.paga_oraria_lorda ? String(rapporto.paga_oraria_lorda) : "",
      pagaMensile: rapporto?.paga_mensile_lorda ? String(rapporto.paga_mensile_lorda) : "",
      telecamerePostoLavoro: "No",
      dataAssunzione: rapporto?.data_inizio_rapporto ?? "",
      appuntiExtra: "",
    })
  }, [card.tipoRapporto, rapporto?.data_inizio_rapporto, rapporto?.ore_a_settimana, rapporto?.paga_mensile_lorda, rapporto?.paga_oraria_lorda, rapporto?.tipo_contratto, rapporto?.tipo_rapporto])

  const setValue = (key: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))

  return (
    <>
      <DetailSectionBlock
        title="Tipologia contratto e rapporto"
        icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Tipologia contratto">
          <SingleSelectField
            value={draft.tipologiaContratto}
            placeholder="Seleziona tipologia contratto"
            options={TIPO_CONTRATTO_OPTIONS}
            onValueChange={(value) => {
              setValue("tipologiaContratto", value)
              void onRapportoPatch({ tipo_contratto: value || null })
            }}
          />
        </EditableField>
        <EditableField label="Tipologia di rapporto">
          <SingleSelectField
            value={draft.tipologiaRapporto}
            placeholder="Seleziona tipologia rapporto"
            options={TIPO_RAPPORTO_OPTIONS}
            onValueChange={(value) => {
              setValue("tipologiaRapporto", value)
              void onRapportoPatch({ tipo_rapporto: value || null })
            }}
          />
        </EditableField>
        <EditableField label="Regime di convivenza">
          <Select value={draft.regimeConvivenza} onValueChange={(value) => setValue("regimeConvivenza", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Il lavoratore NON e convivente">Il lavoratore NON e convivente</SelectItem>
              <SelectItem value="Il lavoratore e convivente">Il lavoratore e convivente</SelectItem>
            </SelectContent>
          </Select>
        </EditableField>
        <EditableField label="Totale ore lavorative">
          <Input
            type="number"
            value={draft.totaleOreLavorative}
            onChange={(event) => setValue("totaleOreLavorative", event.target.value)}
            onBlur={() =>
              void onRapportoPatch({
                ore_a_settimana: toNullableNumber(draft.totaleOreLavorative),
              })
            }
          />
        </EditableField>
        <div className="grid gap-4 md:grid-cols-3">
          <EditableField label="Ore lunedi">
            <Input value={draft.oreLunedi} onChange={(event) => setValue("oreLunedi", event.target.value)} />
          </EditableField>
          <EditableField label="Ore martedi">
            <Input value={draft.oreMartedi} onChange={(event) => setValue("oreMartedi", event.target.value)} />
          </EditableField>
          <EditableField label="Ore mercoledi">
            <Input value={draft.oreMercoledi} onChange={(event) => setValue("oreMercoledi", event.target.value)} />
          </EditableField>
          <EditableField label="Ore giovedi">
            <Input value={draft.oreGiovedi} onChange={(event) => setValue("oreGiovedi", event.target.value)} />
          </EditableField>
          <EditableField label="Ore venerdi">
            <Input value={draft.oreVenerdi} onChange={(event) => setValue("oreVenerdi", event.target.value)} />
          </EditableField>
          <EditableField label="Ore sabato">
            <Input value={draft.oreSabato} onChange={(event) => setValue("oreSabato", event.target.value)} />
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
            onValueChange={(value) => setValue("rapportoCorrispondeResidenza", value)}
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
            onValueChange={(value) => setValue("tredicesimaRateizzata", value)}
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
              value={draft.pagaOraria}
              onChange={(event) => setValue("pagaOraria", event.target.value)}
              onBlur={() =>
                void onRapportoPatch({
                  paga_oraria_lorda: toNullableNumber(draft.pagaOraria),
                })
              }
            />
          </EditableField>
          <EditableField label="Paga mensile">
            <Input
              type="number"
              step="0.01"
              value={draft.pagaMensile}
              onChange={(event) => setValue("pagaMensile", event.target.value)}
              onBlur={() =>
                void onRapportoPatch({
                  paga_mensile_lorda: toNullableNumber(draft.pagaMensile),
                })
              }
            />
          </EditableField>
        </div>
        <EditableField label="Ci sono telecamere sul posto di lavoro?">
          <Select
            value={draft.telecamerePostoLavoro}
            onValueChange={(value) => setValue("telecamerePostoLavoro", value)}
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
            value={draft.dataAssunzione}
            onChange={(event) => setValue("dataAssunzione", event.target.value)}
            onBlur={() =>
              void onRapportoPatch({
                data_inizio_rapporto: draft.dataAssunzione || null,
              })
            }
          />
        </EditableField>
        <EditableField label="Appunti extra">
          <Textarea
            value={draft.appuntiExtra}
            onChange={(event) => setValue("appuntiExtra", event.target.value)}
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
}: {
  card: AssunzioniBoardCardData
  onFamigliaPatch: (patch: Record<string, unknown>) => Promise<void>
  onAssunzionePatch: (patch: Record<string, unknown>) => Promise<void>
}) {
  const rapporto = card.rapporto
  const famiglia = card.famiglia
  const assunzione = card.assunzione
  const makeDraft = React.useCallback(
    () => ({
      appuntiExtra: "",
      tipoUtente: "DATORE LAVORO",
      nome: assunzione?.info_anagrafiche_nome ?? famiglia?.nome ?? card.nomeFamiglia.split(" ")[0] ?? "",
      cognome: assunzione?.info_anagrafiche_cognome ?? famiglia?.cognome ?? card.nomeFamiglia.split(" ").slice(1).join(" ") ?? "",
      codiceFiscale: assunzione?.info_anagrafiche_codice_fiscale ?? "",
      cittadinanza: assunzione?.info_anagrafiche_cittadidanza ?? "Italiana",
      email: assunzione?.info_anagrafiche_email ?? famiglia?.email ?? "",
      cellulare: assunzione?.info_anagrafiche_numero_mobile ?? famiglia?.telefono ?? "",
      telefonoFisso: assunzione?.info_anagrafiche_numero_fisso ?? "",
      dataNascita: assunzione?.info_anagrafiche_data_di_nascita ?? "",
      luogoNascita: assunzione?.info_anagrafiche_luogo_di_nascita ?? "",
      indirizzoResidenza: assunzione?.info_anagrafiche_indirizzo ?? "",
      civico: assunzione?.info_anagrafiche_civico ?? "",
      localita: assunzione?.info_anagrafiche_localita ?? "",
      cap: assunzione?.info_anagrafiche_cap ?? "",
      rapportoCorrispondeResidenza:
        assunzione?.rapporto_di_lavoro_residenza === false ? "No" : "Si",
      luogoLavoroIndirizzo: assunzione?.luogo_lavoro_se_diverso_da_residenza ?? "",
      luogoLavoroCivico: assunzione?.civico_se_diverso_residenza ?? "",
      luogoLavoroComune: assunzione?.comune_se_diverso_residenza ?? "",
      luogoLavoroProvincia: assunzione?.provincia ?? "",
      tipoDocumento: assunzione?.documento_identita_tipo ?? "Carta d'identita",
      numeroDocumento: assunzione?.documento_identita_numero ?? "",
      scadenzaDocumento: assunzione?.documento_identita_scadenza ?? "",
      cittadinoExtracomunitario: "No",
      tipologiaRapporto: rapporto?.tipo_rapporto ?? card.tipoRapporto ?? "",
      regimeConvivenza: "Il lavoratore NON e convivente",
      totaleOreLavorative: rapporto?.ore_a_settimana ? String(rapporto.ore_a_settimana) : "",
      oreLunedi: "",
      oreMartedi: "",
      oreMercoledi: "",
      oreGiovedi: "",
      oreVenerdi: "",
      oreSabato: "",
      tredicesimaRateizzata: "",
      pagaOraria: rapporto?.paga_oraria_lorda ? String(rapporto.paga_oraria_lorda) : "",
      pagaMensile: rapporto?.paga_mensile_lorda ? String(rapporto.paga_mensile_lorda) : "",
      telecamerePostoLavoro: "No",
      dataAssunzione: rapporto?.data_inizio_rapporto ?? "",
    }),
    [
      card.nomeFamiglia,
      card.tipoRapporto,
      assunzione?.civico_se_diverso_residenza,
      assunzione?.comune_se_diverso_residenza,
      assunzione?.documento_identita_numero,
      assunzione?.documento_identita_scadenza,
      assunzione?.documento_identita_tipo,
      assunzione?.info_anagrafiche_cap,
      assunzione?.info_anagrafiche_cittadidanza,
      assunzione?.info_anagrafiche_civico,
      assunzione?.info_anagrafiche_codice_fiscale,
      assunzione?.info_anagrafiche_cognome,
      assunzione?.info_anagrafiche_data_di_nascita,
      assunzione?.info_anagrafiche_email,
      assunzione?.info_anagrafiche_indirizzo,
      assunzione?.info_anagrafiche_localita,
      assunzione?.info_anagrafiche_luogo_di_nascita,
      assunzione?.info_anagrafiche_nome,
      assunzione?.info_anagrafiche_numero_fisso,
      assunzione?.info_anagrafiche_numero_mobile,
      assunzione?.luogo_lavoro_se_diverso_da_residenza,
      assunzione?.provincia,
      assunzione?.rapporto_di_lavoro_residenza,
      famiglia?.cognome,
      famiglia?.email,
      famiglia?.nome,
      famiglia?.telefono,
      rapporto?.data_inizio_rapporto,
      rapporto?.ore_a_settimana,
      rapporto?.paga_mensile_lorda,
      rapporto?.paga_oraria_lorda,
      rapporto?.tipo_rapporto,
    ]
  )
  const [draft, setDraft] = React.useState(makeDraft)

  React.useEffect(() => {
    setDraft(makeDraft())
  }, [makeDraft])

  const setValue = (key: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))

  return (
    <div className="space-y-5">
      <DetailSectionBlock
        title="Riepilogo datore"
        icon={<UsersIcon className="text-muted-foreground size-4" />}
        contentClassName="grid gap-4 md:grid-cols-2"
      >
        <EditableField label="Nome">
          <Input
            value={draft.nome}
            onChange={(event) => setValue("nome", event.target.value)}
            onBlur={() => void onFamigliaPatch({ nome: draft.nome || null })}
          />
        </EditableField>
        <EditableField label="Cognome">
          <Input
            value={draft.cognome}
            onChange={(event) => setValue("cognome", event.target.value)}
            onBlur={() => void onFamigliaPatch({ cognome: draft.cognome || null })}
          />
        </EditableField>
        <EditableField label="Email">
          <Input
            value={draft.email}
            onChange={(event) => setValue("email", event.target.value)}
            onBlur={() => void onFamigliaPatch({ email: draft.email || null })}
          />
        </EditableField>
        <EditableField label="Cellulare">
          <Input
            value={draft.cellulare}
            onChange={(event) => setValue("cellulare", event.target.value)}
            onBlur={() => void onFamigliaPatch({ telefono: draft.cellulare || null })}
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
            onValueChange={(value) => setValue("tipoUtente", value)}
          />
        </EditableField>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField label="Nome">
            <Input
              value={draft.nome}
              onChange={(event) => setValue("nome", event.target.value)}
              onBlur={() => void onFamigliaPatch({ nome: draft.nome || null })}
            />
          </EditableField>
          <EditableField label="Cognome">
            <Input
              value={draft.cognome}
              onChange={(event) => setValue("cognome", event.target.value)}
              onBlur={() => void onFamigliaPatch({ cognome: draft.cognome || null })}
            />
          </EditableField>
          <EditableField label="Codice fiscale">
            <Input value={draft.codiceFiscale} onChange={(event) => setValue("codiceFiscale", event.target.value)} />
          </EditableField>
          <EditableField label="Cittadinanza">
            <Input value={draft.cittadinanza} onChange={(event) => setValue("cittadinanza", event.target.value)} />
          </EditableField>
          <EditableField label="Email">
            <Input
              value={draft.email}
              onChange={(event) => setValue("email", event.target.value)}
              onBlur={() => void onFamigliaPatch({ email: draft.email || null })}
            />
          </EditableField>
          <EditableField label="Cellulare">
            <Input
              value={draft.cellulare}
              onChange={(event) => setValue("cellulare", event.target.value)}
              onBlur={() => void onFamigliaPatch({ telefono: draft.cellulare || null })}
            />
          </EditableField>
          <EditableField label="Telefono fisso">
            <Input value={draft.telefonoFisso} onChange={(event) => setValue("telefonoFisso", event.target.value)} />
          </EditableField>
          <EditableField label="Data di nascita">
            <Input type="date" value={draft.dataNascita} onChange={(event) => setValue("dataNascita", event.target.value)} />
          </EditableField>
          <EditableField label="Luogo di nascita">
            <Input value={draft.luogoNascita} onChange={(event) => setValue("luogoNascita", event.target.value)} />
          </EditableField>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField label="Indirizzo di residenza">
            <Input
              value={draft.indirizzoResidenza}
              onChange={(event) => setValue("indirizzoResidenza", event.target.value)}
            />
          </EditableField>
          <EditableField label="Civico">
            <Input value={draft.civico} onChange={(event) => setValue("civico", event.target.value)} />
          </EditableField>
          <EditableField label="Localita">
            <Input value={draft.localita} onChange={(event) => setValue("localita", event.target.value)} />
          </EditableField>
          <EditableField label="CAP">
            <Input value={draft.cap} onChange={(event) => setValue("cap", event.target.value)} />
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
                  value={draft.luogoLavoroIndirizzo}
                  onChange={(event) => setValue("luogoLavoroIndirizzo", event.target.value)}
                  onBlur={() =>
                    void onAssunzionePatch({
                      luogo_lavoro_se_diverso_da_residenza: draft.luogoLavoroIndirizzo || null,
                    })
                  }
                />
              </EditableField>
              <EditableField label="Civico luogo lavoro">
                <Input
                  value={draft.luogoLavoroCivico}
                  onChange={(event) => setValue("luogoLavoroCivico", event.target.value)}
                  onBlur={() =>
                    void onAssunzionePatch({
                      civico_se_diverso_residenza: draft.luogoLavoroCivico || null,
                    })
                  }
                />
              </EditableField>
              <EditableField label="Comune luogo lavoro">
                <Input
                  value={draft.luogoLavoroComune}
                  onChange={(event) => setValue("luogoLavoroComune", event.target.value)}
                  onBlur={() =>
                    void onAssunzionePatch({
                      comune_se_diverso_residenza: draft.luogoLavoroComune || null,
                    })
                  }
                />
              </EditableField>
              <EditableField label="Provincia luogo lavoro">
                <Input
                  value={draft.luogoLavoroProvincia}
                  onChange={(event) => setValue("luogoLavoroProvincia", event.target.value)}
                  onBlur={() =>
                    void onAssunzionePatch({
                      provincia: draft.luogoLavoroProvincia || null,
                    })
                  }
                />
              </EditableField>
            </>
          ) : null}
          <EditableField label="Tipo documento">
            <Select value={draft.tipoDocumento} onValueChange={(value) => setValue("tipoDocumento", value)}>
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
            <Input value={draft.numeroDocumento} onChange={(event) => setValue("numeroDocumento", event.target.value)} />
          </EditableField>
          <EditableField label="Scadenza documento">
            <Input type="date" value={draft.scadenzaDocumento} onChange={(event) => setValue("scadenzaDocumento", event.target.value)} />
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
            onValueChange={(value) => setValue("cittadinoExtracomunitario", value)}
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
          value={assunzione?.documento_identita_allegati ?? null}
          onAdd={() => {}}
          onPreviewOpen={() => {}}
          isUploading={false}
          multiple={false}
        />
        <AttachmentUploadSlot
          label="Codice fiscale"
          value={assunzione?.codice_fiscale_allegati ?? null}
          onAdd={() => {}}
          onPreviewOpen={() => {}}
          isUploading={false}
          multiple={false}
        />
        <AttachmentUploadSlot
          label="Permesso di soggiorno"
          value={
            assunzione?.permesso_di_soggiorno_allegati ??
            assunzione?.ricevuta_rinnovo_permesso_allegati ??
            null
          }
          onAdd={() => {}}
          onPreviewOpen={() => {}}
          isUploading={false}
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
}: {
  card: AssunzioniBoardCardData
  documents: DocumentoLavoratoreRecord[]
  onLavoratorePatch: (patch: Record<string, unknown>) => Promise<void>
}) {
  const rapporto = card.rapporto
  const lavoratore = card.lavoratore
  const assunzione = card.lavoratoreAssunzione
  const fullName = card.nomeLavoratore
  const makeDraft = React.useCallback(
    () => ({
      appuntiExtra: "",
      tipoUtente: "LAVORATORE",
      nome: assunzione?.info_anagrafiche_nome ?? lavoratore?.nome ?? fullName.split(" ")[0] ?? "",
      cognome: assunzione?.info_anagrafiche_cognome ?? lavoratore?.cognome ?? fullName.split(" ").slice(1).join(" ") ?? "",
      email: assunzione?.info_anagrafiche_email ?? lavoratore?.email ?? "",
      cellulare: assunzione?.info_anagrafiche_numero_mobile ?? lavoratore?.telefono ?? "",
      telefonoFisso: assunzione?.info_anagrafiche_numero_fisso ?? "",
      cittadinanza: assunzione?.info_anagrafiche_cittadidanza ?? lavoratore?.nazionalita ?? "",
      codiceFiscale: assunzione?.info_anagrafiche_codice_fiscale ?? "",
      dataNascita: assunzione?.info_anagrafiche_data_di_nascita ?? "",
      luogoNascita: assunzione?.info_anagrafiche_luogo_di_nascita ?? "",
      indirizzoResidenza: assunzione?.info_anagrafiche_indirizzo ?? "",
      civico: assunzione?.info_anagrafiche_civico ?? "",
      localita: assunzione?.info_anagrafiche_localita ?? "",
      cap: assunzione?.info_anagrafiche_cap ?? "",
      tipoDocumento: assunzione?.documento_identita_tipo ?? "Carta d'identita",
      datiBancari: assunzione?.dati_bancari_lavoratore ?? "",
      numeroDocumento: assunzione?.documento_identita_numero ?? "",
      scadenzaDocumento: assunzione?.documento_identita_scadenza ?? "",
      cittadinoExtracomunitario: "No",
      dataAssunzione: rapporto?.data_inizio_rapporto ?? "",
    }),
    [
      assunzione?.dati_bancari_lavoratore,
      assunzione?.documento_identita_numero,
      assunzione?.documento_identita_scadenza,
      assunzione?.documento_identita_tipo,
      assunzione?.info_anagrafiche_cap,
      assunzione?.info_anagrafiche_cittadidanza,
      assunzione?.info_anagrafiche_civico,
      assunzione?.info_anagrafiche_codice_fiscale,
      assunzione?.info_anagrafiche_cognome,
      assunzione?.info_anagrafiche_data_di_nascita,
      assunzione?.info_anagrafiche_email,
      assunzione?.info_anagrafiche_indirizzo,
      assunzione?.info_anagrafiche_localita,
      assunzione?.info_anagrafiche_luogo_di_nascita,
      assunzione?.info_anagrafiche_nome,
      assunzione?.info_anagrafiche_numero_fisso,
      assunzione?.info_anagrafiche_numero_mobile,
      fullName,
      lavoratore?.cognome,
      lavoratore?.email,
      lavoratore?.nazionalita,
      lavoratore?.nome,
      lavoratore?.telefono,
      rapporto?.data_inizio_rapporto,
    ]
  )
  const [draft, setDraft] = React.useState(makeDraft)

  React.useEffect(() => {
    setDraft(makeDraft())
  }, [makeDraft])

  const setValue = (key: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))

  return (
    <div className="space-y-5">
      <DetailSectionBlock
        title="Riepilogo lavoratore"
        icon={<UserIcon className="text-muted-foreground size-4" />}
        contentClassName="grid gap-4 md:grid-cols-2"
      >
        <EditableField label="Nome">
          <Input
            value={draft.nome}
            onChange={(event) => setValue("nome", event.target.value)}
            onBlur={() => void onLavoratorePatch({ nome: draft.nome || null })}
          />
        </EditableField>
        <EditableField label="Cognome">
          <Input
            value={draft.cognome}
            onChange={(event) => setValue("cognome", event.target.value)}
            onBlur={() => void onLavoratorePatch({ cognome: draft.cognome || null })}
          />
        </EditableField>
        <EditableField label="Email">
          <Input
            value={draft.email}
            onChange={(event) => setValue("email", event.target.value)}
            onBlur={() => void onLavoratorePatch({ email: draft.email || null })}
          />
        </EditableField>
        <EditableField label="Cellulare">
          <Input
            value={draft.cellulare}
            onChange={(event) => setValue("cellulare", event.target.value)}
            onBlur={() => void onLavoratorePatch({ telefono: draft.cellulare || null })}
          />
        </EditableField>
        <EditableField label="Cittadinanza">
          <Input
            value={draft.cittadinanza}
            onChange={(event) => setValue("cittadinanza", event.target.value)}
            onBlur={() => void onLavoratorePatch({ nazionalita: draft.cittadinanza || null })}
          />
        </EditableField>
        <EditableField label="Data assunzione">
          <Input type="date" value={draft.dataAssunzione} onChange={(event) => setValue("dataAssunzione", event.target.value)} />
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
            onValueChange={(value) => setValue("tipoUtente", value)}
          />
        </EditableField>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField label="Nome">
            <Input
              value={draft.nome}
              onChange={(event) => setValue("nome", event.target.value)}
              onBlur={() => void onLavoratorePatch({ nome: draft.nome || null })}
            />
          </EditableField>
          <EditableField label="Cognome">
            <Input
              value={draft.cognome}
              onChange={(event) => setValue("cognome", event.target.value)}
              onBlur={() => void onLavoratorePatch({ cognome: draft.cognome || null })}
            />
          </EditableField>
          <EditableField label="Codice fiscale">
            <Input value={draft.codiceFiscale} onChange={(event) => setValue("codiceFiscale", event.target.value)} />
          </EditableField>
          <EditableField label="Cittadinanza">
            <Input
              value={draft.cittadinanza}
              onChange={(event) => setValue("cittadinanza", event.target.value)}
              onBlur={() => void onLavoratorePatch({ nazionalita: draft.cittadinanza || null })}
            />
          </EditableField>
          <EditableField label="Email">
            <Input
              value={draft.email}
              onChange={(event) => setValue("email", event.target.value)}
              onBlur={() => void onLavoratorePatch({ email: draft.email || null })}
            />
          </EditableField>
          <EditableField label="Cellulare">
            <Input
              value={draft.cellulare}
              onChange={(event) => setValue("cellulare", event.target.value)}
              onBlur={() => void onLavoratorePatch({ telefono: draft.cellulare || null })}
            />
          </EditableField>
          <EditableField label="Telefono fisso">
            <Input value={draft.telefonoFisso} onChange={(event) => setValue("telefonoFisso", event.target.value)} />
          </EditableField>
          <EditableField label="Data di nascita">
            <Input type="date" value={draft.dataNascita} onChange={(event) => setValue("dataNascita", event.target.value)} />
          </EditableField>
          <EditableField label="Luogo di nascita">
            <Input value={draft.luogoNascita} onChange={(event) => setValue("luogoNascita", event.target.value)} />
          </EditableField>
          <EditableField label="Indirizzo di residenza">
            <Input value={draft.indirizzoResidenza} onChange={(event) => setValue("indirizzoResidenza", event.target.value)} />
          </EditableField>
          <EditableField label="Civico">
            <Input value={draft.civico} onChange={(event) => setValue("civico", event.target.value)} />
          </EditableField>
          <EditableField label="Localita">
            <Input value={draft.localita} onChange={(event) => setValue("localita", event.target.value)} />
          </EditableField>
          <EditableField label="CAP">
            <Input value={draft.cap} onChange={(event) => setValue("cap", event.target.value)} />
          </EditableField>
          <EditableField label="Tipo documento">
            <Select value={draft.tipoDocumento} onValueChange={(value) => setValue("tipoDocumento", value)}>
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
            <Input value={draft.numeroDocumento} onChange={(event) => setValue("numeroDocumento", event.target.value)} />
          </EditableField>
          <EditableField label="Scadenza documento">
            <Input type="date" value={draft.scadenzaDocumento} onChange={(event) => setValue("scadenzaDocumento", event.target.value)} />
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
            value={draft.datiBancari}
            onChange={(event) => setValue("datiBancari", event.target.value)}
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
            onValueChange={(value) => setValue("cittadinoExtracomunitario", value)}
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
            value={draft.appuntiExtra}
            onChange={(event) => setValue("appuntiExtra", event.target.value)}
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
          value={pickDocumentAttachment(documents, [
            "allegato_documento_identita_fronte",
            "allegato_documento_identita_retro",
          ])}
          onAdd={() => {}}
          onPreviewOpen={() => {}}
          isUploading={false}
          multiple={false}
        />
        <AttachmentUploadSlot
          label="Codice fiscale"
          value={pickDocumentAttachment(documents, [
            "allegato_codice_fiscale_fronte",
            "allegato_codice_fiscale_retro",
          ])}
          onAdd={() => {}}
          onPreviewOpen={() => {}}
          isUploading={false}
          multiple={false}
        />
        <AttachmentUploadSlot
          label="Permesso di soggiorno"
          value={pickDocumentAttachment(documents, [
            "allegato_permesso_di_soggiorno_fronte",
            "allegato_permesso_di_soggiorno_retro",
            "allegato_ricevuta_rinnovo_permesso",
          ])}
          onAdd={() => {}}
          onPreviewOpen={() => {}}
          isUploading={false}
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
  const [savingPractice, setSavingPractice] = React.useState(false)
  const [practiceError, setPracticeError] = React.useState<string | null>(null)
  const hydratedAssunzioniRef = React.useRef<Set<string>>(new Set())
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

  React.useEffect(() => {
    if (!open) return
    setTarget("datore")
  }, [open, card?.id])

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
        const [datoreResponse, lavoratoreResponse] = await Promise.all([
          fetchAssunzioni({
            select: ASSUNZIONE_DETAIL_SELECT,
            limit: 1,
            offset: 0,
            orderBy: [{ field: "created", ascending: false }],
            filters: {
              kind: "group",
              id: `assunzioni-detail-datore-${currentCard.id}`,
              logic: "and",
              nodes: [
                {
                  kind: "condition",
                  id: `assunzioni-detail-datore-id-${currentCard.id}`,
                  field: "rapporto_lavorativo_datore_lavoro_id",
                  operator: "in",
                  value: currentCard.id,
                },
              ],
            },
          }),
          fetchAssunzioni({
            select: ASSUNZIONE_DETAIL_SELECT,
            limit: 1,
            offset: 0,
            orderBy: [{ field: "created", ascending: false }],
            filters: {
              kind: "group",
              id: `assunzioni-detail-lavoratore-${currentCard.id}`,
              logic: "and",
              nodes: [
                {
                  kind: "condition",
                  id: `assunzioni-detail-lavoratore-id-${currentCard.id}`,
                  field: "rapporto_lavorativo_lavoratore_id",
                  operator: "in",
                  value: currentCard.id,
                },
              ],
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

        for (const row of rows) {
          if (row.rapporto_lavorativo_datore_lavoro_id === currentCard.id) {
            nextCard = {
              ...nextCard,
              assunzione: {
                ...(nextCard.assunzione ?? {}),
                ...row,
              },
            }
            changed = true
          }

          if (row.rapporto_lavorativo_lavoratore_id === currentCard.id) {
            nextCard = {
              ...nextCard,
              lavoratoreAssunzione: {
                ...(nextCard.lavoratoreAssunzione ?? {}),
                ...row,
              },
            }
            changed = true
          }
        }

        if (changed) {
          onCardChange(nextCard)
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
  }, [card, onCardChange, open])

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
      if (!card || Object.keys(patch).length === 0) return

      setPracticeError(null)
      setSavingPractice(true)

      try {
        const response = await updateRecord("rapporti_lavorativi", card.id, patch)
        const nextRapporto = {
          ...(card.rapporto ?? {}),
          ...response.row,
        } as NonNullable<AssunzioniBoardCardData["rapporto"]>
        const nextStage =
          typeof nextRapporto.stato_assunzione === "string" && nextRapporto.stato_assunzione
            ? nextRapporto.stato_assunzione
            : card.stage
        const nextTipoRapporto = nextRapporto.tipo_rapporto ?? card.tipoRapporto

        onCardChange({
          ...card,
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
    [card, onCardChange]
  )

  const saveProcessPatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      if (!card?.process?.id || Object.keys(patch).length === 0) return

      try {
        const response = await updateRecord("processi_matching", card.process.id, patch)
        onCardChange({
          ...card,
          process: {
            ...card.process,
            ...response.row,
          },
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore salvando processo"
        )
      }
    },
    [card, onCardChange]
  )

  const saveFamigliaPatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      if (!card?.famigliaId || Object.keys(patch).length === 0) return

      setPracticeError(null)
      setSavingPractice(true)

      try {
        const response = await updateRecord("famiglie", card.famigliaId, patch)
        const nextFamiglia = {
          ...(card.famiglia ?? {}),
          ...response.row,
        } as NonNullable<AssunzioniBoardCardData["famiglia"]>
        const nextNomeFamiglia =
          [nextFamiglia.cognome, nextFamiglia.nome].filter(Boolean).join(" ").trim() ||
          card.nomeFamiglia

        onCardChange({
          ...card,
          famiglia: nextFamiglia,
          nomeFamiglia: nextNomeFamiglia,
          email: nextFamiglia.email ?? card.email,
          telefono: nextFamiglia.telefono ?? card.telefono,
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore salvando datore"
        )
      } finally {
        setSavingPractice(false)
      }
    },
    [card, onCardChange]
  )

  const saveAssunzionePatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      if (!card || Object.keys(patch).length === 0) return

      setPracticeError(null)
      setSavingPractice(true)

      try {
        const response = card.assunzione?.id
          ? await updateRecord("assunzioni", card.assunzione.id, patch)
          : await createRecord("assunzioni", {
              ...patch,
              rapporto_lavorativo_datore_lavoro_id: card.id,
            })
        onCardChange({
          ...card,
          assunzione: {
            ...(card.assunzione ?? {}),
            ...response.row,
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
    [card, onCardChange]
  )

  const saveLavoratorePatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      if (!card?.lavoratore?.id || Object.keys(patch).length === 0) return

      setPracticeError(null)
      setSavingPractice(true)

      try {
        const response = await updateRecord("lavoratori", card.lavoratore.id, patch)
        const nextLavoratore = {
          ...card.lavoratore,
          ...response.row,
        } as NonNullable<AssunzioniBoardCardData["lavoratore"]>
        const nextNomeLavoratore =
          [nextLavoratore.cognome, nextLavoratore.nome].filter(Boolean).join(" ").trim() ||
          card.nomeLavoratore

        onCardChange({
          ...card,
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
    [card, onCardChange]
  )

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
                      value={practiceDraft.statoAssunzione || undefined}
                      onValueChange={(value) => {
                        setPracticeDraft((current) => ({
                          ...current,
                          statoAssunzione: value,
                        }))
                        void saveRapportoPatch({ stato_assunzione: value || null })
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
                      value={practiceDraft.tipoRapporto || undefined}
                      onValueChange={(value) => {
                        setPracticeDraft((current) => ({
                          ...current,
                          tipoRapporto: value,
                        }))
                        void saveRapportoPatch({ tipo_rapporto: value || null })
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
                      value={card.process?.offerta || undefined}
                      onValueChange={(value) => {
                        void saveProcessPatch({ offerta: value || null })
                      }}
                      disabled={!card.process?.id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona sconto" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          ...offertaOptions,
                          ...(card.process?.offerta &&
                          !offertaOptions.some((option) => option.value === card.process?.offerta)
                            ? [{ value: card.process.offerta, label: card.process.offerta }]
                            : []),
                        ].map((option) => (
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
                    onAdd={() => {}}
                    onPreviewOpen={() => {}}
                    isUploading={false}
                  />
                  <AttachmentUploadSlot
                    label="Ricevuta INPS"
                    value={card.rapporto?.ricevuta_inps_allegati ?? null}
                    onAdd={() => {}}
                    onPreviewOpen={() => {}}
                    isUploading={false}
                  />
                  <AttachmentUploadSlot
                    label="Delega INPS"
                    value={null}
                    onAdd={() => {}}
                    onPreviewOpen={() => {}}
                    isUploading={false}
                  />
                </div>
              </DetailSectionBlock>

              <RapportoDetailSections card={card} onRapportoPatch={saveRapportoPatch} />

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

              {target === "datore" ? (
                <DatoreDetail
                  card={card}
                  onFamigliaPatch={saveFamigliaPatch}
                  onAssunzionePatch={saveAssunzionePatch}
                />
              ) : (
                <LavoratoreDetail
                  card={card}
                  documents={workerDocuments}
                  onLavoratorePatch={saveLavoratorePatch}
                />
              )}
            </div>
          </section>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
