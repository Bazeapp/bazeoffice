import * as React from "react"
import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  FileTextIcon,
  MailIcon,
  OctagonAlertIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"

import type { AssunzioniBoardCardData } from "@/hooks/use-assunzioni-board"
import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { createRecord, fetchLookupValues, updateRecord } from "@/lib/anagrafiche-api"
import { cn } from "@/lib/utils"

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

function hasFilledValue(value: string | null | undefined) {
  return Boolean(value && value.trim())
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
  const makeDraft = React.useCallback(
    () => ({
      appuntiExtra: "",
      tipoUtente: "DATORE LAVORO",
      nome: famiglia?.nome ?? card.nomeFamiglia.split(" ")[0] ?? "",
      cognome: famiglia?.cognome ?? card.nomeFamiglia.split(" ").slice(1).join(" ") ?? "",
      codiceFiscale: "",
      cittadinanza: "Italiana",
      email: famiglia?.email ?? "",
      cellulare: famiglia?.telefono ?? "",
      telefonoFisso: "",
      dataNascita: "",
      luogoNascita: "",
      indirizzoResidenza: "",
      civico: "",
      localita: "",
      cap: "",
      rapportoCorrispondeResidenza:
        card.assunzione?.rapporto_di_lavoro_residenza === false ? "No" : "Si",
      luogoLavoroIndirizzo: card.assunzione?.luogo_lavoro_se_diverso_da_residenza ?? "",
      luogoLavoroCivico: card.assunzione?.civico_se_diverso_residenza ?? "",
      luogoLavoroComune: card.assunzione?.comune_se_diverso_residenza ?? "",
      luogoLavoroProvincia: card.assunzione?.provincia ?? "",
      tipoDocumento: "Carta d'identita",
      numeroDocumento: "",
      scadenzaDocumento: "",
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
      famiglia?.cognome,
      famiglia?.email,
      famiglia?.nome,
      famiglia?.telefono,
      rapporto?.data_inizio_rapporto,
      rapporto?.ore_a_settimana,
      rapporto?.paga_mensile_lorda,
      rapporto?.paga_oraria_lorda,
      rapporto?.tipo_rapporto,
      card.assunzione?.civico_se_diverso_residenza,
      card.assunzione?.comune_se_diverso_residenza,
      card.assunzione?.luogo_lavoro_se_diverso_da_residenza,
      card.assunzione?.provincia,
      card.assunzione?.rapporto_di_lavoro_residenza,
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
        <AttachmentUploadSlot label="Documento identita" value={null} onAdd={() => {}} onPreviewOpen={() => {}} isUploading={false} />
        <AttachmentUploadSlot label="Codice fiscale" value={null} onAdd={() => {}} onPreviewOpen={() => {}} isUploading={false} />
        <AttachmentUploadSlot label="Permesso di soggiorno" value={null} onAdd={() => {}} onPreviewOpen={() => {}} isUploading={false} />
      </DetailSectionBlock>
    </div>
  )
}

function LavoratoreDetail({
  card,
  onLavoratorePatch,
}: {
  card: AssunzioniBoardCardData
  onLavoratorePatch: (patch: Record<string, unknown>) => Promise<void>
}) {
  const rapporto = card.rapporto
  const lavoratore = card.lavoratore
  const fullName = card.nomeLavoratore
  const makeDraft = React.useCallback(
    () => ({
      appuntiExtra: "",
      tipoUtente: "LAVORATORE",
      nome: lavoratore?.nome ?? fullName.split(" ")[0] ?? "",
      cognome: lavoratore?.cognome ?? fullName.split(" ").slice(1).join(" ") ?? "",
      email: lavoratore?.email ?? "",
      cellulare: lavoratore?.telefono ?? "",
      telefonoFisso: "",
      cittadinanza: lavoratore?.nazionalita ?? "",
      codiceFiscale: "",
      dataNascita: "",
      luogoNascita: "",
      indirizzoResidenza: "",
      civico: "",
      localita: "",
      cap: "",
      tipoDocumento: "Carta d'identita",
      datiBancari: "",
      numeroDocumento: "",
      scadenzaDocumento: "",
      cittadinoExtracomunitario: "No",
      dataAssunzione: rapporto?.data_inizio_rapporto ?? "",
    }),
    [
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
        <AttachmentUploadSlot label="Documento identità" value={null} onAdd={() => {}} onPreviewOpen={() => {}} isUploading={false} />
        <AttachmentUploadSlot label="Codice fiscale" value={null} onAdd={() => {}} onPreviewOpen={() => {}} isUploading={false} />
        <AttachmentUploadSlot label="Permesso di soggiorno" value={null} onAdd={() => {}} onPreviewOpen={() => {}} isUploading={false} />
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
  const [savingPractice, setSavingPractice] = React.useState(false)
  const [practiceError, setPracticeError] = React.useState<string | null>(null)
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
    () =>
      Boolean(card?.famigliaId) &&
      hasFilledValue(card?.nomeFamiglia ?? "") &&
      card?.nomeFamiglia !== "Famiglia non trovata",
    [card]
  )
  const lavoratoreIsLinked = React.useMemo(
    () =>
      Boolean(card?.lavoratore?.id ?? card?.rapporto?.lavoratore_id) &&
      hasFilledValue(card?.nomeLavoratore ?? "") &&
      card?.nomeLavoratore !== "Lavoratore non associato",
    [card]
  )

  React.useEffect(() => {
    if (!open) return
    setTarget("datore")
  }, [open, card?.id])

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
      } catch {
        if (!isActive) return
        setStatoAssunzioneOptions(
          card?.stage ? [{ value: card.stage, label: card.stage }] : []
        )
        setTipoRapportoOptions(
          card?.tipoRapporto ? [{ value: card.tipoRapporto, label: card.tipoRapporto }] : []
        )
      }
    }

    void loadLookupOptions()

    return () => {
      isActive = false
    }
  }, [card?.stage, card?.tipoRapporto])

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
                <LavoratoreDetail card={card} onLavoratorePatch={saveLavoratorePatch} />
              )}
            </div>
          </section>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
