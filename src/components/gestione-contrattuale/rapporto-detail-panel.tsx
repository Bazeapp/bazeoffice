import * as React from "react"
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CopyIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  FileTextIcon,
  Link2Icon,
  MailIcon,
  PhoneIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  TriangleAlertIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"

import { getTagClassName } from "@/features/lavoratori/lib/lookup-utils"
import {
  AttachmentUploadSlot,
  type AttachmentLink,
} from "@/components/shared/attachment-upload-slot"
import { DetailSectionCard } from "@/components/shared/detail-section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { updateRecord } from "@/lib/anagrafiche-api"
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
  VariazioneContrattualeRecord,
} from "@/types"

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
  loadingRelated: boolean
  lookupColorsByDomain: Map<string, string>
}

type SectionTab = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const SECTION_TABS: SectionTab[] = [
  { id: "contratto", label: "Contratto", icon: BriefcaseBusinessIcon },
  { id: "gestione", label: "Datore e Lavoratore", icon: UsersIcon },
  { id: "cedolini", label: "Cedolini", icon: CreditCardIcon },
  { id: "contributi", label: "Contributi", icon: CalendarDaysIcon },
  { id: "variazioni", label: "Variazioni", icon: RefreshCwIcon },
  { id: "chiusure", label: "Chiusure", icon: TriangleAlertIcon },
]

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

type StoredAttachmentPayload = {
  bucket: string
  content_type: string
  file_name: string
  name: string
  path: string
  public_url: string
  size: number
  uploaded_at: string
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

function InfoCell({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
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
    <div className="rounded-xl border px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
            <UserIcon className="text-muted-foreground size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">{role}</p>
            <p className="truncate text-sm font-semibold">{name}</p>
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
    </div>
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
    <div
      className={`hover:bg-muted/30 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
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
    </div>
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
      <p className="text-muted-foreground text-xs">{label}</p>
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
  loadingRelated,
  lookupColorsByDomain,
}: RapportoDetailPanelProps) {
  const detailScrollRef = React.useRef<HTMLElement | null>(null)
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
  const [activeSection, setActiveSection] = React.useState<string>("contratto")
  const isScrollingByClickRef = React.useRef(false)
  const [selectedPreview, setSelectedPreview] = React.useState<AttachmentLink | null>(null)
  const [uploadingSlot, setUploadingSlot] = React.useState<string | null>(null)
  const [uploadError, setUploadError] = React.useState<string | null>(null)

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
      if (!rapporto) return

      setUploadError(null)
      setUploadingSlot(slot)

      const rapportoMetadata =
        rapporto.metadati_migrazione && typeof rapporto.metadati_migrazione === "object"
          ? rapporto.metadati_migrazione
          : {}

      try {
        const safeName = sanitizeFileName(file.name || "documento")
        const storagePath = [
          "rapporti-lavorativi",
          rapporto.id,
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

        const publicUrlResult = supabase.storage.from("baze-bucket").getPublicUrl(storagePath)
        const payload: StoredAttachmentPayload = {
          bucket: "baze-bucket",
          content_type: file.type || "application/octet-stream",
          file_name: file.name,
          name: file.name,
          path: storagePath,
          public_url: publicUrlResult.data.publicUrl,
          size: file.size,
          uploaded_at: new Date().toISOString(),
        }

        if (slot === "delega_inps_allegati") {
          const nextMetadata = {
            ...(typeof rapportoMetadata === "object" ? rapportoMetadata : {}),
            delega_inps_allegati: payload,
          }
          await updateRecord("rapporti_lavorativi", rapporto.id, {
            metadati_migrazione: nextMetadata,
          })
        } else {
          await updateRecord("rapporti_lavorativi", rapporto.id, {
            [slot]: payload,
          })
        }
      } catch (caughtError) {
        setUploadError(
          caughtError instanceof Error ? caughtError.message : "Errore caricando allegato"
        )
      } finally {
        setUploadingSlot(null)
      }
    },
    [rapporto]
  )

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

  const familyName =
    (famiglia ? [famiglia.nome, famiglia.cognome].filter(Boolean).join(" ").trim() : "") ||
    rapporto.cognome_nome_datore_proper ||
    "Famiglia non trovata"
  const workerName =
    (lavoratore ? [lavoratore.nome, lavoratore.cognome].filter(Boolean).join(" ").trim() : "") ||
    rapporto.nome_lavoratore_per_url ||
    "Lavoratore non trovato"
  const relationshipTitle = `${familyName} – ${workerName}`
  const distributionItems = buildDistributionItems(
    rapporto.distribuzione_ore_settimana,
    rapporto.ore_a_settimana
  )
  const rapportoMetadata =
    rapporto.metadati_migrazione && typeof rapporto.metadati_migrazione === "object"
      ? rapporto.metadati_migrazione
      : {}
  const delegaInpsValue =
    typeof rapportoMetadata === "object" && rapportoMetadata
      ? (rapportoMetadata as Record<string, unknown>).delega_inps_allegati ?? null
      : null
  const startDateLabel = formatDate(rapporto.data_inizio_rapporto)
  const statoRapportoColor =
    lookupColorsByDomain.get(
      `rapporti_lavorativi.stato_rapporto:${normalizeToken(rapporto.stato_rapporto)}`
    ) ?? getStatusColor(rapporto.stato_rapporto)
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

  return (
    <section
      ref={detailScrollRef}
      className="bg-background relative min-h-0 overflow-y-auto rounded-xl border px-4 pt-0 pb-4"
    >
      <div className="space-y-6">
        <div className="sticky top-0 z-20 -mx-4 -mt-4 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-lg leading-tight font-semibold">{relationshipTitle}</h2>
                <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  {famiglia?.email ? <span>{famiglia.email}</span> : null}
                  {famiglia?.email && startDateLabel !== "-" ? <span>•</span> : null}
                  {startDateLabel !== "-" ? <span>dal {startDateLabel}</span> : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge className={getTagClassName(statoRapportoColor)}>
                    {rapporto.stato_rapporto ?? "Sconosciuto"}
                  </Badge>
                  {rapporto.stato_servizio ? (
                    <Badge variant="outline" className="h-5 px-2 text-[11px] font-medium">
                      {rapporto.stato_servizio}
                    </Badge>
                  ) : null}
                  {rapporto.tipo_rapporto ? (
                    <Badge variant="outline" className="h-5 px-2 text-[11px] font-medium">
                      {rapporto.tipo_rapporto}
                    </Badge>
                  ) : null}
                  {rapporto.tipo_contratto ? (
                    <Badge variant="secondary" className="h-5 px-2 text-[11px] font-medium">
                      {rapporto.tipo_contratto}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <Tabs value={activeSection} onValueChange={scrollToSection} className="w-full">
              <TabsList
                variant="line"
                className="h-auto w-full justify-start gap-x-0.5 overflow-x-auto overflow-y-hidden whitespace-nowrap p-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {SECTION_TABS.map((tab) => {
                  const TabIcon = tab.icon
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="text-muted-foreground/70 h-8 flex-none rounded-md px-2.5 text-xs shadow-none"
                    >
                      <TabIcon className="size-3.5" />
                      {tab.label}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="space-y-6 text-sm">
          <div ref={setSectionRef("contratto")} className="space-y-4">
            <DetailSectionCard
              title="Caratteristiche del rapporto"
              titleIcon={<BriefcaseBusinessIcon className="size-5" />}
              titleOnBorder
              contentClassName="space-y-5 pt-2"
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCell label="Tipo durata" value={rapporto.tipo_contratto_durata ?? "-"} />
                <InfoCell label="Tipo contratto" value={rapporto.tipo_contratto ?? "-"} />
                <InfoCell label="Tipo rapporto" value={rapporto.tipo_rapporto ?? "-"} />
                <InfoCell
                  label="Ore settimanali"
                  value={
                    typeof rapporto.ore_a_settimana === "number"
                      ? `${rapporto.ore_a_settimana}h`
                      : "-"
                  }
                />
              </div>

              <div className="space-y-3">
                <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                  Distribuzione ore
                </p>
                <div className="flex flex-wrap gap-2">
                  {distributionItems.map((item) => (
                    <div
                      key={item.day}
                      className="bg-muted/35 flex min-w-14 flex-col items-center rounded-md border px-2 py-1.5"
                    >
                      <span className="text-muted-foreground text-[11px]">{item.day}</span>
                      <span className="text-xs font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCell label="Paga oraria lorda" value={formatCurrency(rapporto.paga_oraria_lorda)} />
                <InfoCell label="Paga mensile lorda" value={formatCurrency(rapporto.paga_mensile_lorda)} />
                <InfoCell label="Data inizio" value={startDateLabel} />
                <InfoCell label="Durata" value={getDurationLabel(rapporto.data_inizio_rapporto)} />
                <InfoCell
                  label="Cod. rapporto Webcolf"
                  value={rapporto.codice_datore_webcolf ? String(rapporto.codice_datore_webcolf) : "-"}
                />
                <InfoCell
                  label="Cod. lavoratore Webcolf"
                  value={rapporto.codice_dipendente_webcolf ? String(rapporto.codice_dipendente_webcolf) : "-"}
                />
                <InfoCell label="Stato assunzione" value={rapporto.stato_assunzione ?? "-"} />
                <InfoCell label="Relazione lavorativa" value={rapporto.relazione_lavorativa ?? "-"} />
              </div>
            </DetailSectionCard>
          </div>

          <div ref={setSectionRef("gestione")} className="space-y-4">
            <DetailSectionCard
              title="Datore e lavoratore"
              titleIcon={<UsersIcon className="size-5" />}
              titleOnBorder
              contentClassName="space-y-5 pt-2"
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

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileTextIcon className="text-muted-foreground size-4" />
                        <span className="text-[11px] font-semibold">Accordo di lavoro</span>
                      </div>
                      <AttachmentUploadSlot
                        label="Accordo di lavoro"
                        value={rapporto.accordo_di_lavoro_allegati}
                        onAdd={(file) => void handleUploadRapportoAttachment("accordo_di_lavoro_allegati", file)}
                        onPreviewOpen={setSelectedPreview}
                        isUploading={uploadingSlot === "accordo_di_lavoro_allegati"}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileTextIcon className="text-muted-foreground size-4" />
                        <span className="text-[11px] font-semibold">Ricevuta INPS</span>
                      </div>
                      <AttachmentUploadSlot
                        label="Ricevuta INPS"
                        value={rapporto.ricevuta_inps_allegati}
                        onAdd={(file) => void handleUploadRapportoAttachment("ricevuta_inps_allegati", file)}
                        onPreviewOpen={setSelectedPreview}
                        isUploading={uploadingSlot === "ricevuta_inps_allegati"}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileTextIcon className="text-muted-foreground size-4" />
                        <span className="text-[11px] font-semibold">Delega INPS</span>
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
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Link2Icon className="text-muted-foreground size-4" />
                        <p className="text-[11px] font-semibold tracking-wide uppercase">Record collegati</p>
                      </div>
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
                  ) : null}
                </>
              )}
            </DetailSectionCard>
          </div>

          <div ref={setSectionRef("cedolini")} className="space-y-4">
            <DetailSectionCard
              title="Cedolini"
              titleIcon={<FileTextIcon className="size-5" />}
              titleOnBorder
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
                    />
                  )
                })
              ) : (
                <EmptyLinkedState
                  icon={<CreditCardIcon className="size-8" />}
                  label="Nessun cedolino collegato"
                />
              )}
            </DetailSectionCard>
          </div>

          <div ref={setSectionRef("contributi")} className="space-y-4">
            <DetailSectionCard
              title="Contributi INPS"
              titleIcon={<CalendarDaysIcon className="size-5" />}
              titleOnBorder
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
                  />
                ))
              ) : (
                <EmptyLinkedState
                  icon={<CalendarDaysIcon className="size-8" />}
                  label="Nessun contributo INPS collegato"
                />
              )}
            </DetailSectionCard>
          </div>

          <div ref={setSectionRef("variazioni")} className="space-y-4">
            <DetailSectionCard
              title="Variazioni contrattuali"
              titleIcon={<RefreshCwIcon className="size-5" />}
              titleOnBorder
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
            </DetailSectionCard>
          </div>

          <div ref={setSectionRef("chiusure")} className="space-y-4">
            <DetailSectionCard
              title="Chiusure"
              titleIcon={<ShieldAlertIcon className="size-5" />}
              titleOnBorder
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
            </DetailSectionCard>
          </div>

          <div className="h-8" />
        </div>
      </div>
      <Dialog open={Boolean(selectedPreview)} onOpenChange={(open) => !open && setSelectedPreview(null)}>
        <DialogContent
          className="max-w-[min(96vw,72rem)] border-none bg-black/90 p-2 shadow-none sm:max-w-[min(96vw,72rem)]"
          showCloseButton={true}
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
    </section>
  )
}
