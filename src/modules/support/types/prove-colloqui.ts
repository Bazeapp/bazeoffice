import type {
  FamigliaRecord,
  LavoratoreRecord,
  ProcessoMatchingRecord,
  RapportoLavorativoRecord,
} from "@/types"

export type LookupOption = {
  label: string
  value: string
}

export type ProvaCardData = {
  id: string
  rapporto: RapportoLavorativoRecord
  famiglia: FamigliaRecord | null
  lavoratore: LavoratoreRecord | null
  title: string
  famigliaLabel: string
  lavoratoreLabel: string
  workerAvatarUrl: string | null
}

export type ProvaColumnData = {
  id: string
  label: string
  color: string | null
  cards: ProvaCardData[]
  totalCount: number
}

export type ColloquioCalendarEvent =
  | {
      id: string
      type: "colloquio"
      title: string
      start: string
      allDay: boolean
      selection: Record<string, unknown>
      process: ProcessoMatchingRecord | null
      famiglia: FamigliaRecord | null
      lavoratore: LavoratoreRecord | null
      workerAvatarUrl: string | null
      status: string | null
      tone: "ok" | "warning"
    }
  | {
      id: string
      type: "prova"
      title: string
      start: string
      allDay: boolean
      card: ProvaCardData
      status: string | null
      tone: "ok" | "warning"
    }

export type CalendarDateRange = {
  start: string
  end: string
}
