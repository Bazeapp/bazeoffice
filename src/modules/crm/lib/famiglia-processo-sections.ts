import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  CatIcon,
  HomeIcon,
  MapPinnedIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TimerResetIcon,
  UsersIcon,
} from "lucide-react"
import type * as React from "react"

export type FamigliaProcessoSectionId =
  | "orari-frequenza"
  | "luogo-lavoro"
  | "famiglia"
  | "casa"
  | "animali"
  | "mansioni"
  | "richieste-specifiche"
  | "tempistiche"
  | "creazione-annuncio"

export type FamigliaProcessoSectionTab = {
  id: FamigliaProcessoSectionId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export const FAMIGLIA_PROCESSO_SECTION_TABS: FamigliaProcessoSectionTab[] = [
  { id: "orari-frequenza", label: "Orari e frequenza", icon: CalendarIcon },
  { id: "luogo-lavoro", label: "Luogo di lavoro", icon: MapPinnedIcon },
  { id: "famiglia", label: "Famiglia", icon: UsersIcon },
  { id: "casa", label: "Casa", icon: HomeIcon },
  { id: "animali", label: "Animali", icon: CatIcon },
  { id: "mansioni", label: "Mansioni", icon: BriefcaseBusinessIcon },
  {
    id: "richieste-specifiche",
    label: "Richieste specifiche",
    icon: ShieldCheckIcon,
  },
  { id: "tempistiche", label: "Tempistiche", icon: TimerResetIcon },
  {
    id: "creazione-annuncio",
    label: "Annuncio",
    icon: SparklesIcon,
  },
]

export type FamigliaProcessoSectionVisibility = Record<FamigliaProcessoSectionId, boolean>

export const DEFAULT_FAMIGLIA_PROCESSO_SECTION_VISIBILITY: FamigliaProcessoSectionVisibility =
  {
    "orari-frequenza": true,
    "luogo-lavoro": true,
    famiglia: true,
    casa: true,
    animali: true,
    mansioni: true,
    "richieste-specifiche": true,
    tempistiche: true,
    "creazione-annuncio": true,
  }

export type FamigliaProcessoSectionVisibilityInput = Partial<
  FamigliaProcessoSectionVisibility
>

export function resolveFamigliaProcessoSectionVisibility(
  input: FamigliaProcessoSectionVisibilityInput = {}
): FamigliaProcessoSectionVisibility {
  return {
    ...DEFAULT_FAMIGLIA_PROCESSO_SECTION_VISIBILITY,
    ...input,
  }
}

export function getVisibleFamigliaProcessoTabs(
  visibility: FamigliaProcessoSectionVisibility
) {
  return FAMIGLIA_PROCESSO_SECTION_TABS.filter((tab) => visibility[tab.id])
}

export function buildFamigliaProcessoSectionContainerProps(
  visibleSectionIds: FamigliaProcessoSectionId[],
  bindSectionRef: (
    sectionId: FamigliaProcessoSectionId
  ) => (node: HTMLDivElement | null) => void
) {
  return Object.fromEntries(
    visibleSectionIds.map((sectionId) => [
      sectionId,
      { ref: bindSectionRef(sectionId) },
    ])
  )
}

export const ONBOARDING_SECTION_IDS = [
  "orari-frequenza",
  "luogo-lavoro",
  "famiglia",
  "casa",
  "animali",
  "mansioni",
  "richieste-specifiche",
  "tempistiche",
] as const satisfies readonly Exclude<
  FamigliaProcessoSectionId,
  "creazione-annuncio"
>[]
