function toPrivateAreaText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized === "-") return null;
  return normalized ? normalized : null;
}

export function buildFamilyPrivateAreaUrl(email: unknown, familyId: unknown) {
  const normalizedEmail = toPrivateAreaText(email);
  const normalizedFamilyId = toPrivateAreaText(familyId);
  if (!normalizedEmail || !normalizedFamilyId) return null;

  const idParts = normalizedFamilyId.split("-");
  const sort = idParts.length > 1
    ? idParts[idParts.length - 1]
    : normalizedFamilyId.slice(-12);
  if (!sort) return null;

  const params = new URLSearchParams({
    email: normalizedEmail,
    sort,
    utm_source: "entry_point",
  });

  return `https://app.bazeapp.com/v2/auth/entry-point?${params.toString()}`;
}
