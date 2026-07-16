import { StarIcon, UploadIcon } from "lucide-react"

import { EnlargeableAvatar } from "@/components/shared-next/enlargeable-avatar"
import { getWorkerCardInitials } from "../lib/card-utils"
import { AttachmentImage } from "@/components/shared-next/attachment-image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"
import { WorkerProfileOverviewDetails } from "./worker-profile-overview-details"
import { WorkerProfileOverviewIdentity } from "./worker-profile-overview-identity"
import { useWorkerProfileOverviewValues } from "./worker-profile-overview-values"
import type {
  WorkerProfileOverviewProps,
  WorkerProfileQualificationStatus,
} from "./worker-profile-overview.types"
import type { LavoratoreListItem } from "./lavoratore-card"

export type { WorkerProfileOverviewProps } from "./worker-profile-overview.types"

export function WorkerProfileOverview({
  worker,
  workerRow,
  isEditing = false,
  useFormFields = false,
  draft,
  livelloItaliano,
  livelloItalianoOptions = [],
  sessoOptions = [],
  nazionalitaOptions = [],
  lookupColorsByDomain = new Map(),
  presentationPhotoSlots = [],
  selectedPresentationPhotoIndex = 0,
  showUploadPhotoAction = false,
  uploadingPhoto = false,
  onUploadPhoto,
  onSelectedPresentationPhotoIndexChange,
  onLivelloItalianoChange,
  onFieldChange,
}: WorkerProfileOverviewProps) {
  const values = useWorkerProfileOverviewValues({
    worker,
    workerRow,
    useFormFields,
    draft,
    livelloItaliano,
    livelloItalianoOptions,
    sessoOptions,
    nazionalitaOptions,
  })

  return (
    <div className="mb-6 flex items-start gap-4">
      <WorkerProfileOverviewPhotoColumn
        worker={worker}
        isEditing={isEditing}
        presentationPhotoSlots={presentationPhotoSlots}
        selectedPresentationPhotoIndex={selectedPresentationPhotoIndex}
        showUploadPhotoAction={showUploadPhotoAction}
        uploadingPhoto={uploadingPhoto}
        qualificationStatus={values.qualificationStatus}
        onUploadPhoto={onUploadPhoto}
        onSelectedPresentationPhotoIndexChange={
          onSelectedPresentationPhotoIndexChange
        }
      />

      <div className="min-w-0 flex-1">
        <WorkerProfileOverviewIdentity
          worker={worker}
          workerRow={workerRow}
          isEditing={isEditing}
          useFormFields={useFormFields}
          draft={draft}
          values={values}
          onFieldChange={onFieldChange}
        />
        <WorkerProfileOverviewDetails
          workerRow={workerRow}
          isEditing={isEditing}
          useFormFields={useFormFields}
          draft={draft}
          livelloItaliano={livelloItaliano}
          livelloItalianoOptions={livelloItalianoOptions}
          lookupColorsByDomain={lookupColorsByDomain}
          values={values}
          onLivelloItalianoChange={onLivelloItalianoChange}
          onFieldChange={onFieldChange}
        />
      </div>
    </div>
  )
}

function WorkerProfileOverviewPhotoColumn({
  worker,
  isEditing,
  presentationPhotoSlots,
  selectedPresentationPhotoIndex,
  showUploadPhotoAction,
  uploadingPhoto,
  qualificationStatus,
  onUploadPhoto,
  onSelectedPresentationPhotoIndexChange,
}: {
  worker: LavoratoreListItem
  isEditing: boolean
  presentationPhotoSlots: string[]
  selectedPresentationPhotoIndex: number
  showUploadPhotoAction: boolean
  uploadingPhoto: boolean
  qualificationStatus: WorkerProfileQualificationStatus
  onUploadPhoto?: () => void
  onSelectedPresentationPhotoIndexChange?: (value: number) => void
}) {
  const StatusIcon = qualificationStatus.icon

  return (
    <div className="flex shrink-0 flex-col items-start gap-2 self-start">
      {isEditing && presentationPhotoSlots.length > 0 ? (
        <div
          className={cn(
            "relative h-32 w-32 overflow-hidden rounded-lg border",
            qualificationStatus.ringClassName,
          )}
          title={qualificationStatus.label}
        >
          <Carousel
            key={presentationPhotoSlots.join("|")}
            opts={{ loop: false }}
            className="h-full w-full"
          >
            <CarouselContent className="ml-0 h-full">
              {presentationPhotoSlots.map((photoUrl, index) => (
                <CarouselItem key={photoUrl} className="h-full basis-full pl-0">
                  <div className="h-full">
                    <Card className="h-full rounded-none border-0 shadow-none">
                      <CardContent className="bg-muted/20 relative flex h-full items-center justify-center p-0">
                        <AttachmentImage
                          src={photoUrl}
                          alt={`Foto profilo ${index + 1}`}
                          downloadName={`Foto profilo ${index + 1}`}
                          loading={index === 0 ? "eager" : "lazy"}
                          decoding="async"
                          className="h-full w-full object-contain"
                        />
                        {onSelectedPresentationPhotoIndexChange ? (
                          <Button
                            type="button"
                            size="icon-sm"
                            variant={
                              selectedPresentationPhotoIndex === index
                                ? "default"
                                : "secondary"
                            }
                            aria-label={
                              selectedPresentationPhotoIndex === index
                                ? "Foto principale"
                                : "Imposta come foto principale"
                            }
                            title={
                              selectedPresentationPhotoIndex === index
                                ? "Foto principale"
                                : "Imposta come foto principale"
                            }
                            className="absolute top-2 right-2 rounded-full bg-background/90"
                            onClick={() =>
                              onSelectedPresentationPhotoIndexChange(index)
                            }
                          >
                            <StarIcon className="size-4" />
                          </Button>
                        ) : null}
                        <span
                          className={cn(
                            "absolute left-2 bottom-2 inline-flex size-5 items-center justify-center rounded-full",
                            qualificationStatus.badgeClassName,
                          )}
                        >
                          <StatusIcon className="size-3.5" />
                        </span>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </div>
      ) : (
        <div className="relative inline-block">
          <EnlargeableAvatar
            size="xl"
            hasPhoto={worker.hasRealPhoto}
            src={worker.immagineUrl}
            type={worker.immagineType}
            alt={worker.nomeCompleto}
            fallback={getWorkerCardInitials(worker.nomeCompleto)}
            className={qualificationStatus.ringClassName}
          />
          <span
            aria-hidden
            title={qualificationStatus.label}
            className={cn(
              "absolute -bottom-0.5 -right-0.5 inline-flex size-5 items-center justify-center rounded-full ring-2 ring-white",
              qualificationStatus.badgeClassName,
            )}
          >
            <StatusIcon className="size-3" />
          </span>
        </div>
      )}
      {isEditing && showUploadPhotoAction ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploadingPhoto || !onUploadPhoto}
          onClick={onUploadPhoto}
          className="w-full justify-center"
        >
          <UploadIcon className="size-3.5" />
          {uploadingPhoto ? "Caricamento..." : "Carica"}
        </Button>
      ) : null}
    </div>
  )
}
