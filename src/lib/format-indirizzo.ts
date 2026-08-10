import { toStringValue } from "@/lib/value-utils"

export type IndirizzoLike = {
  citofono?: unknown
  via?: unknown
  civico?: unknown
  citta?: unknown
  cap?: unknown
  provincia_sigla?: unknown
  paese?: unknown
  note?: unknown
}

export type FormatIndirizzoOptions = {
  /** Include citofono when present. Default true. */
  includeCitofono?: boolean
  /** Include paese when present. Default true. */
  includePaese?: boolean
  /**
   * When street parts are empty, fall back to the first segment of `note`
   * (quartiere shorthand used on board cards). Default false.
   */
  fallbackNote?: boolean
  /**
   * `"full"` joins street, locality, province, paese.
   * `"street"` returns only via + civico (for required-field checks).
   * `"compact"` uses " • " separators (board/map labels).
   */
  style?: "full" | "street" | "compact"
}

function asPart(value: unknown): string | null {
  return toStringValue(value)
}

/**
 * Compose a human-readable address from `indirizzi` row fields.
 * Never uses the obsolete `indirizzo_formattato` column.
 */
export function formatIndirizzo(
  address: IndirizzoLike | null | undefined,
  options: FormatIndirizzoOptions = {},
): string | null {
  if (!address) return null

  const {
    includeCitofono = true,
    includePaese = true,
    fallbackNote = false,
    style = "full",
  } = options

  const via = asPart(address.via)
  const civico = asPart(address.civico)
  const street = [via, civico].filter(Boolean).join(" ").trim() || null
  const citofonoRaw = includeCitofono ? asPart(address.citofono) : null
  const citofono = citofonoRaw ? `Cit. ${citofonoRaw}` : null
  const citta = asPart(address.citta)
  const cap = asPart(address.cap)
  const provinciaSigla = asPart(address.provincia_sigla)
  const paese = includePaese ? asPart(address.paese) : null
  const noteFallback =
    fallbackNote && !street
      ? asPart(address.note)?.split("-")[0]?.trim() || null
      : null
  const streetOrNote = street || noteFallback

  if (style === "street") {
    return street
  }

  if (style === "compact") {
    const locality = [citta, provinciaSigla, cap].filter(Boolean)
    return (
      [streetOrNote, ...locality]
        .filter(
          (value, index, values): value is string =>
            Boolean(value) && values.indexOf(value) === index,
        )
        .join(" • ") || null
    )
  }

  const locality = [cap, citta].filter(Boolean).join(" ").trim() || null
  const localityWithProvince = provinciaSigla
    ? locality
      ? `${locality} (${provinciaSigla})`
      : provinciaSigla
    : locality

  return (
    [citofono, streetOrNote, localityWithProvince, paese]
      .filter(
        (value, index, values): value is string =>
          Boolean(value) && values.indexOf(value) === index,
      )
      .join(", ") || null
  )
}
