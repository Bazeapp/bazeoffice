import { XIcon } from "lucide-react"

import { WorkerDetailShell } from "./worker-detail-shell"
import { RecruiterFeedbackButton } from "./recruiter-feedback-sheet"
import { LavoratoriCercaDetailAddSearchDialog } from "./lavoratori-cerca-detail-add-search-dialog"
import { LavoratoriCercaDetailCards } from "./lavoratori-cerca-detail-cards"
import { LavoratoriCercaDetailHeader } from "./lavoratori-cerca-detail-header"
import { LavoratoriCercaDetailNonQualificato } from "./lavoratori-cerca-detail-non-qualificato"
import { LavoratoriCercaDetailProcessi } from "./lavoratori-cerca-detail-processi"
import { asString } from "../lib/base-utils"
import { Button } from "@/components/ui/button"
import type { LavoratoriCercaDetailPanelProps } from "./lavoratori-cerca-detail.types"

export type { LavoratoriCercaDetailPanelProps } from "./lavoratori-cerca-detail.types"

export function LavoratoriCercaDetailPanel(props: LavoratoriCercaDetailPanelProps) {
  const {
    onClose,
    workerPhotoInputRef,
    onWorkerPhotoInputChange,
    detailScrollRef,
    workerSectionTabs,
    activeWorkerSection,
    onSectionChange,
    setWorkerSectionRef,
    selectedWorker,
    selectedWorkerRow,
    selectedWorkerIsNonQualificato,
    patchSelectedWorkerField,
    operatorName,
  } = props

  return (
    <>
      <input
        ref={workerPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onWorkerPhotoInputChange}
      />
      <WorkerDetailShell
        key={selectedWorkerRow?.id ?? "__empty__"}
        className="scrollbar-visible"
        sectionRef={detailScrollRef}
        tabs={workerSectionTabs}
        activeSection={activeWorkerSection}
        onSectionChange={onSectionChange}
        topBar={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Chiudi scheda lavoratore"
            title="Chiudi scheda lavoratore"
            onClick={onClose}
          >
            <XIcon />
          </Button>
        }
        headerRef={setWorkerSectionRef("profilo")}
        header={<LavoratoriCercaDetailHeader {...props} />}
      >
        {selectedWorker ? (
          <div className="space-y-6">
            <div className="space-y-6 text-sm">
              <LavoratoriCercaDetailProcessi {...props} />
              <LavoratoriCercaDetailCards {...props} />
              {selectedWorkerIsNonQualificato ? (
                <LavoratoriCercaDetailNonQualificato {...props} />
              ) : null}
            </div>
          </div>
        ) : null}
        <RecruiterFeedbackButton
          value={asString(selectedWorkerRow?.feedback_recruiter)}
          operatorName={operatorName}
          onSave={(next) =>
            patchSelectedWorkerField("feedback_recruiter", next.trim() || null)
          }
        />
      </WorkerDetailShell>
      <LavoratoriCercaDetailAddSearchDialog {...props} />
    </>
  )
}
