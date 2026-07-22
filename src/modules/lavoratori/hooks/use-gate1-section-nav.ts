import * as React from "react";
import {
  BadgeCheckIcon,
  CalendarDaysIcon,
  CircleUserRoundIcon,
  FileSearchIcon,
  NotebookPenIcon,
  PhoneIcon,
  ShieldCheckIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react";

import type { GateTab } from "../types/gate1-view";

type UseGate1SectionNavParams = {
  showCertificationReferente: boolean;
  showFollowup: boolean;
  showDocumentSection: boolean;
  documentSectionAfterSpecificChecks: boolean;
  showAssessment: boolean;
  specificChecksMode: "gate1" | "confirmation";
  useGate1ReorderedSteps: boolean;
  selectedWorkerId: string | null;
};

/** Detail-panel tab list, scroll refs, and active-section sync. */
export function useGate1SectionNav({
  showCertificationReferente,
  showFollowup,
  showDocumentSection,
  documentSectionAfterSpecificChecks,
  showAssessment,
  specificChecksMode,
  useGate1ReorderedSteps,
  selectedWorkerId,
}: UseGate1SectionNavParams) {
  const firstGateSection = showCertificationReferente
    ? "referente"
    : showFollowup
      ? "contatti"
      : "presentazione";

  const gateTabs = React.useMemo<GateTab[]>(
    () => {
      if (useGate1ReorderedSteps) {
        return [
          ...(showFollowup
            ? [
                {
                  id: "contatti" as const,
                  label: "Referente e presentazione",
                  icon: PhoneIcon,
                },
              ]
            : [
                {
                  id: "presentazione" as const,
                  label: "Presentazione",
                  icon: CircleUserRoundIcon,
                },
              ]),
          {
            id: "check_baze" as const,
            label: "Check Baze",
            icon: ShieldCheckIcon,
          },
          {
            id: "indirizzo" as const,
            label: "Indirizzo",
            icon: CircleUserRoundIcon,
          },
          ...(showDocumentSection
            ? [
                {
                  id: "documenti" as const,
                  label: "Autocertificazioni",
                  icon: FileSearchIcon,
                },
              ]
            : []),
          {
            id: "tipologia" as const,
            label: "Tipologia lavori",
            icon: BadgeCheckIcon,
          },
          {
            id: "disponibilita" as const,
            label: "Disponibilita",
            icon: CalendarDaysIcon,
          },
          {
            id: "aspetti" as const,
            label: "Check disponibilita",
            icon: ShieldCheckIcon,
          },
          ...(showAssessment
            ? [{ id: "assessment" as const, label: "Assessment", icon: StarIcon }]
            : []),
        ];
      }

      return [
        ...(showCertificationReferente
          ? [{ id: "referente" as const, label: "Referente", icon: UsersIcon }]
          : []),
        ...(showFollowup
          ? [{ id: "contatti" as const, label: "Follow-up", icon: PhoneIcon }]
          : []),
        {
          id: "presentazione" as const,
          label: "Presentazione",
          icon: CircleUserRoundIcon,
        },
        ...(showDocumentSection && !documentSectionAfterSpecificChecks
          ? [
              {
                id: "documenti" as const,
                label: "Autocertificazioni",
                icon: FileSearchIcon,
              },
            ]
          : []),
        {
          id: "tipologia" as const,
          label: "Tipologia lavori",
          icon: BadgeCheckIcon,
        },
        {
          id: "disponibilita" as const,
          label: "Disponibilita",
          icon: CalendarDaysIcon,
        },
        {
          id: "aspetti" as const,
          label:
            specificChecksMode === "confirmation"
              ? "Competenze"
              : "Aspetti specifici",
          icon: ShieldCheckIcon,
        },
        ...(showDocumentSection && documentSectionAfterSpecificChecks
          ? [
              {
                id: "documenti" as const,
                label: "Documenti",
                icon: NotebookPenIcon,
              },
            ]
          : []),
        ...(showAssessment
          ? [{ id: "assessment" as const, label: "Assessment", icon: StarIcon }]
          : []),
      ];
    },
    [
      documentSectionAfterSpecificChecks,
      showCertificationReferente,
      showAssessment,
      showDocumentSection,
      showFollowup,
      specificChecksMode,
      useGate1ReorderedSteps,
    ],
  );

  const [activeGateSection, setActiveGateSection] =
    React.useState(firstGateSection);
  const detailScrollRef = React.useRef<HTMLElement | null>(null);
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToSection = React.useCallback((value: string) => {
    setActiveGateSection(value);
    const container = detailScrollRef.current;
    const target = sectionRefs.current[value];
    if (!container || !target) return;
    container.scrollTo({
      top: Math.max(target.offsetTop - 108, 0),
      behavior: "smooth",
    });
  }, []);

  const registerGateSectionRef = React.useCallback(
    (sectionId: string, enabled = true) =>
      (node: HTMLDivElement | null) => {
        if (!enabled) return;
        sectionRefs.current[sectionId] = node;
      },
    [],
  );

  React.useEffect(() => {
    const container = detailScrollRef.current;
    if (!container || !selectedWorkerId) return;

    const syncActiveSection = () => {
      const scrollTop = container.scrollTop;
      let nextActive = gateTabs[0]?.id ?? firstGateSection;

      for (const tab of gateTabs) {
        const node = sectionRefs.current[tab.id];
        if (!node) continue;
        if (node.offsetTop - 140 <= scrollTop) {
          nextActive = tab.id;
        } else {
          break;
        }
      }

      setActiveGateSection((current) =>
        current === nextActive ? current : nextActive,
      );
    };

    syncActiveSection();
    container.addEventListener("scroll", syncActiveSection, { passive: true });
    return () => container.removeEventListener("scroll", syncActiveSection);
  }, [firstGateSection, gateTabs, selectedWorkerId]);

  React.useEffect(() => {
    setActiveGateSection(firstGateSection);
  }, [firstGateSection, selectedWorkerId]);

  return {
    activeGateSection,
    detailScrollRef,
    firstGateSection,
    gateTabs,
    registerGateSectionRef,
    scrollToSection,
  };
}
