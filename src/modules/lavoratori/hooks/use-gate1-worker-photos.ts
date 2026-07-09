import * as React from "react";

import { updateRecord } from "@/lib/record-crud";
import {
  buildAttachmentPayload,
  type MinimalAttachment,
  normalizeAttachmentArray,
} from "@/lib/attachments";
import { supabase } from "@/lib/supabase-client";
import { asLavoratoreRecord } from "../lib/base-utils";
import { sanitizeFileName } from "../lib/gate1-utils";
import type { LavoratoreRecord } from "../types/lavoratore";

type UseGate1WorkerPhotosParams = {
  selectedWorkerId: string | null;
  selectedWorkerRow: LavoratoreRecord | null;
  applyUpdatedWorkerRow: (row: LavoratoreRecord) => void;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedPresentationPhotoIndex: React.Dispatch<
    React.SetStateAction<number>
  >;
};

/** Worker photo upload and primary-photo reorder for Gate 1 presentation. */
export function useGate1WorkerPhotos({
  selectedWorkerId,
  selectedWorkerRow,
  applyUpdatedWorkerRow,
  setError,
  setSelectedPresentationPhotoIndex,
}: UseGate1WorkerPhotosParams) {
  const workerPhotoInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadingWorkerPhoto, setUploadingWorkerPhoto] = React.useState(false);

  const openWorkerPhotoPicker = React.useCallback(() => {
    if (uploadingWorkerPhoto) return;
    workerPhotoInputRef.current?.click();
  }, [uploadingWorkerPhoto]);

  const handleWorkerPhotoInputChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";

      if (files.length === 0 || !selectedWorkerId) return;

      setError(null);
      setUploadingWorkerPhoto(true);

      try {
        const nextPhotos: MinimalAttachment[] = normalizeAttachmentArray(
          selectedWorkerRow?.foto,
        );

        for (const [index, file] of files.entries()) {
          const safeName = sanitizeFileName(file.name || "foto");
          const storagePath = [
            "lavoratori",
            selectedWorkerId,
            "foto",
            `${Date.now()}-${index}-${safeName}`,
          ].join("/");

          const uploadResult = await supabase.storage
            .from("baze-bucket")
            .upload(storagePath, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type || undefined,
            });

          if (uploadResult.error) {
            throw uploadResult.error;
          }

          nextPhotos.push(buildAttachmentPayload(file, storagePath));
        }

        const response = await updateRecord("lavoratori", selectedWorkerId, {
          foto: nextPhotos,
        });
        applyUpdatedWorkerRow(asLavoratoreRecord(response.row));
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore caricando la foto",
        );
      } finally {
        setUploadingWorkerPhoto(false);
      }
    },
    [
      applyUpdatedWorkerRow,
      selectedWorkerId,
      selectedWorkerRow?.foto,
      setError,
    ],
  );

  const handlePrimaryWorkerPhotoChange = React.useCallback(
    async (index: number) => {
      if (!selectedWorkerId) return;

      const existingPhotos = normalizeAttachmentArray(selectedWorkerRow?.foto);
      if (existingPhotos.length === 0) {
        setSelectedPresentationPhotoIndex(Math.max(index, 0));
        return;
      }

      if (index <= 0 || index >= existingPhotos.length) {
        setSelectedPresentationPhotoIndex(Math.max(index, 0));
        return;
      }

      setError(null);

      try {
        const [selectedPhoto] = existingPhotos.splice(index, 1);
        if (!selectedPhoto) return;

        const reorderedPhotos = [selectedPhoto, ...existingPhotos];
        const response = await updateRecord("lavoratori", selectedWorkerId, {
          foto: reorderedPhotos,
        });

        applyUpdatedWorkerRow(asLavoratoreRecord(response.row));
        setSelectedPresentationPhotoIndex(0);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando la foto principale",
        );
      }
    },
    [
      applyUpdatedWorkerRow,
      selectedWorkerId,
      selectedWorkerRow?.foto,
      setError,
      setSelectedPresentationPhotoIndex,
    ],
  );

  return {
    handlePrimaryWorkerPhotoChange,
    handleWorkerPhotoInputChange,
    openWorkerPhotoPicker,
    uploadingWorkerPhoto,
    workerPhotoInputRef,
  };
}
