import type { ReactNode, Ref } from "react";

import {
  WorkerDetailShell,
  type WorkerDetailSectionTab,
} from "@/components/lavoratori/worker-detail-shell";

type WorkerDetailCompositeProps = {
  tabs: WorkerDetailSectionTab[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  topBar?: ReactNode;
  profileHeader?: ReactNode;
  profileBlock?: ReactNode;
  addressBlock?: ReactNode;
  availabilityStatusBlock?: ReactNode;
  availabilityCalendarBlock?: ReactNode;
  jobSearchBlock?: ReactNode;
  experienceReferencesBlock?: ReactNode;
  skillsBlock?: ReactNode;
  documentsBlock?: ReactNode;
  processesBlock?: ReactNode;
  interviewBlock?: ReactNode;
  showProfileHeader?: boolean;
  showProfileBlock?: boolean;
  showAddressBlock?: boolean;
  showAvailabilityStatusBlock?: boolean;
  showAvailabilityCalendarBlock?: boolean;
  showJobSearchBlock?: boolean;
  showExperienceReferencesBlock?: boolean;
  showSkillsBlock?: boolean;
  showDocumentsBlock?: boolean;
  showProcessesBlock?: boolean;
  showInterviewBlock?: boolean;
  sectionRef?: Ref<HTMLElement>;
  headerRef?: Ref<HTMLDivElement>;
  className?: string;
};

export function WorkerDetailComposite({
  tabs,
  activeSection,
  onSectionChange,
  topBar,
  profileHeader,
  profileBlock,
  addressBlock,
  availabilityStatusBlock,
  availabilityCalendarBlock,
  jobSearchBlock,
  experienceReferencesBlock,
  skillsBlock,
  documentsBlock,
  processesBlock,
  interviewBlock,
  showProfileHeader = true,
  showProfileBlock = true,
  showAddressBlock = true,
  showAvailabilityStatusBlock = true,
  showAvailabilityCalendarBlock = true,
  showJobSearchBlock = true,
  showExperienceReferencesBlock = true,
  showSkillsBlock = true,
  showDocumentsBlock = true,
  showProcessesBlock = true,
  showInterviewBlock = false,
  sectionRef,
  headerRef,
  className,
}: WorkerDetailCompositeProps) {
  const blocks = [
    showProfileBlock ? profileBlock : null,
    showAddressBlock ? addressBlock : null,
    showAvailabilityStatusBlock ? availabilityStatusBlock : null,
    showAvailabilityCalendarBlock ? availabilityCalendarBlock : null,
    showJobSearchBlock ? jobSearchBlock : null,
    showExperienceReferencesBlock ? experienceReferencesBlock : null,
    showSkillsBlock ? skillsBlock : null,
    showDocumentsBlock ? documentsBlock : null,
    showProcessesBlock ? processesBlock : null,
    showInterviewBlock ? interviewBlock : null,
  ].filter(Boolean);

  return (
    <WorkerDetailShell
      tabs={tabs}
      activeSection={activeSection}
      onSectionChange={onSectionChange}
      topBar={topBar}
      header={showProfileHeader ? profileHeader : undefined}
      sectionRef={sectionRef}
      headerRef={headerRef}
      className={className}
    >
      <div className="space-y-4">{blocks}</div>
    </WorkerDetailShell>
  );
}
