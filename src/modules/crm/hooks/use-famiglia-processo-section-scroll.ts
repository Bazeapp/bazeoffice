import * as React from "react"

import type {
  FamigliaProcessoSectionId,
  FamigliaProcessoSectionTab,
} from "../lib/famiglia-processo-sections"

const DEFAULT_SECTION_ID: FamigliaProcessoSectionId = "orari-frequenza"

export function useFamigliaProcessoSectionScroll({
  visibleTabs,
  cardId,
  isActive,
}: {
  visibleTabs: FamigliaProcessoSectionTab[]
  cardId: string | null | undefined
  isActive: boolean
}) {
  const detailScrollRef = React.useRef<HTMLDivElement | null>(null)
  const sectionRefs = React.useRef<
    Partial<Record<FamigliaProcessoSectionId, HTMLDivElement | null>>
  >({})
  const [activeSection, setActiveSection] = React.useState<FamigliaProcessoSectionId>(
    visibleTabs[0]?.id ?? DEFAULT_SECTION_ID
  )

  const bindSectionRef = React.useCallback(
    (sectionId: FamigliaProcessoSectionId) => (node: HTMLDivElement | null) => {
      sectionRefs.current[sectionId] = node
    },
    []
  )

  const scrollToSection = React.useCallback((sectionId: FamigliaProcessoSectionId) => {
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
    setActiveSection(visibleTabs[0]?.id ?? DEFAULT_SECTION_ID)
  }, [cardId, visibleTabs])

  React.useEffect(() => {
    const container = detailScrollRef.current
    if (!container || visibleTabs.length === 0) return

    const syncActiveSection = () => {
      let nextActive = visibleTabs[0]?.id ?? DEFAULT_SECTION_ID

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
  }, [cardId, isActive, visibleTabs])

  return {
    detailScrollRef,
    activeSection,
    bindSectionRef,
    scrollToSection,
  }
}
