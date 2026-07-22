import type { CalendarStatusKey } from "./colloqui-calendar-utils"

export type ProveColloquiViewTab = "prove" | "colloqui"
export type CalendarEventKind = "colloquio" | "prova"
export type TrialRecordingSlot =
  | "registrazione_chiamate_lavoratori"
  | "registrazione_chiamate_famiglia"

export const DAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]
export const DISTRIBUTION_DAY_LABELS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]

export const CALENDAR_KIND_OPTIONS: Array<{ value: CalendarEventKind; label: string }> = [
  { value: "colloquio", label: "Colloquio" },
  { value: "prova", label: "Prova" },
]

export const CALENDAR_STATUS_OPTIONS: Array<{ value: CalendarStatusKey; label: string }> = [
  { value: "match", label: "Match" },
  { value: "no-match", label: "No match" },
  { value: "prova", label: "In prova" },
  { value: "colloquio", label: "Colloquio" },
  { value: "standby", label: "Standby" },
]

export const AUDIO_ACCEPT =
  "audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/opus,audio/aac,.mp3,.m4a,.wav,.ogg,.opus,.aac"

// FASE 5 BIS — chiavi del form prova che sono textarea (trim()||null in onSave).
export const PROVA_TEXTAREA_KEYS = new Set([
  "prova_priorita_famiglia",
  "prova_note_cs_lavoratore",
  "prova_note_cs_famiglia",
])
