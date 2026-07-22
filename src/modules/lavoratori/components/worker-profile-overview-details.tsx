import {
  CakeIcon,
  CalendarDaysIcon,
  FlagIcon,
  LanguagesIcon,
  MailIcon,
  PhoneIcon,
  VenusAndMarsIcon,
} from "lucide-react"

import { asString, getAgeFromBirthDate } from "../lib/base-utils"
import { getLookupOptionLabel } from "../lib/lookup-utils"
import { WorkerProfileOverviewDetailRow } from "./worker-profile-overview-detail-row"
import {
  WorkerProfileOverviewLivelloItalianoField,
  WorkerProfileOverviewLookupField,
  WorkerProfileOverviewTextField,
} from "./worker-profile-overview-fields"
import type {
  WorkerProfileOverviewDraft,
  WorkerProfileOverviewLookupOption,
  WorkerProfileOverviewValues,
} from "./worker-profile-overview.types"
import type { LavoratoreRecord } from "../types/lavoratore"

type WorkerProfileOverviewDetailsProps = {
  workerRow: LavoratoreRecord
  isEditing: boolean
  useFormFields: boolean
  draft?: WorkerProfileOverviewDraft
  livelloItaliano?: string
  livelloItalianoOptions: WorkerProfileOverviewLookupOption[]
  lookupColorsByDomain: Map<string, string>
  values: WorkerProfileOverviewValues
  onLivelloItalianoChange?: (value: string) => void
  onFieldChange?: (field: string, value: string) => void
}

export function WorkerProfileOverviewDetails({
  workerRow,
  isEditing,
  useFormFields,
  draft,
  livelloItaliano,
  livelloItalianoOptions,
  lookupColorsByDomain,
  values,
  onLivelloItalianoChange,
  onFieldChange,
}: WorkerProfileOverviewDetailsProps) {
  const canEditDraftFields = isEditing && (useFormFields || Boolean(draft))
  const canEditLivelloItaliano =
    isEditing && (useFormFields || livelloItaliano !== undefined)

  return (
    <div className="space-y-2 pt-3">
      <WorkerProfileOverviewDetailRow icon={MailIcon}>
        {canEditDraftFields ? (
          <WorkerProfileOverviewTextField
            name="email"
            useFormFields={useFormFields}
            draftValue={draft?.email}
            onFieldChange={onFieldChange}
            type="email"
            className="max-w-md"
          />
        ) : (
          <span className="truncate">
            {useFormFields
              ? asString(values.email) || "-"
              : asString(workerRow.email) || "-"}
          </span>
        )}
      </WorkerProfileOverviewDetailRow>

      <WorkerProfileOverviewDetailRow icon={PhoneIcon}>
        {canEditDraftFields ? (
          <WorkerProfileOverviewTextField
            name="telefono"
            useFormFields={useFormFields}
            draftValue={draft?.telefono}
            onFieldChange={onFieldChange}
            type="tel"
            className="max-w-xs"
          />
        ) : (
          <span className="truncate">
            {useFormFields
              ? asString(values.telefono) || "-"
              : asString(workerRow.telefono) || "-"}
          </span>
        )}
      </WorkerProfileOverviewDetailRow>

      <WorkerProfileOverviewDetailRow
        icon={LanguagesIcon}
        title="Livello italiano"
      >
        {canEditLivelloItaliano ? (
          <WorkerProfileOverviewLivelloItalianoField
            useFormFields={useFormFields}
            livelloItaliano={livelloItaliano}
            livelloItalianoOptions={livelloItalianoOptions}
            resolvedLivelloItalianoOptions={values.livelloItalianoOptions}
            lookupColorsByDomain={lookupColorsByDomain}
            onLivelloItalianoChange={onLivelloItalianoChange}
          />
        ) : (
          <span className="truncate">
            {values.livelloItaliano
              ? getLookupOptionLabel(
                  values.livelloItalianoOptions,
                  values.livelloItaliano,
                )
              : "-"}
          </span>
        )}
      </WorkerProfileOverviewDetailRow>

      <WorkerProfileOverviewDetailRow icon={VenusAndMarsIcon}>
        {canEditDraftFields ? (
          values.canUseSessoSelect ? (
            <WorkerProfileOverviewLookupField
              name="sesso"
              useFormFields={useFormFields}
              draftValue={draft?.sesso}
              options={values.sessoOptions}
              onFieldChange={onFieldChange}
              placeholder="Seleziona sesso"
              className="w-full max-w-xs"
            />
          ) : (
            <WorkerProfileOverviewTextField
              name="sesso"
              useFormFields={useFormFields}
              draftValue={draft?.sesso}
              onFieldChange={onFieldChange}
              className="max-w-xs"
            />
          )
        ) : (
          <span className="truncate">{values.sesso || "-"}</span>
        )}
      </WorkerProfileOverviewDetailRow>

      <WorkerProfileOverviewDetailRow icon={FlagIcon}>
        {canEditDraftFields ? (
          <WorkerProfileOverviewLookupField
            name="nazionalita"
            useFormFields={useFormFields}
            draftValue={draft?.nazionalita}
            options={values.nazionalitaOptions}
            onFieldChange={onFieldChange}
            placeholder="Seleziona nazionalita"
            emptyLabel="Non indicata"
            className="w-full max-w-xs"
          />
        ) : (
          <span className="truncate">{values.nazionalita || "-"}</span>
        )}
      </WorkerProfileOverviewDetailRow>

      <WorkerProfileOverviewDetailRow icon={CalendarDaysIcon}>
        {canEditDraftFields ? (
          <WorkerProfileOverviewTextField
            name="data_di_nascita"
            useFormFields={useFormFields}
            draftValue={draft?.data_di_nascita}
            onFieldChange={onFieldChange}
            type="date"
            className="max-w-xs"
          />
        ) : (
          <span className="truncate">{values.dataNascita || "-"}</span>
        )}
      </WorkerProfileOverviewDetailRow>

      <WorkerProfileOverviewDetailRow icon={CakeIcon}>
        <span className="truncate">
          {getAgeFromBirthDate(
            useFormFields ? values.dataNascita : workerRow.data_di_nascita,
          ) ?? "-"}
        </span>
      </WorkerProfileOverviewDetailRow>
    </div>
  )
}
