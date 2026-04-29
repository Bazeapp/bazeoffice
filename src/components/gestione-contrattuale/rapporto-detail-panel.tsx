import * as React from "react"
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CopyIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  FileTextIcon,
  MailIcon,
  MessageSquareTextIcon,
  OctagonAlertIcon,
  PencilIcon,
  PhoneIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  TriangleAlertIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"

import { getTagClassName } from "@/features/lavoratori/lib/lookup-utils"
import { getRapportoFamilyLabel, getRapportoTitle, getRapportoWorkerLabel } from "@/features/rapporti/rapporti-labels"
import { getRapportoStatusColor, resolveRapportoStatus } from "@/features/rapporti/rapporti-status"
import {
  AttachmentUploadSlot,
} from "@/components/shared-next/attachment-upload-slot"
import {
  hasAttachmentValue,
  type AttachmentLink,
} from "@/components/shared-next/attachment-utils"
import {
  DetailField,
  DetailFieldControl,
  DetailSectionBlock,
  DetailSectionCard,
} from "@/components/shared-next/detail-section-card"
import { RecordDetailShell } from "@/components/shared-next/record-detail-shell"
import {
  ContributoInpsDetailSheet,
  type ContributiColumnData,
} from "@/components/payroll/contributi-inps-view"
import {
  CedolinoDetailSheet,
} from "@/components/payroll/payroll-overview-view"
import { SupportTicketCreateDialog } from "@/components/support/support-ticket-create-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { updateRecord } from "@/lib/anagrafiche-api"
import {
  buildAttachmentPayload,
  normalizeAttachmentArray,
} from "@/lib/attachments"
import { supabase } from "@/lib/supabase-client"
import { buildPathForRoute } from "@/routes/app-routes"
import type {
  ChiusuraContrattoRecord,
  ContributoInpsRecord,
  FamigliaRecord,
  LavoratoreRecord,
  MeseCalendarioRecord,
  MeseLavoratoRecord,
  PagamentoRecord,
  PresenzaMensileRecord,
  ProcessoMatchingRecord,
  RapportoLavorativoRecord,
  TicketRecord,
  VariazioneContrattualeRecord,
} from "@/types"
import type { PayrollBoardCardData, PayrollBoardColumnData } from "@/hooks/use-payroll-board"
import type { ContributoInpsBoardCardData } from "@/hooks/use-contributi-inps-board"
import type {
  SupportTicketTag,
  SupportTicketType,
  SupportTicketUrgency,
} from "@/components/support/support-ticket-config"

type RapportoDetailPanelProps = {
  rapporto: RapportoLavorativoRecord | null
  famiglia: FamigliaRecord | null
  lavoratore: LavoratoreRecord | null
  processi: ProcessoMatchingRecord[]
  contributi: ContributoInpsRecord[]
  mesi: MeseLavoratoRecord[]
  mesiCalendario: MeseCalendarioRecord[]
  pagamenti: PagamentoRecord[]
  presenze: PresenzaMensileRecord[]
  variazioni: VariazioneContrattualeRecord[]
  chiusure: ChiusuraContrattoRecord[]
  tickets?: TicketRecord[]
  loadingRelated: boolean
  lookupColorsByDomain: Map<string, string>
  onCreateTicket?: (input: {
    tipo: SupportTicketType
    rapportoId: string
    tag: SupportTicketTag
    urgenza: SupportTicketUrgency
    causale: string
    note: string
  }) => Promise<void>
  hideHeader?: boolean
}

type SectionTab = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const SECTION_TABS: SectionTab[] = [
  { id: "contratto", label: "Contratto", icon: BriefcaseBusinessIcon },
  { id: "gestione", label: "Datore e Lavoratore", icon: UsersIcon },
  { id: "tickets", label: "Tickets", icon: MessageSquareTextIcon },
  { id: "cedolini", label: "Cedolini", icon: CreditCardIcon },
  { id: "contributi", label: "Contributi", icon: CalendarDaysIcon },
  { id: "variazioni", label: "Variazioni", icon: RefreshCwIcon },
  { id: "chiusure", label: "Chiusure", icon: TriangleAlertIcon },
]

const PAYROLL_STAGE_OPTIONS = [
  "TODO",
  "Inviate richiesta presenze",
  "Follow up richiesta presenze",
  "Followup fatti",
  "Problema in comunicazione presenze",
  "Ricezione presenze",
  "Cedolino da controllare",
  "Cedolino Pronto",
  "Inviato cedolino",
  "Richiesta chiarimenti",
  "Pagato",
] as const

const CONTRIBUTI_STAGE_OPTIONS = [
  { id: "Da richiedere", label: "Da richiedere", color: "sky" },
  { id: "PagoPA ricevuto", label: "PagoPA ricevuto", color: "cyan" },
  { id: "Inviato alla famiglia", label: "Inviato alla famiglia", color: "amber" },
  { id: "Pagato", label: "Pagato", color: "green" },
] as const

function normalizeToken(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replaceAll("_", " ")
}

function formatDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatCurrency(value: number | null) {
  if (typeof value !== "number") return "-"
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDateTime(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function getStatusColor(value: string | null | undefined) {
  const token = normalizeToken(value)
  if (!token) return "zinc"
  if (token.includes("attivo")) return "emerald"
  if (token.includes("attiv") || token.includes("in corso") || token.includes("presa in carico")) {
    return "amber"
  }
  if (token.includes("pagato") || token.includes("effettuata") || token.includes("inviato")) {
    return "emerald"
  }
  if (token.includes("todo") || token.includes("to do")) return "sky"
  if (token.includes("chius") || token.includes("annull") || token.includes("cess")) return "zinc"
  return "sky"
}

function sanitizeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
}

function buildDistributionItems(source: string | null, totalHours: number | null) {
  const days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
  const hourMatches = source?.match(/(\d+(?:[.,]\d+)?)h?/g) ?? []
  const parsed = hourMatches.map((item) => Number.parseFloat(item.replace("h", "").replace(",", ".")))

  if (parsed.length >= 7) {
    return days.map((day, index) => ({
      day,
      value: `${Math.round(parsed[index] ?? 0)}h`,
    }))
  }

  if (typeof totalHours !== "number" || !Number.isFinite(totalHours)) {
    return days.map((day) => ({ day, value: "-" }))
  }

  const base = Math.floor(totalHours / 7)
  const remainder = Math.round(totalHours - base * 7)
  return days.map((day, index) => ({
    day,
    value: `${base + (index < remainder ? 1 : 0)}h`,
  }))
}

function getDurationLabel(startDate: string | null, endDate: string | null = null) {
  if (!startDate) return "-"
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-"
  const diffDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  return `${diffDays} giorni`
}

function getMonthLabel(mese: MeseLavoratoRecord, meseCalendario: MeseCalendarioRecord | null) {
  if (meseCalendario?.mese_lavorativo_copy?.trim()) {
    return meseCalendario.mese_lavorativo_copy.trim()
  }

  if (meseCalendario?.data_inizio) {
    const date = new Date(meseCalendario.data_inizio)
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("it-IT", {
        month: "long",
        year: "numeric",
      }).format(date)
    }
  }

  return formatDate(mese.creato_il)
}

function getPresenceSummary(value: PresenzaMensileRecord | null) {
  if (!value || typeof value.presenze_mensili !== "number") return "Presenze non disponibili"
  return `${value.presenze_mensili} presenze`
}

function getContributoTitle(record: ContributoInpsRecord) {
  const metadata =
    record.metadati_migrazione && typeof record.metadati_migrazione === "object"
      ? record.metadati_migrazione
      : null
  const quarterLabel =
    typeof metadata?.trimestre_label === "string" && metadata.trimestre_label.trim()
      ? metadata.trimestre_label.trim()
      : typeof metadata?.trimestre === "string" && metadata.trimestre.trim()
        ? metadata.trimestre.trim()
        : null

  return quarterLabel ?? "Contributo INPS"
}

function copyToClipboard(value: string | null | undefined) {
  if (!value) return
  void navigator.clipboard?.writeText(value)
}

function RelatedPersonCard({
  role,
  name,
  email,
  phone,
  href,
}: {
  role: string
  name: string
  email: string | null | undefined
  phone: string | null | undefined
  href?: string
}) {
  return (
    <Card className="py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <CardContent className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
              <UserIcon className="text-muted-foreground size-4" />
            </div>
            <div className="min-w-0">
              <p className="ui-type-label">{role}</p>
              <p className="ui-type-value truncate">{name}</p>
            </div>
          </div>
          {href ? (
            <Button asChild variant="ghost" size="icon-sm">
              <a href={href} title={`Apri ${role.toLowerCase()}`}>
                <ExternalLinkIcon className="size-4" />
              </a>
            </Button>
          ) : null}
        </div>
        <div className="mt-3 space-y-1.5 pl-11 text-sm">
          <button
            type="button"
            onClick={() => copyToClipboard(email)}
            className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-left transition-colors"
          >
            <MailIcon className="size-4" />
            <span className="truncate">{email ?? "-"}</span>
            {email ? <CopyIcon className="size-3.5 opacity-50" /> : null}
          </button>
          <button
            type="button"
            onClick={() => copyToClipboard(phone)}
            className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-left transition-colors"
          >
            <PhoneIcon className="size-4" />
            <span>{phone ?? "-"}</span>
            {phone ? <CopyIcon className="size-3.5 opacity-50" /> : null}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

function ListRowCard({
  title,
  subtitle,
  rightBadge,
  trailing,
  onClick,
}: {
  title: string
  subtitle?: string
  rightBadge?: string
  trailing?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Card
      className={cn(
        "bg-surface py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:bg-neutral-100",
        onClick ? "cursor-pointer" : "",
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          {subtitle ? <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {rightBadge ? (
            <Badge className={getTagClassName(getStatusColor(rightBadge))}>{rightBadge}</Badge>
          ) : null}
          {trailing}
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyLinkedState({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="py-8 text-center">
      <div className="text-muted-foreground/35 mx-auto mb-2 flex size-10 items-center justify-center">
        {icon}
      </div>
      <p className="ui-type-meta">{label}</p>
    </div>
  )
}

export function RapportoDetailPanel({
  rapporto,
  famiglia,
  lavoratore,
  processi,
  contributi,
  mesi,
  mesiCalendario,
  pagamenti,
  presenze,
  variazioni,
  chiusure,
  tickets = [],
  loadingRelated,
  lookupColorsByDomain,
  onCreateTicket,
  hideHeader = false,
}: RapportoDetailPanelProps) {
  const detailScrollRef = React.useRef<HTMLElement | null>(null)
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
  const [activeSection, setActiveSection] = React.useState<string>("contratto")
  const isScrollingByClickRef = React.useRef(false)
  const [selectedPreview, setSelectedPreview] = React.useState<AttachmentLink | null>(null)
  const [uploadingSlot, setUploadingSlot] = React.useState<string | null>(null)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [editingSection, setEditingSection] = React.useState<"contratto" | null>(null)
  const [savingContratto, setSavingContratto] = React.useState(false)
  const [selectedCedolinoId, setSelectedCedolinoId] = React.useState<string | null>(null)
  const [selectedContributoId, setSelectedContributoId] = React.useState<string | null>(null)
  const [isCreateTicketOpen, setIsCreateTicketOpen] = React.useState(false)
  const [rapportoState, setRapportoState] = React.useState<RapportoLavorativoRecord | null>(rapporto)
  const autosaveTimeoutRef = React.useRef<number | null>(null)
  const [rapportoDraft, setRapportoDraft] = React.useState(() => ({
    tipo_contratto_durata: rapporto?.tipo_contratto_durata ?? "",
    tipo_contratto: rapporto?.tipo_contratto ?? "",
    tipo_rapporto: rapporto?.tipo_rapporto ?? "",
    ore_a_settimana:
      typeof rapporto?.ore_a_settimana === "number" ? String(rapporto.ore_a_settimana) : "",
    data_inizio_rapporto: rapporto?.data_inizio_rapporto ?? "",
    stato_assunzione: rapporto?.stato_assunzione ?? "",
    relazione_lavorativa: rapporto?.relazione_lavorativa ?? "",
    paga_oraria_lorda:
      typeof rapporto?.paga_oraria_lorda === "number" ? String(rapporto.paga_oraria_lorda) : "",
    paga_mensile_lorda:
      typeof rapporto?.paga_mensile_lorda === "number" ? String(rapporto.paga_mensile_lorda) : "",
    codice_datore_webcolf:
      typeof rapporto?.codice_datore_webcolf === "number" ? String(rapporto.codice_datore_webcolf) : "",
    codice_dipendente_webcolf:
      typeof rapporto?.codice_dipendente_webcolf === "number" ? String(rapporto.codice_dipendente_webcolf) : "",
  }))

  React.useEffect(() => {
    setRapportoState(rapporto)
    setSelectedCedolinoId(null)
    setSelectedContributoId(null)
    setRapportoDraft({
      tipo_contratto_durata: rapporto?.tipo_contratto_durata ?? "",
      tipo_contratto: rapporto?.tipo_contratto ?? "",
      tipo_rapporto: rapporto?.tipo_rapporto ?? "",
      ore_a_settimana:
        typeof rapporto?.ore_a_settimana === "number" ? String(rapporto.ore_a_settimana) : "",
      data_inizio_rapporto: rapporto?.data_inizio_rapporto ?? "",
      stato_assunzione: rapporto?.stato_assunzione ?? "",
      relazione_lavorativa: rapporto?.relazione_lavorativa ?? "",
      paga_oraria_lorda:
        typeof rapporto?.paga_oraria_lorda === "number" ? String(rapporto.paga_oraria_lorda) : "",
      paga_mensile_lorda:
        typeof rapporto?.paga_mensile_lorda === "number" ? String(rapporto.paga_mensile_lorda) : "",
      codice_datore_webcolf:
        typeof rapporto?.codice_datore_webcolf === "number" ? String(rapporto.codice_datore_webcolf) : "",
      codice_dipendente_webcolf:
        typeof rapporto?.codice_dipendente_webcolf === "number" ? String(rapporto.codice_dipendente_webcolf) : "",
    })
    setEditingSection(null)
    setSavingContratto(false)
    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current)
      autosaveTimeoutRef.current = null
    }
  }, [rapporto])

  React.useEffect(() => {
    const container = detailScrollRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingByClickRef.current) return
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          const sectionId = visible[0].target.getAttribute("data-section-id")
          if (sectionId) setActiveSection(sectionId)
        }
      },
      { root: container, rootMargin: "-120px 0px -60% 0px", threshold: 0 }
    )

    Object.values(sectionRefs.current).forEach((element) => {
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [rapporto])

  const setSectionRef = React.useCallback(
    (sectionId: string) => (element: HTMLDivElement | null) => {
      if (element) {
        element.setAttribute("data-section-id", sectionId)
        sectionRefs.current[sectionId] = element
      } else {
        delete sectionRefs.current[sectionId]
      }
    },
    []
  )

  const scrollToSection = React.useCallback((sectionId: string) => {
    setActiveSection(sectionId)
    isScrollingByClickRef.current = true
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth", block: "start" })
    window.setTimeout(() => {
      isScrollingByClickRef.current = false
    }, 700)
  }, [])

  const handleUploadRapportoAttachment = React.useCallback(
    async (
      slot: "accordo_di_lavoro_allegati" | "ricevuta_inps_allegati" | "delega_inps_allegati",
      file: File
    ) => {
      const rapportoRecord = rapportoState ?? rapporto
      if (!rapportoRecord) return

      setUploadError(null)
      setUploadingSlot(slot)

      const rapportoMetadata =
        rapportoRecord.metadati_migrazione && typeof rapportoRecord.metadati_migrazione === "object"
          ? rapportoRecord.metadati_migrazione
          : {}

      try {
        const safeName = sanitizeFileName(file.name || "documento")
        const storagePath = [
          "rapporti_lavorativi",
          rapportoRecord.id,
          slot,
          `${Date.now()}-${safeName}`,
        ].join("/")

        const uploadResult = await supabase.storage
          .from("baze-bucket")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          })

        if (uploadResult.error) {
          throw uploadResult.error
        }

        const payload = buildAttachmentPayload(file, storagePath)

        if (slot === "delega_inps_allegati") {
          const nextMetadata = {
            ...(typeof rapportoMetadata === "object" ? rapportoMetadata : {}),
            delega_inps_allegati: [
              ...normalizeAttachmentArray(
                (rapportoMetadata as Record<string, unknown>)?.delega_inps_allegati,
              ),
              payload,
            ],
          }
          const response = await updateRecord("rapporti_lavorativi", rapportoRecord.id, {
            metadati_migrazione: nextMetadata,
          })
          setRapportoState(response.row as RapportoLavorativoRecord)
        } else {
          const response = await updateRecord("rapporti_lavorativi", rapportoRecord.id, {
            [slot]: [...normalizeAttachmentArray(rapportoRecord[slot]), payload],
          })
          setRapportoState(response.row as RapportoLavorativoRecord)
        }
      } catch (caughtError) {
        setUploadError(
          caughtError instanceof Error ? caughtError.message : "Errore caricando allegato"
        )
      } finally {
        setUploadingSlot(null)
      }
    },
    [rapporto, rapportoState]
  )

  const setDraftValue = React.useCallback(
    (field: keyof typeof rapportoDraft, value: string) => {
      setRapportoDraft((current) => ({ ...current, [field]: value }))
    },
    []
  )

  const currentRapporto = rapportoState ?? rapporto

  const buildContrattoPatch = React.useCallback(
    () => ({
      tipo_contratto_durata: rapportoDraft.tipo_contratto_durata || null,
      tipo_contratto: rapportoDraft.tipo_contratto || null,
      tipo_rapporto: rapportoDraft.tipo_rapporto || null,
      ore_a_settimana: rapportoDraft.ore_a_settimana ? Number(rapportoDraft.ore_a_settimana) : null,
      data_inizio_rapporto: rapportoDraft.data_inizio_rapporto || null,
      stato_assunzione: rapportoDraft.stato_assunzione || null,
      relazione_lavorativa: rapportoDraft.relazione_lavorativa || null,
      paga_oraria_lorda: rapportoDraft.paga_oraria_lorda ? Number(rapportoDraft.paga_oraria_lorda) : null,
      paga_mensile_lorda: rapportoDraft.paga_mensile_lorda ? Number(rapportoDraft.paga_mensile_lorda) : null,
      codice_datore_webcolf: rapportoDraft.codice_datore_webcolf
        ? Number(rapportoDraft.codice_datore_webcolf)
        : null,
      codice_dipendente_webcolf: rapportoDraft.codice_dipendente_webcolf
        ? Number(rapportoDraft.codice_dipendente_webcolf)
        : null,
    }),
    [rapportoDraft]
  )

  const getChangedContrattoPatch = React.useCallback(() => {
    if (!currentRapporto) return {}

    const nextValues = buildContrattoPatch()
    const patch: Record<string, string | number | null> = {}

    for (const [key, nextValue] of Object.entries(nextValues)) {
      const currentValue = currentRapporto[key as keyof RapportoLavorativoRecord] ?? null
      if (currentValue !== nextValue) {
        patch[key] = nextValue
      }
    }

    return patch
  }, [buildContrattoPatch, currentRapporto])

  const persistContrattoChanges = React.useCallback(async () => {
    if (!currentRapporto) return

    const patch = getChangedContrattoPatch()
    if (Object.keys(patch).length === 0) return

    setSavingContratto(true)
    setRapportoState((previous) => (previous ? { ...previous, ...patch } : previous))

    try {
      await updateRecord("rapporti_lavorativi", currentRapporto.id, patch)
    } finally {
      setSavingContratto(false)
    }
  }, [currentRapporto, getChangedContrattoPatch])

  React.useEffect(() => {
    if (editingSection !== "contratto") return

    const patch = getChangedContrattoPatch()
    if (Object.keys(patch).length === 0) return

    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current)
    }

    autosaveTimeoutRef.current = window.setTimeout(() => {
      void persistContrattoChanges()
      autosaveTimeoutRef.current = null
    }, 500)

    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current)
        autosaveTimeoutRef.current = null
      }
    }
  }, [editingSection, getChangedContrattoPatch, persistContrattoChanges])

  if (!rapporto) {
    return (
      <DetailSectionCard
        title="Dettaglio rapporto"
        titleIcon={<BriefcaseBusinessIcon className="size-5" />}
        className="h-full"
        contentClassName="flex h-full items-center justify-center"
      >
        <p className="text-muted-foreground text-sm">
          Seleziona un rapporto lavorativo dalla lista per vedere il dettaglio.
        </p>
      </DetailSectionCard>
    )
  }

  const rapportoView = currentRapporto ?? rapporto
  const familyName = getRapportoFamilyLabel(rapportoView, famiglia)
  const workerName = getRapportoWorkerLabel(rapportoView, lavoratore)
  const relationshipTitle = getRapportoTitle(rapportoView, { famiglia, lavoratore })
  const distributionItems = buildDistributionItems(
    rapportoView.distribuzione_ore_settimana,
    rapportoView.ore_a_settimana
  )
  const rapportoMetadata =
    rapportoView.metadati_migrazione && typeof rapportoView.metadati_migrazione === "object"
      ? rapportoView.metadati_migrazione
      : {}
  const delegaInpsValue =
    typeof rapportoMetadata === "object" && rapportoMetadata
      ? (rapportoMetadata as Record<string, unknown>).delega_inps_allegati ?? null
      : null
  const hasAccordoDiLavoro = hasAttachmentValue(rapportoView.accordo_di_lavoro_allegati)
  const hasRicevutaInps = hasAttachmentValue(rapportoView.ricevuta_inps_allegati)
  const hasDelegaInps = hasAttachmentValue(delegaInpsValue)
  const startDateLabel = formatDate(rapportoView.data_inizio_rapporto)
  const rapportoStatus = resolveRapportoStatus(
    rapportoView,
    chiusure[0]?.data_fine_rapporto ?? rapportoView.data_fine_rapporto
  )
  const statoRapportoColor =
    lookupColorsByDomain.get(
      `rapporti_lavorativi.stato_rapporto:${normalizeToken(rapportoStatus)}`
    ) ?? getRapportoStatusColor(rapportoStatus)
  const meseCalendarioById = new Map(mesiCalendario.map((item) => [item.id, item]))
  const pagamentiByTicketId = new Map(
    pagamenti
      .filter((item) => item.ticket_id)
      .map((item) => [item.ticket_id as string, item])
  )
  const presenzeById = new Map(presenze.map((item) => [item.id, item]))
  const sortedMesi = [...mesi].sort((left, right) => {
    const leftDate =
      (left.mese_id ? meseCalendarioById.get(left.mese_id)?.data_inizio : null) ??
      left.creato_il ??
      ""
    const rightDate =
      (right.mese_id ? meseCalendarioById.get(right.mese_id)?.data_inizio : null) ??
      right.creato_il ??
      ""
    return rightDate.localeCompare(leftDate)
  })
  const cedolinoCards = sortedMesi.map((mese) => {
    const meseCalendario = mese.mese_id ? meseCalendarioById.get(mese.mese_id) ?? null : null
    const pagamento = mese.ticket_id ? pagamentiByTicketId.get(mese.ticket_id) ?? null : null
    const presenzeMese = mese.presenze_id ? presenzeById.get(mese.presenze_id) ?? null : null
    const presenzeRegolari = mese.presenze_regolare_id
      ? presenzeById.get(mese.presenze_regolare_id) ?? null
      : null
    const nomeCompleto =
      [rapportoView.cognome_nome_datore_proper, rapportoView.nome_lavoratore_per_url]
        .filter(Boolean)
        .join(" – ")
        .trim() || "Rapporto non disponibile"

    return {
      id: mese.id,
      stage: mese.stato_mese_lavorativo ?? "TODO",
      record: mese,
      famiglia,
      pagamento,
      presenze: presenzeMese,
      presenzeRegolari,
      rapporto: rapportoView,
      mese: meseCalendario,
      nomeCompleto,
      importoLabel: typeof mese.importo_busta_estratto === "number" ? formatCurrency(mese.importo_busta_estratto) : null,
      dataInvioLabel: mese.data_invio_famiglia ? formatDate(mese.data_invio_famiglia) : null,
    } satisfies PayrollBoardCardData
  })
  const cedolinoColumns: PayrollBoardColumnData[] = PAYROLL_STAGE_OPTIONS.map((stage) => ({
    id: stage,
    label: stage,
    color: "sky",
    cards: cedolinoCards.filter((card) => card.stage === stage),
  }))
  const selectedCedolino = cedolinoCards.find((card) => card.id === selectedCedolinoId) ?? null
  const contributoCards: ContributoInpsBoardCardData[] = contributi.map((contributo) => {
    const nomeFamiglia = rapportoView.cognome_nome_datore_proper?.trim() || "Famiglia non disponibile"
    const nomeLavoratore = rapportoView.nome_lavoratore_per_url?.trim() || "Lavoratore non disponibile"

    return {
      id: contributo.id,
      stage: contributo.stato_contributi_inps ?? CONTRIBUTI_STAGE_OPTIONS[0].id,
      record: contributo,
      rapporto: rapportoView,
      trimestre: null,
      nomeFamiglia,
      nomeLavoratore,
      nomeCompleto: `${nomeFamiglia} – ${nomeLavoratore}`,
      trimestreLabel: getContributoTitle(contributo),
      importoLabel:
        typeof contributo.importo_contributi_inps === "number"
          ? formatCurrency(contributo.importo_contributi_inps)
          : null,
      pagopaLabel:
        typeof contributo.valore_pagopa === "number" ? formatCurrency(contributo.valore_pagopa) : null,
    } satisfies ContributoInpsBoardCardData
  })
  const contributoColumns: ContributiColumnData[] = CONTRIBUTI_STAGE_OPTIONS.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: contributoCards.filter((card) => card.stage === stage.id),
  }))
  const selectedContributo =
    contributoCards.find((card) => card.id === selectedContributoId) ?? null

  const headerContent = (
    <div className="space-y-3">
      <div>
        <h2 className="truncate text-xl leading-tight font-semibold">{relationshipTitle}</h2>
        <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {famiglia?.email ? <span>{famiglia.email}</span> : null}
          {famiglia?.email && startDateLabel !== "-" ? <span>•</span> : null}
          {startDateLabel !== "-" ? <span>dal {startDateLabel}</span> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className={getTagClassName(statoRapportoColor)}>
          {rapportoStatus}
        </Badge>
        {rapportoView.stato_servizio ? (
          <Badge variant="outline" className="h-6 rounded-full px-2.5 text-2xs font-medium">
            {rapportoView.stato_servizio}
          </Badge>
        ) : null}
        {rapportoView.tipo_rapporto ? (
          <Badge variant="outline" className="h-6 rounded-full px-2.5 text-2xs font-medium">
            {rapportoView.tipo_rapporto}
          </Badge>
        ) : null}
        {rapportoView.tipo_contratto ? (
          <Badge variant="secondary" className="h-6 rounded-full px-2.5 text-2xs font-medium">
            {rapportoView.tipo_contratto}
          </Badge>
        ) : null}
      </div>
    </div>
  )

  return (
    <RecordDetailShell
      sectionRef={detailScrollRef}
      tabs={SECTION_TABS}
      activeSection={activeSection}
      onSectionChange={scrollToSection}
      header={hideHeader ? undefined : headerContent}
      embedded={hideHeader}
    >
      <>
        <div className="space-y-6 text-sm">
          <div ref={setSectionRef("contratto")}>
            <DetailSectionBlock
              title="Caratteristiche del rapporto"
              icon={<BriefcaseBusinessIcon className="size-5" />}
              action={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={savingContratto}
                  onClick={async () => {
                    if (editingSection === "contratto") {
                      if (autosaveTimeoutRef.current) {
                        window.clearTimeout(autosaveTimeoutRef.current)
                        autosaveTimeoutRef.current = null
                      }
                      await persistContrattoChanges()
                      setEditingSection(null)
                      return
                    }

                    setEditingSection("contratto")
                  }}
                  aria-label={
                    editingSection === "contratto"
                      ? "Chiudi modifica caratteristiche del rapporto"
                      : "Modifica caratteristiche del rapporto"
                  }
                  title={
                    editingSection === "contratto"
                      ? "Chiudi modifica caratteristiche del rapporto"
                      : "Modifica caratteristiche del rapporto"
                  }
                >
                  <PencilIcon className="size-4" />
                </Button>
              }
            >
              <div className="space-y-4">
                {editingSection === "contratto" ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <DetailFieldControl label="Tipo durata">
                      <Select
                        value={rapportoDraft.tipo_contratto_durata || "__empty__"}
                        disabled
                        onValueChange={(value) =>
                          setDraftValue("tipo_contratto_durata", value === "__empty__" ? "" : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona tipo durata" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty__">Non impostato</SelectItem>
                          <SelectItem value="Determinato">Determinato</SelectItem>
                          <SelectItem value="Indeterminato">Indeterminato</SelectItem>
                          {rapportoDraft.tipo_contratto_durata &&
                          !["Determinato", "Indeterminato"].includes(rapportoDraft.tipo_contratto_durata) ? (
                            <SelectItem value={rapportoDraft.tipo_contratto_durata}>
                              {rapportoDraft.tipo_contratto_durata}
                            </SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </DetailFieldControl>
                    <DetailFieldControl label="Tipo contratto">
                      <Input
                        value={rapportoDraft.tipo_contratto}
                        readOnly
                        onChange={(event) => setDraftValue("tipo_contratto", event.target.value)}
                      />
                    </DetailFieldControl>
                    <DetailFieldControl label="Tipo rapporto">
                      <Select
                        value={rapportoDraft.tipo_rapporto || "__empty__"}
                        disabled
                        onValueChange={(value) =>
                          setDraftValue("tipo_rapporto", value === "__empty__" ? "" : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona tipo rapporto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty__">Non impostato</SelectItem>
                          <SelectItem value="Lavoro ad ore">Lavoro ad ore</SelectItem>
                          <SelectItem value="Part time">Part time</SelectItem>
                          <SelectItem value="Convivente">Convivente</SelectItem>
                          <SelectItem value="Non convivente full-time">Non convivente full-time</SelectItem>
                          {rapportoDraft.tipo_rapporto &&
                          ![
                            "Lavoro ad ore",
                            "Part time",
                            "Convivente",
                            "Non convivente full-time",
                          ].includes(rapportoDraft.tipo_rapporto) ? (
                            <SelectItem value={rapportoDraft.tipo_rapporto}>
                              {rapportoDraft.tipo_rapporto}
                            </SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </DetailFieldControl>
                    <DetailFieldControl label="Ore settimanali">
                      <Input
                        type="number"
                        value={rapportoDraft.ore_a_settimana}
                        readOnly
                        onChange={(event) => setDraftValue("ore_a_settimana", event.target.value)}
                      />
                    </DetailFieldControl>
                    <DetailFieldControl label="Data inizio">
                      <Input
                        type="date"
                        value={rapportoDraft.data_inizio_rapporto.slice(0, 10)}
                        readOnly
                        onChange={(event) => setDraftValue("data_inizio_rapporto", event.target.value)}
                      />
                    </DetailFieldControl>
                    <DetailField label="Durata" value={getDurationLabel(rapportoDraft.data_inizio_rapporto || null)} />
                    <DetailFieldControl label="Stato assunzione">
                      <Input
                        value={rapportoDraft.stato_assunzione}
                        readOnly
                        onChange={(event) => setDraftValue("stato_assunzione", event.target.value)}
                      />
                    </DetailFieldControl>
                    <DetailFieldControl label="Relazione lavorativa">
                      <Input
                        value={rapportoDraft.relazione_lavorativa}
                        readOnly
                        onChange={(event) => setDraftValue("relazione_lavorativa", event.target.value)}
                      />
                    </DetailFieldControl>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <DetailField label="Tipo durata" value={rapportoView.tipo_contratto_durata ?? "-"} />
                    <DetailField label="Tipo contratto" value={rapportoView.tipo_contratto ?? "-"} />
                    <DetailField label="Tipo rapporto" value={rapportoView.tipo_rapporto ?? "-"} />
                    <DetailField
                      label="Ore settimanali"
                      value={
                        typeof rapportoView.ore_a_settimana === "number"
                          ? `${rapportoView.ore_a_settimana}h`
                          : "-"
                      }
                    />
                    <DetailField label="Data inizio" value={startDateLabel} />
                    <DetailField label="Durata" value={getDurationLabel(rapportoView.data_inizio_rapporto)} />
                    <DetailField label="Stato assunzione" value={rapportoView.stato_assunzione ?? "-"} />
                    <DetailField label="Relazione lavorativa" value={rapportoView.relazione_lavorativa ?? "-"} />
                  </div>
                )}
              </div>

              <Separator className="bg-border/60" />

              <div className="space-y-3">
                <p className="ui-type-label">Distribuzione ore</p>
                <div className="flex flex-wrap gap-2">
                  {distributionItems.map((item) => (
                    <div
                      key={item.day}
                      className="flex min-w-14 flex-col items-center rounded-xl border bg-surface px-2.5 py-2"
                    >
                      <span className="ui-type-label normal-case tracking-normal">{item.day}</span>
                      <span className="ui-type-value mt-1">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/60" />

              <div className="space-y-4">
                {editingSection === "contratto" ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <DetailFieldControl label="Paga oraria lorda">
                      <Input
                        type="number"
                        step="0.01"
                        value={rapportoDraft.paga_oraria_lorda}
                        readOnly
                        onChange={(event) => setDraftValue("paga_oraria_lorda", event.target.value)}
                      />
                    </DetailFieldControl>
                    <DetailFieldControl label="Paga mensile lorda">
                      <Input
                        type="number"
                        step="0.01"
                        value={rapportoDraft.paga_mensile_lorda}
                        readOnly
                        onChange={(event) => setDraftValue("paga_mensile_lorda", event.target.value)}
                      />
                    </DetailFieldControl>
                    <DetailFieldControl label="Cod. rapporto Webcolf">
                      <Input
                        type="number"
                        value={rapportoDraft.codice_datore_webcolf}
                        onChange={(event) => setDraftValue("codice_datore_webcolf", event.target.value)}
                      />
                    </DetailFieldControl>
                    <DetailFieldControl label="Cod. lavoratore Webcolf">
                      <Input
                        type="number"
                        value={rapportoDraft.codice_dipendente_webcolf}
                        onChange={(event) => setDraftValue("codice_dipendente_webcolf", event.target.value)}
                      />
                    </DetailFieldControl>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <DetailField label="Paga oraria lorda" value={formatCurrency(rapportoView.paga_oraria_lorda)} />
                    <DetailField label="Paga mensile lorda" value={formatCurrency(rapportoView.paga_mensile_lorda)} />
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
                  </div>
                )}
              </div>
            </DetailSectionBlock>
          </div>

          <div ref={setSectionRef("gestione")}>
            <DetailSectionBlock
              title="Datore e lavoratore"
              icon={<UsersIcon className="size-5" />}
            >
              {loadingRelated ? (
                <p className="text-muted-foreground text-sm">Caricamento record collegati...</p>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <RelatedPersonCard
                      role="Datore"
                      name={familyName}
                      email={famiglia?.email}
                      phone={famiglia?.telefono}
                      href={
                        famiglia
                          ? buildPathForRoute({
                              mainSection: "anagrafiche",
                              anagraficheTab: "famiglie",
                              ricercaProcessId: null,
                            })
                          : undefined
                      }
                    />
                    <RelatedPersonCard
                      role="Lavoratore"
                      name={workerName}
                      email={lavoratore?.email}
                      phone={lavoratore?.telefono}
                      href={
                        lavoratore
                          ? buildPathForRoute({
                              mainSection: "lavoratori_cerca",
                              anagraficheTab: "famiglie",
                              ricercaProcessId: null,
                            })
                          : undefined
                      }
                    />
                  </div>

                  <Separator className="bg-border/60" />

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileTextIcon className="text-muted-foreground size-4" />
                        <span className="text-2xs font-semibold">Accordo di lavoro</span>
                        {hasAccordoDiLavoro ? (
                          <CheckCircle2Icon className="size-4 text-green-600" />
                        ) : (
                          <OctagonAlertIcon className="size-4 text-red-500" />
                        )}
                      </div>
                      <AttachmentUploadSlot
                        label="Accordo di lavoro"
                        value={rapportoView.accordo_di_lavoro_allegati}
                        onAdd={(file) => void handleUploadRapportoAttachment("accordo_di_lavoro_allegati", file)}
                        onPreviewOpen={setSelectedPreview}
                        isUploading={uploadingSlot === "accordo_di_lavoro_allegati"}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileTextIcon className="text-muted-foreground size-4" />
                        <span className="text-2xs font-semibold">Ricevuta INPS</span>
                        {hasRicevutaInps ? (
                          <CheckCircle2Icon className="size-4 text-green-600" />
                        ) : (
                          <OctagonAlertIcon className="size-4 text-red-500" />
                        )}
                      </div>
                      <AttachmentUploadSlot
                        label="Ricevuta INPS"
                        value={rapportoView.ricevuta_inps_allegati}
                        onAdd={(file) => void handleUploadRapportoAttachment("ricevuta_inps_allegati", file)}
                        onPreviewOpen={setSelectedPreview}
                        isUploading={uploadingSlot === "ricevuta_inps_allegati"}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileTextIcon className="text-muted-foreground size-4" />
                        <span className="text-2xs font-semibold">Delega INPS</span>
                        {hasDelegaInps ? (
                          <CheckCircle2Icon className="size-4 text-green-600" />
                        ) : (
                          <OctagonAlertIcon className="size-4 text-red-500" />
                        )}
                      </div>
                      <AttachmentUploadSlot
                        label="Delega INPS"
                        value={delegaInpsValue}
                        onAdd={(file) => void handleUploadRapportoAttachment("delega_inps_allegati", file)}
                        onPreviewOpen={setSelectedPreview}
                        isUploading={uploadingSlot === "delega_inps_allegati"}
                      />
                    </div>
                  </div>

                  {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}

                  {processi.length > 0 ? (
                    <>
                      <Separator className="bg-border/60" />
                      <div className="space-y-3">
                        <p className="ui-type-label">Record collegati</p>
                        <div className="space-y-2">
                          {processi.map((processo) => (
                            <ListRowCard
                              key={processo.id}
                              title={processo.titolo_annuncio || processo.id}
                              subtitle={`Stato RES: ${processo.stato_res ?? "-"}`}
                              trailing={
                                <Button asChild variant="outline" size="sm">
                                  <a
                                    href={buildPathForRoute({
                                      mainSection: "ricerca_pipeline",
                                      anagraficheTab: "famiglie",
                                      ricercaProcessId: processo.id,
                                    })}
                                  >
                                    Apri
                                    <ArrowRightIcon className="size-4" />
                                  </a>
                                </Button>
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}
                </>
              )}
            </DetailSectionBlock>
          </div>

          <div ref={setSectionRef("tickets")} className="space-y-4">
            <DetailSectionBlock
              title="Tickets"
              icon={<MessageSquareTextIcon className="size-5" />}
              action={
                onCreateTicket ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreateTicketOpen(true)}
                  >
                    Apri un ticket
                    <ArrowRightIcon className="size-4" />
                  </Button>
                ) : null
              }
              contentClassName="space-y-3 pt-2"
            >
              {tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <ListRowCard
                    key={ticket.id}
                    title={ticket.causale ?? "Ticket senza causale"}
                    subtitle={[
                      ticket.tipo ? `Tipo ${ticket.tipo}` : null,
                      ticket.data_apertura ? `Aperto il ${formatDate(ticket.data_apertura)}` : null,
                      ticket.urgenza ? `Urgenza ${ticket.urgenza}` : null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                    rightBadge={ticket.stato ?? undefined}
                  />
                ))
              ) : (
                <EmptyLinkedState
                  icon={<MessageSquareTextIcon className="size-8" />}
                  label="Nessun ticket collegato"
                />
              )}
            </DetailSectionBlock>
          </div>

          <div ref={setSectionRef("cedolini")} className="space-y-4">
            <DetailSectionBlock
              title="Cedolini"
              icon={<FileTextIcon className="size-5" />}
              contentClassName="space-y-3 pt-2"
            >
              {sortedMesi.length > 0 ? (
                sortedMesi.map((mese) => {
                  const meseCalendario = mese.mese_id ? meseCalendarioById.get(mese.mese_id) ?? null : null
                  const pagamento = mese.ticket_id ? pagamentiByTicketId.get(mese.ticket_id) ?? null : null
                  const presenzeMese = mese.presenze_id ? presenzeById.get(mese.presenze_id) ?? null : null

                  return (
                    <ListRowCard
                      key={mese.id}
                      title={getMonthLabel(mese, meseCalendario)}
                      subtitle={[
                        mese.stato_mese_lavorativo ?? "Stato non disponibile",
                        getPresenceSummary(presenzeMese),
                        pagamento?.status ? `Pagamento ${pagamento.status}` : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                      rightBadge={mese.stato_mese_lavorativo ?? undefined}
                      trailing={
                        <span className="text-xs font-semibold whitespace-nowrap">
                          {typeof mese.importo_busta_estratto === "number"
                            ? formatCurrency(mese.importo_busta_estratto)
                            : "-"}
                        </span>
                      }
                      onClick={() => setSelectedCedolinoId(mese.id)}
                    />
                  )
                })
              ) : (
                <EmptyLinkedState
                  icon={<CreditCardIcon className="size-8" />}
                  label="Nessun cedolino collegato"
                />
              )}
            </DetailSectionBlock>
          </div>

          <div ref={setSectionRef("contributi")} className="space-y-4">
            <DetailSectionBlock
              title="Contributi INPS"
              icon={<CalendarDaysIcon className="size-5" />}
              contentClassName="space-y-3 pt-2"
            >
              {contributi.length > 0 ? (
                contributi.map((contributo) => (
                  <ListRowCard
                    key={contributo.id}
                    title={getContributoTitle(contributo)}
                    subtitle={[
                      contributo.data_invio_famiglia
                        ? `Inviato il ${formatDate(contributo.data_invio_famiglia)}`
                        : contributo.data_ora_creazione
                          ? `Creato il ${formatDateTime(contributo.data_ora_creazione)}`
                        : null,
                      contributo.valore_pagopa != null
                        ? `PagoPA ${formatCurrency(contributo.valore_pagopa)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                    rightBadge={contributo.stato_contributi_inps ?? undefined}
                    trailing={
                      <span className="text-xs font-semibold whitespace-nowrap">
                        {typeof contributo.importo_contributi_inps === "number"
                          ? formatCurrency(contributo.importo_contributi_inps)
                          : "-"}
                      </span>
                    }
                    onClick={() => setSelectedContributoId(contributo.id)}
                  />
                ))
              ) : (
                <EmptyLinkedState
                  icon={<CalendarDaysIcon className="size-8" />}
                  label="Nessun contributo INPS collegato"
                />
              )}
            </DetailSectionBlock>
          </div>

          <div ref={setSectionRef("variazioni")} className="space-y-4">
            <DetailSectionBlock
              title="Variazioni contrattuali"
              icon={<RefreshCwIcon className="size-5" />}
              contentClassName="space-y-3 pt-2"
            >
              {variazioni.length > 0 ? (
                variazioni.map((variazione) => (
                  <ListRowCard
                    key={variazione.id}
                    title={variazione.variazione_da_applicare ?? "Variazione contrattuale"}
                    subtitle={[
                      variazione.data_variazione
                        ? `Data variazione ${formatDate(variazione.data_variazione)}`
                        : null,
                      variazione.ticket_id ? `Ticket collegato` : null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                    rightBadge={variazione.stato ?? undefined}
                  />
                ))
              ) : (
                <EmptyLinkedState
                  icon={<RefreshCwIcon className="size-8" />}
                  label="Nessuna variazione contrattuale collegata"
                />
              )}
            </DetailSectionBlock>
          </div>

          <div ref={setSectionRef("chiusure")} className="space-y-4">
            <DetailSectionBlock
              title="Chiusure"
              icon={<ShieldAlertIcon className="size-5" />}
              contentClassName="space-y-3 pt-2"
            >
              {chiusure.length > 0 ? (
                chiusure.map((chiusura) => (
                  <ListRowCard
                    key={chiusura.id}
                    title={
                      chiusura.tipo_licenziamento ??
                      chiusura.motivazione_cessazione_rapporto ??
                      "Chiusura contrattuale"
                    }
                    subtitle={[
                      chiusura.data_fine_rapporto
                        ? `Fine rapporto ${formatDate(chiusura.data_fine_rapporto)}`
                        : null,
                      chiusura.informazioni_aggiuntive ?? null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                    rightBadge={chiusura.stato ?? undefined}
                  />
                ))
              ) : (
                <EmptyLinkedState
                  icon={<TriangleAlertIcon className="size-8" />}
                  label="Nessuna chiusura collegata"
                />
              )}
            </DetailSectionBlock>
          </div>

          <div className="h-8" />
        </div>
      {onCreateTicket ? (
        <SupportTicketCreateDialog
          open={isCreateTicketOpen}
          onOpenChange={setIsCreateTicketOpen}
          defaultTicketType="Customer"
          defaultRapportoId={rapportoView.id}
          rapportoOptions={[{ id: rapportoView.id, label: relationshipTitle }]}
          onCreateTicket={onCreateTicket}
        />
      ) : null}
      <CedolinoDetailSheet
        card={selectedCedolino}
        columns={cedolinoColumns}
        open={Boolean(selectedCedolino)}
        onOpenChange={(open) => {
          if (!open) setSelectedCedolinoId(null)
        }}
        onStageChange={(recordId, targetStageId) => {
          void updateRecord("mesi_lavorati", recordId, {
            stato_mese_lavorativo: targetStageId,
          })
        }}
        onPatchCard={(recordId, patch) => {
          void updateRecord("mesi_lavorati", recordId, patch as Record<string, unknown>)
        }}
        onPatchPresence={(recordId, patch) => {
          void updateRecord("presenze_mensili", recordId, patch as Record<string, unknown>)
        }}
      />
      <ContributoInpsDetailSheet
        card={selectedContributo}
        columns={contributoColumns}
        open={Boolean(selectedContributo)}
        onOpenChange={(open) => {
          if (!open) setSelectedContributoId(null)
        }}
        onStageChange={async (recordId, targetStageId) => {
          await updateRecord("contributi_inps", recordId, {
            stato_contributi_inps: targetStageId,
          })
        }}
        onPatchCard={async (recordId, patch) => {
          await updateRecord("contributi_inps", recordId, patch as Record<string, unknown>)
        }}
      />
      <Dialog open={Boolean(selectedPreview)} onOpenChange={(open) => !open && setSelectedPreview(null)}>
        <DialogContent
          className="max-w-[min(96vw,72rem)] border-none bg-neutral-950/90 p-2 shadow-none sm:max-w-[min(96vw,72rem)]"
        >
          <DialogTitle className="sr-only">
            {selectedPreview?.label ?? "Anteprima documento"}
          </DialogTitle>
          {selectedPreview ? (
            <div className="flex max-h-[88vh] items-center justify-center overflow-hidden rounded-lg">
              <img
                src={selectedPreview.url}
                alt={selectedPreview.label}
                className="max-h-[88vh] w-auto max-w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      </>
    </RecordDetailShell>
  )
}
