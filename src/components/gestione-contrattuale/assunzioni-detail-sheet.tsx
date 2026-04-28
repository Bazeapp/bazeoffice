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
import { fetchLookupValues } from "@/lib/anagrafiche-api"
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

function hasFilledValue(value: string | null | undefined) {
  return Boolean(value && value.trim())
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

function RapportoDetailSections({ card }: { card: AssunzioniBoardCardData }) {
  const rapporto = card.rapporto
  const [draft, setDraft] = React.useState(() => ({
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
  }, [card.tipoRapporto, rapporto?.data_inizio_rapporto, rapporto?.ore_a_settimana, rapporto?.paga_mensile_lorda, rapporto?.paga_oraria_lorda, rapporto?.tipo_rapporto])

  const setValue = (key: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))

  return (
    <>
      <DetailSectionBlock
        title="Tipologia di rapporto"
        icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Tipologia di rapporto">
          <Input
            value={draft.tipologiaRapporto}
            onChange={(event) => setValue("tipologiaRapporto", event.target.value)}
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
            value={draft.totaleOreLavorative}
            onChange={(event) => setValue("totaleOreLavorative", event.target.value)}
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
            <Input value={draft.pagaOraria} onChange={(event) => setValue("pagaOraria", event.target.value)} />
          </EditableField>
          <EditableField label="Paga mensile">
            <Input value={draft.pagaMensile} onChange={(event) => setValue("pagaMensile", event.target.value)} />
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
          <Input type="date" value={draft.dataAssunzione} onChange={(event) => setValue("dataAssunzione", event.target.value)} />
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

function DatoreDetail({ card }: { card: AssunzioniBoardCardData }) {
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
      rapportoCorrispondeResidenza: "Si",
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
          <Input value={draft.nome} onChange={(event) => setValue("nome", event.target.value)} />
        </EditableField>
        <EditableField label="Cognome">
          <Input value={draft.cognome} onChange={(event) => setValue("cognome", event.target.value)} />
        </EditableField>
        <EditableField label="Email">
          <Input value={draft.email} onChange={(event) => setValue("email", event.target.value)} />
        </EditableField>
        <EditableField label="Cellulare">
          <Input value={draft.cellulare} onChange={(event) => setValue("cellulare", event.target.value)} />
        </EditableField>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Informazioni generali"
        icon={<UserIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Tipo utente">
          <Input value={draft.tipoUtente} onChange={(event) => setValue("tipoUtente", event.target.value)} />
        </EditableField>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField label="Nome">
            <Input value={draft.nome} onChange={(event) => setValue("nome", event.target.value)} />
          </EditableField>
          <EditableField label="Cognome">
            <Input value={draft.cognome} onChange={(event) => setValue("cognome", event.target.value)} />
          </EditableField>
          <EditableField label="Codice fiscale">
            <Input value={draft.codiceFiscale} onChange={(event) => setValue("codiceFiscale", event.target.value)} />
          </EditableField>
          <EditableField label="Cittadinanza">
            <Input value={draft.cittadinanza} onChange={(event) => setValue("cittadinanza", event.target.value)} />
          </EditableField>
          <EditableField label="Email">
            <Input value={draft.email} onChange={(event) => setValue("email", event.target.value)} />
          </EditableField>
          <EditableField label="Cellulare">
            <Input value={draft.cellulare} onChange={(event) => setValue("cellulare", event.target.value)} />
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

function LavoratoreDetail({ card }: { card: AssunzioniBoardCardData }) {
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
          <Input value={draft.nome} onChange={(event) => setValue("nome", event.target.value)} />
        </EditableField>
        <EditableField label="Cognome">
          <Input value={draft.cognome} onChange={(event) => setValue("cognome", event.target.value)} />
        </EditableField>
        <EditableField label="Email">
          <Input value={draft.email} onChange={(event) => setValue("email", event.target.value)} />
        </EditableField>
        <EditableField label="Cellulare">
          <Input value={draft.cellulare} onChange={(event) => setValue("cellulare", event.target.value)} />
        </EditableField>
        <EditableField label="Cittadinanza">
          <Input value={draft.cittadinanza} onChange={(event) => setValue("cittadinanza", event.target.value)} />
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
          <Input value={draft.tipoUtente} onChange={(event) => setValue("tipoUtente", event.target.value)} />
        </EditableField>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField label="Nome">
            <Input value={draft.nome} onChange={(event) => setValue("nome", event.target.value)} />
          </EditableField>
          <EditableField label="Cognome">
            <Input value={draft.cognome} onChange={(event) => setValue("cognome", event.target.value)} />
          </EditableField>
          <EditableField label="Codice fiscale">
            <Input value={draft.codiceFiscale} onChange={(event) => setValue("codiceFiscale", event.target.value)} />
          </EditableField>
          <EditableField label="Cittadinanza">
            <Input value={draft.cittadinanza} onChange={(event) => setValue("cittadinanza", event.target.value)} />
          </EditableField>
          <EditableField label="Email">
            <Input value={draft.email} onChange={(event) => setValue("email", event.target.value)} />
          </EditableField>
          <EditableField label="Cellulare">
            <Input value={draft.cellulare} onChange={(event) => setValue("cellulare", event.target.value)} />
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
  onOpenChange,
}: {
  card: AssunzioniBoardCardData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [target, setTarget] = React.useState<DetailTarget>("datore")
  const [statoAssunzioneOptions, setStatoAssunzioneOptions] = React.useState<LookupOption[]>([])
  const [tipoRapportoOptions, setTipoRapportoOptions] = React.useState<LookupOption[]>([])
  const makePracticeDraft = React.useCallback(
    () => ({
      statoAssunzione: card?.stage ?? "",
      tipoRapporto: card?.tipoRapporto ?? "",
      deadline: card?.rapporto?.data_inizio_rapporto ?? "",
    }),
    [card?.rapporto?.data_inizio_rapporto, card?.stage, card?.tipoRapporto]
  )
  const [practiceDraft, setPracticeDraft] = React.useState(makePracticeDraft)
  const datoreIsComplete = React.useMemo(
    () =>
      hasFilledValue(card?.famiglia?.nome ?? card?.nomeFamiglia.split(" ")[0] ?? "") &&
      hasFilledValue(card?.famiglia?.cognome ?? card?.nomeFamiglia.split(" ").slice(1).join(" ") ?? "") &&
      hasFilledValue(card?.famiglia?.email ?? "") &&
      hasFilledValue(card?.famiglia?.telefono ?? "") &&
      hasFilledValue(card?.rapporto?.tipo_rapporto ?? card?.tipoRapporto ?? "") &&
      hasFilledValue(
        typeof card?.rapporto?.ore_a_settimana === "number" ? String(card.rapporto.ore_a_settimana) : ""
      ) &&
      hasFilledValue(
        typeof card?.rapporto?.paga_oraria_lorda === "number" ? String(card.rapporto.paga_oraria_lorda) : ""
      ) &&
      hasFilledValue(
        typeof card?.rapporto?.paga_mensile_lorda === "number" ? String(card.rapporto.paga_mensile_lorda) : ""
      ) &&
      hasFilledValue(card?.rapporto?.data_inizio_rapporto ?? ""),
    [card]
  )
  const lavoratoreIsComplete = React.useMemo(
    () =>
      hasFilledValue(card?.lavoratore?.nome ?? card?.nomeLavoratore.split(" ")[0] ?? "") &&
      hasFilledValue(card?.lavoratore?.cognome ?? card?.nomeLavoratore.split(" ").slice(1).join(" ") ?? "") &&
      hasFilledValue(card?.lavoratore?.email ?? "") &&
      hasFilledValue(card?.lavoratore?.telefono ?? "") &&
      hasFilledValue(card?.lavoratore?.nazionalita ?? "") &&
      hasFilledValue(card?.rapporto?.data_inizio_rapporto ?? ""),
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
                contentClassName="grid gap-4 md:grid-cols-3"
              >
                <EditableField label="Stato assunzione">
                  <Select
                    value={practiceDraft.statoAssunzione || undefined}
                    onValueChange={(value) =>
                      setPracticeDraft((current) => ({
                        ...current,
                        statoAssunzione: value,
                      }))
                    }
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
                <EditableField label="Tipo rapporto">
                  <Select
                    value={practiceDraft.tipoRapporto || undefined}
                    onValueChange={(value) =>
                      setPracticeDraft((current) => ({
                        ...current,
                        tipoRapporto: value,
                      }))
                    }
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
                <EditableField label="Deadline">
                  <Input
                    type="date"
                    value={practiceDraft.deadline}
                    onChange={(event) =>
                      setPracticeDraft((current) => ({
                        ...current,
                        deadline: event.target.value,
                      }))
                    }
                  />
                </EditableField>
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

              <RapportoDetailSections card={card} />

              <RadioGroup
                value={target}
                onValueChange={(value) => setTarget(value as DetailTarget)}
                className="grid gap-3 md:grid-cols-2"
              >
                <RelatedSubjectCard
                  role="Datore"
                  name={card.nomeFamiglia}
                  email={card.email}
                  phone={card.telefono}
                  value="datore"
                  selected={target === "datore"}
                  isComplete={datoreIsComplete}
                />
                <RelatedSubjectCard
                  role="Lavoratore"
                  name={card.nomeLavoratore}
                  email={card.lavoratore?.email}
                  phone={card.lavoratore?.telefono}
                  value="lavoratore"
                  selected={target === "lavoratore"}
                  isComplete={lavoratoreIsComplete}
                />
              </RadioGroup>

              {target === "datore" ? <DatoreDetail card={card} /> : <LavoratoreDetail card={card} />}
            </div>
          </section>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
