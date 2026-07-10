import { AlertTriangleIcon } from "lucide-react"

import { WorkerProfileHeader } from "./worker-profile-header"
import type { LavoratoriCercaDetailHeaderProps } from "./lavoratori-cerca-detail.types"

export function LavoratoriCercaDetailHeader({
  selectedWorkerBlacklistAlert,
  selectedWorkerStatusAlert,
  selectedWorker,
  selectedWorkerRow,
  availabilityStatusDraft,
  dataRitornoLCVValue,
  statoLavoratoreLookupOptions,
  disponibilitaLookupOptions,
  motivazioniNonIdoneoOptions,
  sessoLookupOptions,
  nazionalitaLookupOptions,
  patchSelectedWorkerField,
  setAvailabilityStatusDraft,
  patchWorkerAvailabilityStatus,
  dataRitornoField,
  handleNonIdoneoReasonsChange,
  updatingNonQualificato,
  updatingAvailabilityStatus,
  updatingNonIdoneo,
  blacklistChecked,
  handleBlacklistChange,
  presentationPhotoSlots,
  selectedPresentationPhotoIndex,
  onPrimaryWorkerPhotoChange,
  onUploadPhoto,
  selectedMotivazioneClassName,
}: LavoratoriCercaDetailHeaderProps) {
  return (
    <>
      {selectedWorkerBlacklistAlert ? (
        <div className="flex items-start gap-2 rounded-md bg-rose-50/70 px-3 py-2 text-sm text-rose-700">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-semibold">{selectedWorkerBlacklistAlert.statusLabel}</p>
            <p>{selectedWorkerBlacklistAlert.reasonLabel}</p>
          </div>
        </div>
      ) : null}
      {selectedWorkerStatusAlert ? (
        <div
          className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
            selectedWorkerStatusAlert.tone === "critical"
              ? "bg-rose-50/70 text-rose-700"
              : "bg-zinc-100/70 text-zinc-700"
          }`}
        >
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-semibold">{selectedWorkerStatusAlert.statusLabel}</p>
            <p>{selectedWorkerStatusAlert.reasonLabel}</p>
          </div>
        </div>
      ) : null}
      {selectedWorker && selectedWorkerRow ? (
        <WorkerProfileHeader
          worker={selectedWorker}
          workerRow={{
            ...selectedWorkerRow,
            disponibilita: availabilityStatusDraft.disponibilita,
            data_ritorno_disponibilita: dataRitornoLCVValue,
          }}
          statoLavoratoreOptions={statoLavoratoreLookupOptions}
          disponibilitaOptions={disponibilitaLookupOptions}
          motivazioniOptions={motivazioniNonIdoneoOptions}
          sessoOptions={sessoLookupOptions}
          nazionalitaOptions={nazionalitaLookupOptions}
          onPatchField={(field, value) => patchSelectedWorkerField(field, value)}
          onStatoLavoratoreChange={(value) =>
            patchSelectedWorkerField("stato_lavoratore", value)
          }
          onDisponibilitaChange={(value) => {
            setAvailabilityStatusDraft((current) => ({
              ...current,
              disponibilita: value ?? "",
            }))
            void patchWorkerAvailabilityStatus({
              disponibilita: value || null,
            })
          }}
          onDataRitornoDisponibilitaChange={dataRitornoField.onChange}
          onMotivazioneChange={(value) =>
            void handleNonIdoneoReasonsChange(value ? [value] : [])
          }
          fieldsDisabled={updatingNonQualificato}
          statoLavoratoreDisabled={
            updatingNonQualificato || statoLavoratoreLookupOptions.length === 0
          }
          disponibilitaDisabled={
            updatingAvailabilityStatus || disponibilitaLookupOptions.length === 0
          }
          dataRitornoDisponibilitaDisabled={false}
          motivazioneDisabled={updatingNonIdoneo}
          blacklistChecked={blacklistChecked}
          onBlacklistToggle={(nextValue) => void handleBlacklistChange(nextValue)}
          blacklistDisabled={updatingNonIdoneo}
          presentationPhotoSlots={presentationPhotoSlots}
          selectedPresentationPhotoIndex={selectedPresentationPhotoIndex}
          onSelectedPresentationPhotoIndexChange={onPrimaryWorkerPhotoChange}
          showUploadPhotoAction
          onUploadPhoto={onUploadPhoto}
          selectedMotivazioneClassName={selectedMotivazioneClassName}
        />
      ) : null}
    </>
  )
}
