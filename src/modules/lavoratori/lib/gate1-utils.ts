import { getLookupOptionLabel } from "./lookup-utils";
import {
  normalizeDomesticRoleLabels,
  normalizeDomesticRoleLookupValues,
} from "./base-utils";

export const GATE1_IN_PERSON_BOOKING_LINKS = [
  {
    label: "Colloquio Milano",
    href: "https://cal.com/baze-lavoro/colloquio-in-presenza-lavoratori-di-milano",
  },
  {
    label: "Colloquio Torino",
    href: "https://cal.com/baze-lavoro/colloquio-in-presenza-lavoratori-di-torino",
  },
  {
    label: "Colloquio Monza",
    href: "https://cal.com/baze-lavoro/colloquio-monza",
  },
] as const;

export function sanitizeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
}

export function includesBabysitterType(
  values: string[],
  options: Array<{ label: string; value: string }>,
) {
  return (
    normalizeDomesticRoleLabels(values).some((label) => label === "Tata") ||
    normalizeDomesticRoleLookupValues(values, options).some((value) => {
      const label = getLookupOptionLabel(options, value);
      return label.toLowerCase().includes("babysitter");
    })
  );
}
