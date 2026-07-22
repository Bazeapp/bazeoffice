export const RICERCA_DETAIL_WEEKDAY_ITEMS = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica",
] as const

export const RICERCA_DETAIL_WEEKDAY_ALIASES: Record<
  string,
  (typeof RICERCA_DETAIL_WEEKDAY_ITEMS)[number]
> = {
  lunedi: "Lunedì",
  lunedì: "Lunedì",
  martedi: "Martedì",
  martedì: "Martedì",
  mercoledi: "Mercoledì",
  mercoledì: "Mercoledì",
  giovedi: "Giovedì",
  giovedì: "Giovedì",
  venerdi: "Venerdì",
  venerdì: "Venerdì",
  sabato: "Sabato",
  domenica: "Domenica",
}

export const RICERCA_DETAIL_EDIT_FAMILY_KEYS = new Set(["telefono", "email"])
export const RICERCA_DETAIL_EDIT_ADDRESS_KEYS = new Set([
  "cap",
  "note",
  "via",
  "civico",
  "citta",
  "citofono",
])
export const RICERCA_DETAIL_EDIT_DATE_KEYS = new Set([
  "deadline_mobile",
  "data_assegnazione",
])
export const RICERCA_DETAIL_EDIT_BOOLEAN_KEYS = new Set([
  "richiesta_patente",
  "richiesta_trasferte",
  "richiesta_ferie",
  "comunicare_bene_italiano",
  "comunicare_bene_inglese",
  "famiglia_molto_esigente",
  "richiesta_autonomia",
  "datore_spesso_presente",
  "richiesta_discrezione",
])
