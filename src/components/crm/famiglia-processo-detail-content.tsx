import * as React from "react"
import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  Clock3Icon,
  MailIcon,
  MapPinnedIcon,
  PencilIcon,
  PhoneIcon,
  UsersIcon,
  HomeIcon,
  CatIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TimerResetIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { OnboardingContextCard } from "@/components/crm/cards/onboarding-context-card"
import { CreazioneAnnuncioCard } from "@/components/crm/cards/creazione-annuncio-card"
import {
  OnboardingCard,
  type OnboardingFlatSectionKey,
} from "@/components/crm/cards/onboarding-card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type {
  CrmPipelineCardData,
  LookupOptionsByField,
} from "@/hooks/use-crm-pipeline-preview"

type SidebarSectionTab = {
  id: OnboardingFlatSectionKey | "creazione-annuncio"
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const SIDEBAR_SECTION_TABS: SidebarSectionTab[] = [
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

function renderValue(value: string | null | undefined) {
  if (!value) return "-"
  const normalized = value.trim()
  return normalized ? normalized : "-"
}

function getBadgeClassName(color: string | null | undefined) {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return "border-red-200 bg-red-100 text-red-700"
    case "rose":
      return "border-rose-200 bg-rose-100 text-rose-700"
    case "orange":
      return "border-orange-200 bg-orange-100 text-orange-700"
    case "amber":
      return "border-amber-200 bg-amber-100 text-amber-700"
    case "yellow":
      return "border-yellow-200 bg-yellow-100 text-yellow-700"
    case "lime":
      return "border-lime-200 bg-lime-100 text-lime-700"
    case "green":
      return "border-green-200 bg-green-100 text-green-700"
    case "emerald":
      return "border-emerald-200 bg-emerald-100 text-emerald-700"
    case "teal":
      return "border-teal-200 bg-teal-100 text-teal-700"
    case "cyan":
      return "border-cyan-200 bg-cyan-100 text-cyan-700"
    case "sky":
      return "border-sky-200 bg-sky-100 text-sky-700"
    case "blue":
      return "border-blue-200 bg-blue-100 text-blue-700"
    case "indigo":
      return "border-indigo-200 bg-indigo-100 text-indigo-700"
    case "violet":
      return "border-violet-200 bg-violet-100 text-violet-700"
    case "purple":
      return "border-purple-200 bg-purple-100 text-purple-700"
    case "fuchsia":
      return "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700"
    case "pink":
      return "border-pink-200 bg-pink-100 text-pink-700"
    case "slate":
      return "border-slate-200 bg-slate-100 text-slate-700"
    case "gray":
      return "border-gray-200 bg-gray-100 text-gray-700"
    case "zinc":
      return "border-zinc-200 bg-zinc-100 text-zinc-700"
    case "neutral":
      return "border-neutral-200 bg-neutral-100 text-neutral-700"
    case "stone":
      return "border-stone-200 bg-stone-100 text-stone-700"
    default:
      return "border-border bg-muted text-foreground"
  }
}

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase()
}

function groupStageOptions(options: LookupOptionsByField["stato_sales"]) {
  return options.reduce<Record<string, LookupOptionsByField["stato_sales"]>>(
    (acc, option) => {
      const normalized = normalizeToken(option.valueKey)
      const groupKey = normalized.startsWith("warm_")
        ? "warm"
        : normalized.startsWith("hot_")
          ? "hot"
          : normalized.startsWith("cold_")
            ? "cold"
            : normalized.startsWith("won_")
              ? "won"
              : normalized === "lost"
                ? "lost"
                : normalized === "out_of_target"
                  ? "out_of_target"
                  : "other"

      if (!acc[groupKey]) acc[groupKey] = []
      acc[groupKey].push(option)
      return acc
    },
    {}
  )
}

function getStageDotClass(stage: string | null | undefined) {
  const s = String(stage ?? "").toLowerCase()
  if (s.startsWith("warm_")) return "bg-amber-400"
  if (s.startsWith("hot_")) return "bg-red-500"
  if (s.startsWith("cold_")) return "bg-sky-400"
  if (s.startsWith("won_")) return "bg-emerald-500"
  if (s === "lost") return "bg-zinc-400"
  if (s === "out_of_target") return "bg-zinc-300"
  return "bg-muted-foreground/60"
}

function getStageGroupLabel(groupKey: string) {
  switch (groupKey) {
    case "warm":
      return "WARM"
    case "hot":
      return "HOT"
    case "cold":
      return "COLD"
    case "won":
      return "WON"
    case "lost":
      return "LOST"
    case "out_of_target":
      return "OUT OF TARGET"
    default:
      return "Altri"
  }
}

function getSelectedLookupValue(
  selected: string | null | undefined,
  options: LookupOptionsByField[string]
) {
  const token = normalizeToken(selected)
  if (!token) return ""

  const matched = options.find(
    (option) =>
      normalizeToken(option.valueKey) === token ||
      normalizeToken(option.valueLabel) === token
  )
  return matched?.valueKey ?? selected ?? ""
}

export type FamigliaProcessoDetailContentProps = {
  card: CrmPipelineCardData | null
  lookupOptionsByField: LookupOptionsByField
  editMode?: "always" | "toggle"
  onChangeStatoSales?: (processId: string, targetStageId: string) => void | Promise<void>
  onPatchProcess?: (
    processId: string,
    patch: Record<string, unknown>
  ) => void | Promise<void>
  onPatchFamily?: (
    familyId: string,
    patch: Record<string, unknown>
  ) => void | Promise<void>
  showTempistiche?: boolean
  showAnnuncio?: boolean
  showHeaderMeta?: boolean
  showPrimaryControls?: boolean
  showContextCard?: boolean
  showOrariFrequenza?: boolean
  showLuogoLavoro?: boolean
  showFamiglia?: boolean
  showCasa?: boolean
  showAnimali?: boolean
  showMansioni?: boolean
  showRichiesteSpecifiche?: boolean
  showBlockEditActions?: boolean
  blocksCollapsible?: boolean
  firstBlockDefaultOpen?: boolean
  blocksDefaultOpen?: boolean
  isActive?: boolean
  readOnly?: boolean
  headerAction?: React.ReactNode
  className?: string
}

export function FamigliaProcessoDetailContent({
  card,
  lookupOptionsByField,
  editMode = "always",
  onChangeStatoSales,
  onPatchProcess,
  onPatchFamily,
  showTempistiche = true,
  showAnnuncio = true,
  showHeaderMeta = true,
  showPrimaryControls = true,
  showContextCard = true,
  showOrariFrequenza = true,
  showLuogoLavoro = true,
  showFamiglia = true,
  showCasa = true,
  showAnimali = true,
  showMansioni = true,
  showRichiesteSpecifiche = true,
  showBlockEditActions = true,
  blocksCollapsible = true,
  firstBlockDefaultOpen = true,
  blocksDefaultOpen = true,
  isActive = true,
  readOnly = false,
  headerAction,
  className,
}: FamigliaProcessoDetailContentProps) {
  const detailScrollRef = React.useRef<HTMLDivElement | null>(null)
  const visibleTabs = React.useMemo(
    () =>
      SIDEBAR_SECTION_TABS.filter((tab) => {
        if (!showOrariFrequenza && tab.id === "orari-frequenza") return false
        if (!showLuogoLavoro && tab.id === "luogo-lavoro") return false
        if (!showFamiglia && tab.id === "famiglia") return false
        if (!showCasa && tab.id === "casa") return false
        if (!showAnimali && tab.id === "animali") return false
        if (!showMansioni && tab.id === "mansioni") return false
        if (!showRichiesteSpecifiche && tab.id === "richieste-specifiche") return false
        if (!showTempistiche && tab.id === "tempistiche") return false
        if (!showAnnuncio && tab.id === "creazione-annuncio") return false
        return true
      }),
    [
      showAnimali,
      showAnnuncio,
      showCasa,
      showFamiglia,
      showLuogoLavoro,
      showMansioni,
      showOrariFrequenza,
      showRichiesteSpecifiche,
      showTempistiche,
    ]
  )
  const sectionRefs = React.useRef<
    Partial<Record<SidebarSectionTab["id"], HTMLDivElement | null>>
  >({})
  const [isEditingStatoLead, setIsEditingStatoLead] = React.useState(
    editMode === "always"
  )
  const [isEditingOnboarding, setIsEditingOnboarding] = React.useState(
    editMode === "always"
  )
  const [isEditingAnnuncio, setIsEditingAnnuncio] = React.useState(
    editMode === "always"
  )
  const [activeSection, setActiveSection] = React.useState<SidebarSectionTab["id"]>(
    visibleTabs[0]?.id ?? "orari-frequenza"
  )

  React.useEffect(() => {
    if (readOnly) {
      setIsEditingStatoLead(false)
      setIsEditingOnboarding(false)
      setIsEditingAnnuncio(false)
      return
    }

    if (editMode === "always") {
      setIsEditingStatoLead(true)
      setIsEditingOnboarding(true)
      setIsEditingAnnuncio(true)
      return
    }

    if (!isActive) {
      setIsEditingStatoLead(false)
      setIsEditingOnboarding(false)
      setIsEditingAnnuncio(false)
    }
  }, [editMode, isActive, card?.id, readOnly])

  const canEditStatoLead =
    !readOnly && (editMode === "always" ? true : isEditingStatoLead)
  const canEditOnboarding =
    !readOnly && (editMode === "always" ? true : isEditingOnboarding)
  const canEditAnnuncio =
    !readOnly && (editMode === "always" ? true : isEditingAnnuncio)
  const statoLeadEditAction =
    showBlockEditActions && editMode === "toggle" && !readOnly ? (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={
          canEditStatoLead
            ? "Termina modifica stato lead"
            : "Modifica stato lead"
        }
        title={
          canEditStatoLead
            ? "Termina modifica stato lead"
            : "Modifica stato lead"
        }
        onClick={() => setIsEditingStatoLead((current) => !current)}
      >
        <PencilIcon />
      </Button>
    ) : undefined
  const onboardingEditAction =
    showBlockEditActions && editMode === "toggle" && !readOnly ? (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={
          canEditOnboarding
            ? "Termina modifica onboarding"
            : "Modifica onboarding"
        }
        title={
          canEditOnboarding
            ? "Termina modifica onboarding"
            : "Modifica onboarding"
        }
        onClick={() => setIsEditingOnboarding((current) => !current)}
      >
        <PencilIcon />
      </Button>
    ) : undefined
  const annuncioEditAction =
    showBlockEditActions && editMode === "toggle" && !readOnly ? (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={
          canEditAnnuncio
            ? "Termina modifica creazione annuncio"
            : "Modifica creazione annuncio"
        }
        title={
          canEditAnnuncio
            ? "Termina modifica creazione annuncio"
            : "Modifica creazione annuncio"
        }
        onClick={() => setIsEditingAnnuncio((current) => !current)}
      >
        <PencilIcon />
      </Button>
    ) : undefined
  const stageOptions = lookupOptionsByField.stato_sales ?? []
  const groupedStageOptions = groupStageOptions(stageOptions)
  const stageGroupOrder = [
    "warm",
    "hot",
    "cold",
    "won",
    "lost",
    "out_of_target",
    "other",
  ].filter((groupKey) => (groupedStageOptions[groupKey] ?? []).length > 0)
  const tipoLavoroOptions = lookupOptionsByField.tipo_lavoro ?? []
  const tipoRapportoOptions = lookupOptionsByField.tipo_rapporto ?? []

  const bindSectionRef = React.useCallback(
    (sectionId: SidebarSectionTab["id"]) => (node: HTMLDivElement | null) => {
      sectionRefs.current[sectionId] = node
    },
    []
  )

  const scrollToSection = React.useCallback((sectionId: SidebarSectionTab["id"]) => {
    const container = detailScrollRef.current
    const target = sectionRefs.current[sectionId]
    if (!container || !target) return

    setActiveSection(sectionId)
    container.scrollTo({
      top: Math.max(target.offsetTop - 108, 0),
      behavior: "smooth",
    })
  }, [])

  React.useEffect(() => {
    setActiveSection(visibleTabs[0]?.id ?? "orari-frequenza")
  }, [card?.id, visibleTabs])

  React.useEffect(() => {
    const container = detailScrollRef.current
    if (!container || visibleTabs.length === 0) return

    const syncActiveSection = () => {
      let nextActive = visibleTabs[0]?.id ?? "orari-frequenza"

      for (const tab of visibleTabs) {
        const node = sectionRefs.current[tab.id]
        if (!node) continue
        if (node.offsetTop - 140 <= container.scrollTop) {
          nextActive = tab.id
        } else {
          break
        }
      }

      setActiveSection((current) => (current === nextActive ? current : nextActive))
    }

    syncActiveSection()
    container.addEventListener("scroll", syncActiveSection, { passive: true })

    return () => {
      container.removeEventListener("scroll", syncActiveSection)
    }
  }, [card?.id, visibleTabs, isActive])

  return (
    <section
      ref={detailScrollRef}
      className={cn("bg-surface-muted relative h-full min-h-0 overflow-y-auto", className)}
    >
      <div className="bg-surface sticky top-0 z-20 border-b">
        <div className="space-y-3 px-4 pt-4">
          {showHeaderMeta || headerAction ? (
            <div className="flex items-start justify-between gap-3">
              {showHeaderMeta ? (
                <h2 className="min-w-0 flex-1 truncate text-xl font-semibold">
                  {renderValue(card?.nomeFamiglia)}
                </h2>
              ) : (
                <div />
              )}
              {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
            </div>
          ) : null}

          {showPrimaryControls ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Select
                value={getSelectedLookupValue(card?.stage, stageOptions)}
                onValueChange={(nextValue) => {
                  if (!card || !nextValue) return
                  void onChangeStatoSales?.(card.id, nextValue)
                }}
                disabled={!canEditStatoLead}
              >
                <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full bg-surface pl-2.5 pr-2 text-xs font-medium">
                  <span className={cn("size-2 shrink-0 rounded-full", getStageDotClass(card?.stage))} />
                  <SelectValue placeholder="Stato lead" />
                </SelectTrigger>
                <SelectContent>
                  {stageGroupOrder.map((groupKey) => (
                    <SelectGroup key={groupKey}>
                      <SelectLabel>{getStageGroupLabel(groupKey)}</SelectLabel>
                      {groupedStageOptions[groupKey]?.map((option) => (
                        <SelectItem key={option.valueKey} value={option.valueKey}>
                          {option.valueLabel}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-xs">
                <MailIcon className="size-3.5 shrink-0" />
                <span className="truncate">{renderValue(card?.email)}</span>
              </span>
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                <PhoneIcon className="size-3.5 shrink-0" />
                <span>{renderValue(card?.telefono)}</span>
              </span>
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                <MapPinnedIcon className="size-3.5 shrink-0" />
                <span>{renderValue(card?.indirizzoProvincia)}</span>
              </span>
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                <CalendarIcon className="size-3.5 shrink-0" />
                <span>Creata il {renderValue(card?.dataLead)}</span>
              </span>
            </div>
          ) : null}

          {showPrimaryControls ? (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={getSelectedLookupValue(card?.tipoLavoroBadge, tipoLavoroOptions)}
                onValueChange={(nextValue) => {
                  if (!card || !nextValue) return
                  const label =
                    tipoLavoroOptions.find((o) => o.valueKey === nextValue)
                      ?.valueLabel ?? nextValue
                  void onPatchProcess?.(card.id, { tipo_lavoro: [label] })
                }}
                disabled={!canEditStatoLead}
              >
                <SelectTrigger
                  className={cn(
                    "h-7 w-auto gap-1.5 rounded-full pl-2.5 pr-1.5 text-xs font-medium shadow-none",
                    "[&_svg]:!text-current",
                    getBadgeClassName(card?.tipoLavoroColor)
                  )}
                >
                  <BriefcaseBusinessIcon className="size-3.5 shrink-0" />
                  <SelectValue placeholder="Tipo lavoro" />
                </SelectTrigger>
                <SelectContent>
                  {tipoLavoroOptions.map((option) => (
                    <SelectItem key={option.valueKey} value={option.valueKey}>
                      {option.valueLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={getSelectedLookupValue(card?.tipoRapportoBadge, tipoRapportoOptions)}
                onValueChange={(nextValue) => {
                  if (!card || !nextValue) return
                  const label =
                    tipoRapportoOptions.find((o) => o.valueKey === nextValue)
                      ?.valueLabel ?? nextValue
                  void onPatchProcess?.(card.id, { tipo_rapporto: [label] })
                }}
                disabled={!canEditStatoLead}
              >
                <SelectTrigger
                  className={cn(
                    "h-7 w-auto gap-1.5 rounded-full pl-2.5 pr-1.5 text-xs font-medium shadow-none",
                    "[&_svg]:!text-current",
                    getBadgeClassName(card?.tipoRapportoColor)
                  )}
                >
                  <Clock3Icon className="size-3.5 shrink-0" />
                  <SelectValue placeholder="Tipo rapporto" />
                </SelectTrigger>
                <SelectContent>
                  {tipoRapportoOptions.map((option) => (
                    <SelectItem key={option.valueKey} value={option.valueKey}>
                      {option.valueLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <Tabs
            value={activeSection}
            onValueChange={(value) =>
              scrollToSection(value as SidebarSectionTab["id"])
            }
            className="w-full"
          >
            <TabsList
              variant="line"
              className="h-auto w-full justify-start gap-x-1 overflow-x-auto overflow-y-hidden whitespace-nowrap p-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {visibleTabs.map((tab) => {
                const TabIcon = tab.icon
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex-none"
                  >
                    <TabIcon className="size-4" />
                    {tab.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {showContextCard ? (
          <div
            className={
              canEditStatoLead
                ? "space-y-4"
                : "space-y-4 select-none"
            }
          >
            <OnboardingContextCard
              card={card}
              lookupOptionsByField={lookupOptionsByField}
              titleAction={statoLeadEditAction}
              collapsible={blocksCollapsible}
              defaultOpen={firstBlockDefaultOpen}
              onPatchProcess={canEditStatoLead ? onPatchProcess : undefined}
              onPatchFamily={canEditStatoLead ? onPatchFamily : undefined}
            />
          </div>
        ) : null}

        <div
          className={
            canEditOnboarding
              ? "space-y-4"
              : "space-y-4 select-none"
          }
        >
          <OnboardingCard
            card={card}
            lookupOptionsByField={lookupOptionsByField}
            flattenSections
            sectionContainerProps={{
              ...(showOrariFrequenza
                ? { "orari-frequenza": { ref: bindSectionRef("orari-frequenza") } }
                : {}),
              ...(showLuogoLavoro
                ? { "luogo-lavoro": { ref: bindSectionRef("luogo-lavoro") } }
                : {}),
              ...(showFamiglia ? { famiglia: { ref: bindSectionRef("famiglia") } } : {}),
              ...(showCasa ? { casa: { ref: bindSectionRef("casa") } } : {}),
              ...(showAnimali ? { animali: { ref: bindSectionRef("animali") } } : {}),
              ...(showMansioni ? { mansioni: { ref: bindSectionRef("mansioni") } } : {}),
              ...(showRichiesteSpecifiche
                ? {
                    "richieste-specifiche": {
                      ref: bindSectionRef("richieste-specifiche"),
                    },
                  }
                : {}),
              ...(showTempistiche
                ? { tempistiche: { ref: bindSectionRef("tempistiche") } }
                : {}),
            }}
            showOrariFrequenza={showOrariFrequenza}
            showLuogoLavoro={showLuogoLavoro}
            showFamiglia={showFamiglia}
            showCasa={showCasa}
            showAnimali={showAnimali}
            showMansioni={showMansioni}
            showRichiesteSpecifiche={showRichiesteSpecifiche}
            showTempistiche={showTempistiche}
            sectionTitleAction={onboardingEditAction}
            sectionsCollapsible={blocksCollapsible}
            firstSectionDefaultOpen={firstBlockDefaultOpen}
            sectionsDefaultOpen={blocksDefaultOpen}
            onPatchProcess={canEditOnboarding ? onPatchProcess : undefined}
            readOnly={!canEditOnboarding}
          />
        </div>

        {showAnnuncio ? (
          <div
            className={
              canEditAnnuncio
                ? "space-y-4"
                : "space-y-4 select-none"
            }
          >
            {readOnly ? (
              <CreazioneAnnuncioCard
                title="Annuncio"
                brief={card?.testoAnnuncioWhatsapp}
                briefOnly
                collapsible={blocksCollapsible}
                defaultOpen={blocksDefaultOpen}
                containerProps={{ ref: bindSectionRef("creazione-annuncio") }}
              />
            ) : (
              <CreazioneAnnuncioCard
                processId={card?.id ?? null}
                containerProps={{ ref: bindSectionRef("creazione-annuncio") }}
                titleAction={annuncioEditAction}
                collapsible={blocksCollapsible}
                defaultOpen={blocksDefaultOpen}
              />
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
