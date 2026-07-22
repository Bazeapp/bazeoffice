import { z } from "zod"

const optionalString = z.string()
const optionalStringArray = z.array(z.string())

/** Form keys for `OnboardingCard` (processo + indirizzo + fee). */
export const onboardingCardFormSchema = z.object({
  orario_di_lavoro: optionalString,
  ore_settimanale: optionalString,
  numero_giorni_settimanali: optionalString,
  preferenza_giorno: optionalStringArray,
  provincia_sigla: optionalString,
  cap: optionalString,
  via: optionalString,
  note: optionalString,
  src_embed_maps_annucio: optionalString,
  deadline_mobile: optionalString,
  disponibilita_colloqui_in_presenza: optionalString,
  tipo_incontro_famiglia_lavoratore: optionalString,
  fee_concordata: optionalString,
  offerta: optionalString,
})

export type OnboardingCardFormValues = z.infer<typeof onboardingCardFormSchema>

const onboardingDecisioneLavoroFormBaseSchema = z.object({
  nucleo_famigliare: optionalString,
  descrizione_casa: optionalString,
  metratura_casa: optionalString,
  descrizione_animali_in_casa: optionalString,
  mansioni_richieste: optionalString,
  informazioni_extra_riservate: optionalString,
  descrizione_richiesta_trasferte: optionalString,
  descrizione_richiesta_ferie: optionalString,
  eta_minima: optionalString,
  eta_massima: optionalString,
  sesso: optionalString,
  patenteDettaglio: optionalString,
  nazionalita_escluse: optionalStringArray,
  nazionalita_obbligatorie: optionalStringArray,
  richiesta_trasferte: z.boolean(),
  richiesta_ferie: z.boolean(),
  richiesta_patente: z.boolean(),
  presenza_neonati: z.boolean(),
  piu_bambini: z.boolean(),
  famiglia_4_persone: z.boolean(),
  cani_piccoli: z.boolean(),
  cani_grandi: z.boolean(),
  gatti: z.boolean(),
  pulire_ripiani_alti: z.boolean(),
  stirare: z.boolean(),
  stirare_abiti_difficili: z.boolean(),
  cucinare: z.boolean(),
  cucinare_elaborato: z.boolean(),
  cura_piante: z.boolean(),
  comunicare_bene_italiano: z.boolean(),
  comunicare_bene_inglese: z.boolean(),
  famiglia_molto_esigente: z.boolean(),
  richiesta_autonomia: z.boolean(),
  datore_spesso_presente: z.boolean(),
  richiesta_discrezione: z.boolean(),
})

/** Form keys for `OnboardingDecisioneLavoroSection`. */
export const onboardingDecisioneLavoroFormSchema =
  onboardingDecisioneLavoroFormBaseSchema.superRefine((data, ctx) => {
    const minRaw = data.eta_minima.trim()
    const maxRaw = data.eta_massima.trim()
    if (!minRaw || !maxRaw) return

    const min = Number.parseInt(minRaw, 10)
    const max = Number.parseInt(maxRaw, 10)
    if (Number.isNaN(min) || Number.isNaN(max)) return

    if (min > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "L'età minima non può essere maggiore dell'età massima.",
        path: ["eta_massima"],
      })
    }
  })

export type OnboardingDecisioneLavoroFormValues = z.infer<
  typeof onboardingDecisioneLavoroFormSchema
>

/** Form keys for `OnboardingContextCard`. */
export const onboardingContextFormSchema = z.object({
  coldAttempts: optionalStringArray,
  noShowAttempts: optionalStringArray,
  dataRicontatto: optionalString,
  dataCall: optionalString,
  noteStato: optionalString,
  motivazioneLost: optionalString,
  motivazioneOot: optionalString,
  statoRes: optionalString,
})

export type OnboardingContextFormValues = z.infer<typeof onboardingContextFormSchema>
