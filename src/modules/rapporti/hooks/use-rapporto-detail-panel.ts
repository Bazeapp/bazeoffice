import * as React from "react"

import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import {
  buildAttachmentPayload,
  normalizeAttachmentArray,
} from "@/lib/attachments"
import { sanitizeFileName } from "@/lib/file-utils"
import { updateRecord } from "@/lib/record-crud"
import { supabase } from "@/lib/supabase-client"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import type { RapportoAssunzioneNames } from "@/modules/gestione-contrattuale/types"
import type {
  SupportTicketTag,
  SupportTicketType,
  SupportTicketUrgency,
} from "@/modules/support/components"
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
  RichiestaAttivazioneRecord,
  TicketRecord,
  TransazioneFinanziariaRecord,
  VariazioneContrattualeRecord,
} from "@/types"

import { RAPPORTO_DETAIL_SECTION_TABS } from "../lib/rapporto-detail-panel.constants"
import {
  buildCedolinoBoardData,
  buildContributoBoardData,
  buildPresenzeUrl,
  buildRapportoDetailGestioneView,
  buildRapportoDetailHeaderView,
  resolveLinkedProcesso,
} from "../lib/rapporto-detail-panel.mappers"
import { formatRapportoDetailDate } from "../lib/rapporto-detail-panel.utils"

export type RapportoDetailPanelProps = {
  rapporto: RapportoLavorativoRecord | null
  loadingRapporto?: boolean
  famiglia: FamigliaRecord | null
  lavoratore: LavoratoreRecord | null
  assunzioneNames?: RapportoAssunzioneNames | null
  processi: ProcessoMatchingRecord[]
  contributi: ContributoInpsRecord[]
  mesi: MeseLavoratoRecord[]
  mesiCalendario: MeseCalendarioRecord[]
  pagamenti: PagamentoRecord[]
  transazioni: TransazioneFinanziariaRecord[]
  presenze: PresenzaMensileRecord[]
  variazioni: VariazioneContrattualeRecord[]
  chiusure: ChiusuraContrattoRecord[]
  tickets?: TicketRecord[]
  richiesteAttivazione?: RichiestaAttivazioneRecord[]
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
  onRapportoUpdated?: (updatedRapporto: RapportoLavorativoRecord) => void
  hideHeader?: boolean
}

type RapportoAttachmentSlot =
  | "accordo_di_lavoro_allegati"
  | "ricevuta_inps_allegati"
  | "delega_inps_allegati"

export function useRapportoDetailPanel({
  rapporto,
  loadingRapporto = false,
  famiglia,
  lavoratore,
  assunzioneNames,
  processi,
  contributi,
  mesi,
  mesiCalendario,
  pagamenti,
  transazioni,
  presenze,
  variazioni,
  chiusure,
  tickets = [],
  richiesteAttivazione = [],
  loadingRelated,
  lookupColorsByDomain,
  onCreateTicket,
  onRapportoUpdated,
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
  const [selectedCedolinoId, setSelectedCedolinoId] = React.useState<string | null>(null)
  const [selectedContributoId, setSelectedContributoId] = React.useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = React.useState<TicketRecord | null>(null)
  const [isCreateTicketOpen, setIsCreateTicketOpen] = React.useState(false)
  const [rapportoState, setRapportoState] = React.useState<RapportoLavorativoRecord | null>(rapporto)
  const previousRapportoIdRef = React.useRef<string | null>(rapporto?.id ?? null)

  React.useEffect(() => {
    const nextRapportoId = rapporto?.id ?? null
    const isDifferentRapporto = previousRapportoIdRef.current !== nextRapportoId
    previousRapportoIdRef.current = nextRapportoId

    if (!isDifferentRapporto) {
      return
    }

    setRapportoState(rapporto)
    setSelectedCedolinoId(null)
    setSelectedContributoId(null)
    setSelectedTicket(null)
    setEditingSection(null)
    setActiveSection("contratto")
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
          if (sectionId) {
            setActiveSection(sectionId)
          }
        }
      },
      { root: container, rootMargin: "-120px 0px -60% 0px", threshold: 0 },
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
    [],
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
    async (slot: RapportoAttachmentSlot, file: File) => {
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
          const updatedRow = response.row as RapportoLavorativoRecord
          setRapportoState(updatedRow)
          onRapportoUpdated?.(updatedRow)
        } else {
          const response = await updateRecord("rapporti_lavorativi", rapportoRecord.id, {
            [slot]: [...normalizeAttachmentArray(rapportoRecord[slot]), payload],
          })
          const updatedRow = response.row as RapportoLavorativoRecord
          setRapportoState(updatedRow)
          onRapportoUpdated?.(updatedRow)
        }
      } catch (caughtError) {
        setUploadError(
          caughtError instanceof Error ? caughtError.message : "Errore caricando allegato",
        )
      } finally {
        setUploadingSlot(null)
      }
    },
    [rapporto, rapportoState, onRapportoUpdated],
  )

  const currentRapporto = rapportoState ?? rapporto
  const { currentProcesso, richiestaAttivazione } = resolveLinkedProcesso(
    processi,
    richiesteAttivazione,
  )

  const form = useAutoSaveForm({
    defaults: {
      codice_datore_webcolf:
        typeof currentRapporto?.codice_datore_webcolf === "number"
          ? String(currentRapporto.codice_datore_webcolf)
          : "",
      codice_dipendente_webcolf:
        typeof currentRapporto?.codice_dipendente_webcolf === "number"
          ? String(currentRapporto.codice_dipendente_webcolf)
          : "",
      fee_concordata: richiestaAttivazione?.fee_concordata?.toString() ?? "",
      offerta: currentProcesso?.offerta ?? "",
    },
    onSave: async (patch) => {
      const rapportoPatch: Record<string, number | null> = {}
      for (const [key, raw] of Object.entries(patch)) {
        const value = raw as string
        if (key === "fee_concordata") {
          if (!richiestaAttivazione?.id) continue
          const rawValue = value.trim()
          const nextValue = rawValue ? Number(rawValue) : null
          if (rawValue && Number.isNaN(nextValue)) continue
          await updateRecord("richieste_attivazione", richiestaAttivazione.id, {
            fee_concordata: nextValue,
          })
          continue
        }
        if (key === "offerta") {
          if (!currentProcesso?.id) continue
          await updateRecord("processi_matching", currentProcesso.id, {
            offerta: value || null,
          })
          continue
        }
        rapportoPatch[key] = value ? Number(value) : null
      }

      if (Object.keys(rapportoPatch).length > 0 && currentRapporto) {
        setRapportoState((previous) =>
          previous ? { ...previous, ...rapportoPatch } : previous,
        )
        const response = await updateRecord(
          "rapporti_lavorativi",
          currentRapporto.id,
          rapportoPatch,
        )
        const updatedRow = response.row as RapportoLavorativoRecord
        setRapportoState((previous) => ({
          ...((previous ?? currentRapporto) as RapportoLavorativoRecord),
          ...updatedRow,
        }))
        onRapportoUpdated?.(updatedRow)
      }
    },
  })

  const rapportoView = currentRapporto ?? rapporto
  const header = rapportoView
    ? buildRapportoDetailHeaderView({
        rapportoView,
        famiglia,
        lavoratore,
        assunzioneNames,
        chiusure,
        lookupColorsByDomain,
      })
    : null
  const gestione = rapportoView
    ? buildRapportoDetailGestioneView({
        rapportoView,
        famiglia,
        lavoratore,
        assunzioneNames,
      })
    : null
  const presenzeUrl = buildPresenzeUrl(famiglia)
  const cedolinoBoard = rapportoView
    ? buildCedolinoBoardData({
        mesi,
        mesiCalendario,
        pagamenti,
        transazioni,
        presenze,
        rapportoView,
        famiglia,
        richiestaAttivazione,
      })
    : null
  const contributoBoard =
    rapportoView && gestione && header
      ? buildContributoBoardData({
          contributi,
          rapportoView,
          familyName: gestione.familyName,
          workerName: gestione.workerName,
          relationshipTitle: header.relationshipTitle,
        })
      : null

  const selectedCedolino =
    cedolinoBoard?.cedolinoCards.find((card) => card.id === selectedCedolinoId) ?? null
  const selectedContributo =
    contributoBoard?.contributoCards.find((card) => card.id === selectedContributoId) ?? null

  const toggleContrattoEdit = React.useCallback(() => {
    setEditingSection((current) => (current === "contratto" ? null : "contratto"))
  }, [])

  return {
    loading: loadingRapporto,
    hasSelection: Boolean(rapporto),
    form,
    shell: {
      key: rapporto?.id ?? "__empty__",
      sectionRef: detailScrollRef,
      tabs: RAPPORTO_DETAIL_SECTION_TABS,
      activeSection,
      onSectionChange: scrollToSection,
      hideHeader,
      header: header && rapportoView ? { ...header, rapportoView } : null,
      embedded: hideHeader,
    },
    refs: {
      contratto: setSectionRef("contratto"),
      preventivo: setSectionRef("preventivo"),
      gestione: setSectionRef("gestione"),
      tickets: setSectionRef("tickets"),
      cedolini: setSectionRef("cedolini"),
      contributi: setSectionRef("contributi"),
      variazioni: setSectionRef("variazioni"),
      chiusure: setSectionRef("chiusure"),
    },
    sections: {
      contratto: rapportoView
        ? {
            rapportoView,
            startDateLabel: formatRapportoDetailDate(rapportoView.data_inizio_rapporto),
            isEditing: editingSection === "contratto",
            onToggleEdit: toggleContrattoEdit,
          }
        : null,
      preventivo: {
        loadingRelated,
        richiestaAttivazione,
        currentProcesso,
      },
      gestione: rapporto && rapportoView && gestione
        ? {
            rapporto,
            rapportoView,
            lavoratore,
            processi,
            gestione,
            loadingRelated,
            uploadingSlot,
            uploadError,
            onUpload: handleUploadRapportoAttachment,
            onPreviewOpen: setSelectedPreview,
          }
        : null,
      tickets: {
        loadingRelated,
        tickets,
        canCreateTicket: Boolean(onCreateTicket),
        onOpenCreateTicket: () => setIsCreateTicketOpen(true),
        onSelectTicket: setSelectedTicket,
      },
      cedolini: {
        loadingRelated,
        rows: cedolinoBoard?.cedolinoRows ?? [],
        presenzeUrl,
        onSelectCedolino: setSelectedCedolinoId,
      },
      contributi: {
        loadingRelated,
        contributi,
        onSelectContributo: setSelectedContributoId,
      },
      variazioni: {
        loadingRelated,
        variazioni,
      },
      chiusure: {
        loadingRelated,
        chiusure,
      },
    },
    overlays: {
      rapportoId: rapportoView?.id ?? "",
      relationshipTitle: header?.relationshipTitle ?? "",
      createTicket: {
        enabled: Boolean(onCreateTicket),
        open: isCreateTicketOpen,
        onOpenChange: setIsCreateTicketOpen,
        onCreateTicket: onCreateTicket ?? (async () => undefined),
      },
      cedolino: {
        selectedId: selectedCedolinoId,
        card: selectedCedolino,
        columns: cedolinoBoard?.cedolinoColumns ?? [],
        onOpenChange: (open: boolean) => {
          if (!open) setSelectedCedolinoId(null)
        },
      },
      contributo: {
        selectedId: selectedContributoId,
        card: selectedContributo,
        columns: contributoBoard?.contributoColumns ?? [],
        onOpenChange: (open: boolean) => {
          if (!open) setSelectedContributoId(null)
        },
      },
      ticket: {
        selected: selectedTicket,
        onOpenChange: (open: boolean) => {
          if (!open) setSelectedTicket(null)
        },
      },
      preview: {
        selected: selectedPreview,
        onOpenChange: (open: boolean) => {
          if (!open) setSelectedPreview(null)
        },
      },
    },
  }
}
