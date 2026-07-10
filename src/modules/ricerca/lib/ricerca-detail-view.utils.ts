import type { LookupOptionsByField } from "@/modules/crm/types"
import { STATI_RICERCA_CANONICI } from "./stati-ricerca"
import {
  RICERCA_DETAIL_WEEKDAY_ALIASES,
  RICERCA_DETAIL_WEEKDAY_ITEMS,
} from "./ricerca-detail-view.constants"

export function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

export function getFirstArrayValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = toStringValue(item);
      if (normalized) return normalized;
    }
  }
  return toStringValue(value);
}

export function getStringArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toStringValue(item))
      .filter((item): item is string => Boolean(item));
  }
  const single = toStringValue(value);
  return single ? [single] : [];
}

// Ricava l'ordinale del tentativo più alto (es. "3° chiamata..." -> 3).
// Robusto sia alla scrittura cumulativa ("1°, 2°, 3°") sia a quella
// con singolo ordinale ("3°").
export function getCallAttemptCount(value: unknown): number {
  const items = getStringArrayValue(value);
  let maxOrdinal = 0;
  for (const item of items) {
    for (const match of item.matchAll(/\d+/g)) {
      maxOrdinal = Math.max(maxOrdinal, Number(match[0]));
    }
  }
  return maxOrdinal || items.length;
}

export function getFirstPresentValue(
  row: Record<string, unknown>,
  fields: string[],
) {
  for (const field of fields) {
    const value = row[field];
    if (value !== null && value !== undefined) return value;
  }
  return undefined;
}

export function displayBooleanValue(value: unknown) {
  const parsed = toBooleanValue(value);
  if (parsed === true) return "Sì";
  if (parsed === false) return "No";
  return "Non richiesto";
}

export function displayItalianRequirementValue(value: unknown) {
  const parsed = toBooleanValue(value);
  if (parsed === false) return "No";
  return "Sì";
}

export function displayListValue(value: unknown) {
  const values = getStringArrayValue(value);
  if (values.length > 0) return values.join(", ");
  return displayValue(value);
}

export function toBooleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (["true", "1", "si", "sì", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return null;
}

export function formatItalianDate(value: unknown): string {
  const raw = toStringValue(value);
  if (!raw) return "-";

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

export function displayValue(value: unknown): string {
  return toStringValue(value) ?? "-";
}

export function isPlaceholderText(value: string) {
  return value === "-" || value === "—";
}

export function buildAddressLine(address: Record<string, unknown> | null | undefined) {
  if (!address) return null;

  const formatted = toStringValue(address.indirizzo_formattato);
  if (formatted) return formatted;

  return (
    [
      toStringValue(address.via),
      toStringValue(address.civico),
      toStringValue(address.citta),
      toStringValue(address.cap),
    ]
      .filter(
        (item): item is string =>
          typeof item === "string" && !isPlaceholderText(item),
      )
      .join(", ") || null
  );
}

export function selectedLookupOptionValue(
  selected: string | null | undefined,
  options:
    | {
        valueKey: string;
        valueLabel: string;
      }[]
    | undefined,
) {
  const normalizedSelected = normalizeLookupToken(selected);
  if (!normalizedSelected || !options?.length) return "";

  const match = options.find(
    (option) =>
      normalizeLookupToken(option.valueKey) === normalizedSelected ||
      normalizeLookupToken(option.valueLabel) === normalizedSelected,
  );

  return match?.valueKey ?? "";
}

export function buildLookupOptionsByField(rows: Array<Record<string, unknown>>): LookupOptionsByField {
  return rows.reduce<LookupOptionsByField>((acc, row) => {
    if (row.is_active === false) return acc;
    if (toStringValue(row.entity_table) !== "processi_matching") return acc;

    const field = toStringValue(row.entity_field);
    const valueKey = toStringValue(row.value_key);
    const valueLabel = toStringValue(row.value_label);
    if (!field || !valueKey || !valueLabel) return acc;

    const sortOrder =
      typeof row.sort_order === "number" && Number.isFinite(row.sort_order)
        ? row.sort_order
        : null;
    const color =
      row.metadata &&
      typeof row.metadata === "object" &&
      "color" in row.metadata
        ? toStringValue((row.metadata as Record<string, unknown>).color)
        : null;
    const options = acc[field] ?? [];
    options.push({ valueKey, valueLabel, color, sortOrder });
    options.sort((left, right) => {
      const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.valueLabel.localeCompare(right.valueLabel, "it");
    });
    acc[field] = options;
    return acc;
  }, {});
}

export function buildCanonicalStatoRicercaOptions(
  options: LookupOptionsByField[string] | undefined,
) {
  const optionsByIdOrLabel = new Map(
    (options ?? []).flatMap((option) => [
      [normalizeLookupToken(option.valueKey), option],
      [normalizeLookupToken(option.valueLabel), option],
    ]),
  );

  return STATI_RICERCA_CANONICI.map((stato) => {
    const lookupOption =
      optionsByIdOrLabel.get(normalizeLookupToken(stato.id)) ??
      optionsByIdOrLabel.get(normalizeLookupToken(stato.label));

    return {
      valueKey: lookupOption?.valueKey ?? stato.id,
      valueLabel: lookupOption?.valueLabel ?? stato.label,
      color: lookupOption?.color ?? stato.color,
      sortOrder: stato.sortOrder,
    };
  });
}

export function editableValue(value: unknown) {
  const normalized = toStringValue(value);
  return normalized && normalized !== "-" ? normalized : "";
}


export function normalizeWeekdayList(values: string[] | null | undefined): string[] {
  if (!values) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const token = raw.trim().toLowerCase();
    const canonical = RICERCA_DETAIL_WEEKDAY_ALIASES[token];
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
    }
  }
  return RICERCA_DETAIL_WEEKDAY_ITEMS.filter((day) => seen.has(day));
}

export function toIsoDateInputValue(value: string | null | undefined) {
  const normalized = editableValue(value);
  if (!normalized) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

  const parts = normalized.split("/");
  if (parts.length !== 3) return "";
  const [day, month, year] = parts;
  if (!day || !month || !year) return "";
  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
}