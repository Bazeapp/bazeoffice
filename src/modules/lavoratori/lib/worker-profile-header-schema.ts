import { z } from "zod"

/** Form keys for `WorkerProfileHeader` autosave panel. */
export const workerProfileHeaderFormSchema = z.object({
  nome: z.string(),
  cognome: z.string(),
  descrizione_pubblica: z.string(),
  email: z.string(),
  telefono: z.string(),
  sesso: z.string(),
  nazionalita: z.string(),
  data_di_nascita: z.string(),
})

export type WorkerProfileHeaderFormValues = z.infer<typeof workerProfileHeaderFormSchema>
