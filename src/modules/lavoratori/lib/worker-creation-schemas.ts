import { z } from "zod"

/** Submit form for `AddReferenceAction` (Nuova referenza dialog). */
export const newWorkerReferenceFormSchema = z
  .object({
    nome_datore: z.string(),
    cognome_datore: z.string(),
    telefono_datore: z.string(),
  })
  .superRefine((data, ctx) => {
    const hasIdentity =
      data.nome_datore.trim().length > 0 || data.cognome_datore.trim().length > 0
    const hasPhone = data.telefono_datore.trim().length > 0
    if (!hasIdentity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Inserisci almeno uno tra nome e cognome.",
        path: ["nome_datore"],
      })
    }
    if (!hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Inserisci il telefono.",
        path: ["telefono_datore"],
      })
    }
  })

export type NewWorkerReferenceFormValues = z.infer<typeof newWorkerReferenceFormSchema>

const newWorkerExperienceFormBaseSchema = z.object({
  tipo_lavoro: z.array(z.string()),
  tipo_rapporto: z.string(),
  data_inizio: z.string(),
  data_fine: z.string(),
  stato_esperienza_attiva: z.boolean(),
  descrizione: z.string(),
  descrizione_contesto_lavorativo: z.string(),
  motivazione_fine_rapporto: z.string(),
})

/** Submit form for `AddExperienceAction` (Nuova esperienza dialog). */
export const newWorkerExperienceFormSchema = newWorkerExperienceFormBaseSchema.superRefine(
  (data, ctx) => {
    if (data.stato_esperienza_attiva) return
    if (!data.data_inizio || !data.data_fine) return
    if (data.data_fine < data.data_inizio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La data fine non può precedere la data inizio.",
        path: ["data_fine"],
      })
    }
  },
)

export type NewWorkerExperienceFormValues = z.infer<typeof newWorkerExperienceFormSchema>

export const NEW_WORKER_EXPERIENCE_FORM_DEFAULTS: NewWorkerExperienceFormValues = {
  tipo_lavoro: [],
  tipo_rapporto: "",
  data_inizio: "",
  data_fine: "",
  stato_esperienza_attiva: false,
  descrizione: "",
  descrizione_contesto_lavorativo: "",
  motivazione_fine_rapporto: "",
}
