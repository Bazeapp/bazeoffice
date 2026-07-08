import * as React from "react";
import { AlertTriangleIcon, CircleUserRoundIcon, PencilIcon } from "lucide-react";

import type { LavoratoreListItem } from "../../components/lavoratore-card";
import { WorkerProfileOverview } from "../../components/worker-profile-overview";
import { Button } from "@/components/ui/button";
import { GateInfoCard } from "./gate-info-card";
import type { LavoratoreRecord } from "../../types/lavoratore";

/**
 * D2 — card "Presentazione lavoratore" estratta da gate1-view.
 * Field roll-out: autosave via gateFieldsForm (parent Form).
 */
export const GatePresentationCard = React.memo(function GatePresentationCard({
  worker,
  workerRow,
  statusAlert,
  sessoOptions,
  nazionalitaOptions,
  livelloItalianoOptions,
  lookupColorsByDomain,
  presentationPhotoSlots,
  selectedPresentationPhotoIndex,
  isEditing,
  showEditAction = false,
  showUploadPhotoAction = false,
  uploadingPhoto = false,
  onToggleEdit,
  onUploadPhoto,
  onSelectedPresentationPhotoIndexChange,
}: {
  worker: LavoratoreListItem;
  workerRow: LavoratoreRecord;
  statusAlert?: {
    statusLabel: string;
    reasonLabel: string;
    tone: "critical" | "muted";
  } | null;
  sessoOptions: Array<{ label: string; value: string }>;
  nazionalitaOptions: Array<{ label: string; value: string }>;
  livelloItalianoOptions: Array<{ label: string; value: string }>;
  lookupColorsByDomain: Map<string, string>;
  presentationPhotoSlots: string[];
  selectedPresentationPhotoIndex: number;
  isEditing: boolean;
  showEditAction?: boolean;
  showUploadPhotoAction?: boolean;
  uploadingPhoto?: boolean;
  onToggleEdit?: () => void;
  onUploadPhoto?: () => void;
  onSelectedPresentationPhotoIndexChange: (value: number) => void;
}) {
  return (
    <GateInfoCard
      title="Presentazione lavoratore"
      icon={<CircleUserRoundIcon className="text-muted-foreground size-4" />}
      titleAction={
        showEditAction ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={
                isEditing
                  ? "Termina modifica presentazione"
                  : "Modifica presentazione"
              }
              title={
                isEditing
                  ? "Termina modifica presentazione"
                  : "Modifica presentazione"
              }
              onClick={onToggleEdit}
            >
              <PencilIcon />
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {statusAlert ? (
          <div
            className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
              statusAlert.tone === "critical"
                ? "bg-rose-50/70 text-rose-700"
                : "bg-zinc-100/70 text-zinc-700"
            }`}
          >
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-semibold">{statusAlert.statusLabel}</p>
              <p>{statusAlert.reasonLabel}</p>
            </div>
          </div>
        ) : null}
        <WorkerProfileOverview
          worker={worker}
          workerRow={workerRow}
          isEditing={isEditing}
          useFormFields
          livelloItalianoOptions={livelloItalianoOptions}
          sessoOptions={sessoOptions}
          nazionalitaOptions={nazionalitaOptions}
          lookupColorsByDomain={lookupColorsByDomain}
          presentationPhotoSlots={presentationPhotoSlots}
          selectedPresentationPhotoIndex={selectedPresentationPhotoIndex}
          showUploadPhotoAction={showUploadPhotoAction}
          uploadingPhoto={uploadingPhoto}
          onUploadPhoto={onUploadPhoto}
          onSelectedPresentationPhotoIndexChange={
            onSelectedPresentationPhotoIndexChange
          }
        />
      </div>
    </GateInfoCard>
  );
});
