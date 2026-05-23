function toPrivateAreaText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized === "-") return null;
  return normalized ? normalized : null;
}

function deriveFamilySort(familyId: unknown) {
  const normalizedFamilyId = toPrivateAreaText(familyId);
  if (!normalizedFamilyId) return null;
  const idParts = normalizedFamilyId.split("-");
  const sort = idParts.length > 1
    ? idParts[idParts.length - 1]
    : normalizedFamilyId.slice(-12);
  return sort ? sort : null;
}

export function buildFamilyPrivateAreaUrl(email: unknown, familyId: unknown) {
  const normalizedEmail = toPrivateAreaText(email);
  const sort = deriveFamilySort(familyId);
  if (!normalizedEmail || !sort) return null;

  const params = new URLSearchParams({
    email: normalizedEmail,
    sort,
    utm_source: "entry_point",
  });

  return `https://app.bazeapp.com/v2/auth/entry-point?${params.toString()}`;
}

export function buildFamilyPresenzeUrl(email: unknown, familyId: unknown) {
  const normalizedEmail = toPrivateAreaText(email);
  const sort = deriveFamilySort(familyId);
  if (!normalizedEmail || !sort) return null;

  const params = new URLSearchParams({
    email: normalizedEmail,
    sort,
    utm_source: "link_invio_presenze",
    go_to: "/famiglie/presenze",
  });

  return `https://app.bazeapp.com/v2/auth/entry-point?${params.toString()}`;
}
