import { useWatch } from "react-hook-form"

import { asString } from "../lib/base-utils"
import { getWorkerQualificationStatus } from "../lib/status-utils"
import { resolveLookupSingleValueOptions } from "../lib/lookup-utils"
import type {
  WorkerProfileOverviewProps,
  WorkerProfileOverviewValues,
} from "./worker-profile-overview.types"

export function useWorkerProfileOverviewValues({
  worker,
  workerRow,
  useFormFields = false,
  draft,
  livelloItaliano,
  livelloItalianoOptions = [],
  sessoOptions = [],
  nazionalitaOptions = [],
}: Pick<
  WorkerProfileOverviewProps,
  | "worker"
  | "workerRow"
  | "useFormFields"
  | "draft"
  | "livelloItaliano"
  | "livelloItalianoOptions"
  | "sessoOptions"
  | "nazionalitaOptions"
>): WorkerProfileOverviewValues {
  const formEmail = useWatch({ name: "email", disabled: !useFormFields }) as
    | string
    | undefined
  const formTelefono = useWatch({ name: "telefono", disabled: !useFormFields }) as
    | string
    | undefined
  const formSesso = useWatch({ name: "sesso", disabled: !useFormFields }) as
    | string
    | undefined
  const formNazionalita = useWatch({
    name: "nazionalita",
    disabled: !useFormFields,
  }) as string | undefined
  const formDataNascita = useWatch({
    name: "data_di_nascita",
    disabled: !useFormFields,
  }) as string | undefined
  const formDescrizione = useWatch({
    name: "descrizione_pubblica",
    disabled: !useFormFields,
  }) as string | undefined
  const formLivelloItaliano = useWatch({
    name: "livello_italiano",
    disabled: !useFormFields,
  }) as string | undefined

  const qualificationStatus = getWorkerQualificationStatus(worker)
  const canUseSessoSelect = sessoOptions.length > 0

  const resolvedLivelloItaliano =
    useFormFields && typeof formLivelloItaliano === "string"
      ? formLivelloItaliano
      : (livelloItaliano ?? "")

  const resolvedSesso =
    useFormFields && typeof formSesso === "string"
      ? formSesso
      : (draft?.sesso ?? asString(workerRow.sesso))

  const resolvedNazionalita =
    useFormFields && typeof formNazionalita === "string"
      ? formNazionalita
      : (draft?.nazionalita ?? asString(workerRow.nazionalita))

  const resolvedDataNascita =
    useFormFields && typeof formDataNascita === "string"
      ? formDataNascita
      : (draft?.data_di_nascita ?? asString(workerRow.data_di_nascita))

  const email =
    useFormFields && typeof formEmail === "string"
      ? formEmail
      : (draft?.email ?? asString(workerRow.email))

  const telefono =
    useFormFields && typeof formTelefono === "string"
      ? formTelefono
      : (draft?.telefono ?? asString(workerRow.telefono))

  const descrizione =
    useFormFields && typeof formDescrizione === "string"
      ? formDescrizione
      : (draft?.descrizione_pubblica ?? asString(workerRow.descrizione_pubblica))

  return {
    qualificationStatus,
    canUseSessoSelect,
    email,
    telefono,
    descrizione,
    livelloItaliano: resolvedLivelloItaliano,
    livelloItalianoOptions: resolveLookupSingleValueOptions(
      resolvedLivelloItaliano,
      livelloItalianoOptions,
    ),
    sesso: resolvedSesso,
    nazionalita: resolvedNazionalita,
    sessoOptions: resolveLookupSingleValueOptions(resolvedSesso, sessoOptions),
    nazionalitaOptions: resolveLookupSingleValueOptions(
      resolvedNazionalita,
      nazionalitaOptions,
    ),
    dataNascita: resolvedDataNascita,
  }
}
