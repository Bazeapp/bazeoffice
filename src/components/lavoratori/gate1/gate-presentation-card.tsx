import * as React from "react";
import { AlertTriangleIcon, CircleUserRoundIcon, PencilIcon } from "lucide-react";

import type { LavoratoreListItem } from "@/components/lavoratori/lavoratore-card";
import { WorkerProfileOverview } from "@/components/lavoratori/worker-profile-overview";
import { Button } from "@/components/ui/button";
import { GateInfoCard } from "@/components/lavoratori/gate1/gate-info-card";
import type { LavoratoreRecord } from "@/types/entities/lavoratore";

/**
 * D2 — card "Presentazione lavoratore" estratta da gate1-view.
 *
 * Prop-driven puro: delega tutto a WorkerProfileOverview, l'orchestratore
 * fornisce draft/handler. React.memo, interfaccia props invariata.
 */
export const GatePresentationCard = React.memo(function GatePresentationCard({
  worker,
  workerRow,
  statusAlert,
  headerDraft,
  descriptionValue,
  livelloItaliano,
  sessoOptions,
  nazionalitaOptions,
  presentationPhotoSlots,
  selectedPresentationPhotoIndex,
  isEditing,
  showEditAction = false,
  showUploadPhotoAction = false,
  uploadingPhoto = false,
  onToggleEdit,
  onUploadPhoto,
  onSelectedPresentationPhotoIndexChange,
  onHeaderChange,
  livelloItalianoOptions,
  onLivelloItalianoChange,
}: {
  worker: LavoratoreListItem;
  workerRow: LavoratoreRecord;
  statusAlert?: {
    statusLabel: string;
    reasonLabel: string;
    tone: "critical" | "muted";
  } | null;
  headerDraft: {
    nome: string;
    cognome: string;
    email: string;
    telefono: string;
    sesso: string;
    nazionalita: string;
    data_di_nascita: string;
  };
  descriptionValue: string;
  livelloItaliano: string;
  sessoOptions: Array<{ label: string; value: string }>;
  nazionalitaOptions: Array<{ label: string; value: string }>;
  presentationPhotoSlots: string[];
  selectedPresentationPhotoIndex: number;
  isEditing: boolean;
  showEditAction?: boolean;
  showUploadPhotoAction?: boolean;
  uploadingPhoto?: boolean;
  onToggleEdit?: () => void;
  onUploadPhoto?: () => void;
  onSelectedPresentationPhotoIndexChange: (value: number) => void;
  livelloItalianoOptions: Array<{ label: string; value: string }>;
  onHeaderChange: (field: string, value: string) => void;
  onLivelloItalianoChange: (value: string) => void;
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
          draft={{
            ...headerDraft,
            descrizione_pubblica: descriptionValue,
          }}
          livelloItaliano={livelloItaliano}
          livelloItalianoOptions={livelloItalianoOptions}
          sessoOptions={sessoOptions}
          nazionalitaOptions={nazionalitaOptions}
          presentationPhotoSlots={presentationPhotoSlots}
          selectedPresentationPhotoIndex={selectedPresentationPhotoIndex}
          showUploadPhotoAction={showUploadPhotoAction}
          uploadingPhoto={uploadingPhoto}
          onUploadPhoto={onUploadPhoto}
          onSelectedPresentationPhotoIndexChange={
            onSelectedPresentationPhotoIndexChange
          }
          onLivelloItalianoChange={onLivelloItalianoChange}
          onFieldChange={onHeaderChange}
        />
      </div>
    </GateInfoCard>
  );
});
