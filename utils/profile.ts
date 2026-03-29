type ProfileIdentity = {
  email?: string | null;
  name?: string | null;
  track?: string | null;
};

export function normalizeProfileText(value: string | null | undefined) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function getProfileDisplayName(
  profile: ProfileIdentity | null | undefined,
) {
  return (
    normalizeProfileText(profile?.name) ||
    normalizeProfileText(profile?.email) ||
    "Trainee"
  );
}

export function getProfileTrack(profile: ProfileIdentity | null | undefined) {
  return normalizeProfileText(profile?.track) || null;
}

export function getProfileMetaLine(
  profile: ProfileIdentity | null | undefined,
) {
  const track = getProfileTrack(profile);
  const email = normalizeProfileText(profile?.email);

  return [track, email].filter(Boolean).join(" · ");
}

export function isProfileComplete(
  profile: ProfileIdentity | null | undefined,
) {
  return Boolean(
    normalizeProfileText(profile?.name) && normalizeProfileText(profile?.track),
  );
}
