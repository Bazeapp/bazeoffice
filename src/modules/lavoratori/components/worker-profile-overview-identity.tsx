import { asString } from "../lib/base-utils"
import {
  WorkerProfileOverviewTextField,
  WorkerProfileOverviewTextareaField,
} from "./worker-profile-overview-fields"
import type {
  WorkerProfileOverviewDraft,
  WorkerProfileOverviewValues,
} from "./worker-profile-overview.types"
import type { LavoratoreListItem } from "./lavoratore-card"
import type { LavoratoreRecord } from "../types/lavoratore"

type WorkerProfileOverviewIdentityProps = {
  worker: LavoratoreListItem
  workerRow: LavoratoreRecord
  isEditing: boolean
  useFormFields: boolean
  draft?: WorkerProfileOverviewDraft
  values: WorkerProfileOverviewValues
  onFieldChange?: (field: string, value: string) => void
}

export function WorkerProfileOverviewIdentity({
  worker,
  workerRow,
  isEditing,
  useFormFields,
  draft,
  values,
  onFieldChange,
}: WorkerProfileOverviewIdentityProps) {
  if (isEditing && (useFormFields || draft)) {
    return (
      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <WorkerProfileOverviewTextField
            name="nome"
            useFormFields={useFormFields}
            draftValue={draft?.nome}
            onFieldChange={onFieldChange}
            placeholder="Nome"
            className="w-full sm:max-w-52"
          />
          <WorkerProfileOverviewTextField
            name="cognome"
            useFormFields={useFormFields}
            draftValue={draft?.cognome}
            onFieldChange={onFieldChange}
            placeholder="Cognome"
            className="w-full sm:max-w-52"
          />
        </div>
        <WorkerProfileOverviewTextareaField
          name="descrizione_pubblica"
          useFormFields={useFormFields}
          draftValue={draft?.descrizione_pubblica}
          onFieldChange={onFieldChange}
          rows={3}
          className="min-h-24"
        />
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <div className="flex items-start gap-2">
        <p className="truncate text-2xl leading-tight font-semibold">
          {worker.nomeCompleto}
        </p>
      </div>
      <p className="text-muted-foreground line-clamp-4 text-sm leading-5">
        {useFormFields
          ? asString(values.descrizione) || "-"
          : asString(workerRow.descrizione_pubblica) || "-"}
      </p>
    </div>
  )
}
