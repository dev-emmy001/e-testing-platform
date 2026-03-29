import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";

export type ProfileRecord = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  track: string | null;
  created_at: string | null;
};

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? null;
}

async function readProfileById(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRecord | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, email, name, role, track, created_at")
    .eq("id", userId)
    .maybeSingle<ProfileRecord>();

  return data ?? null;
}

function pickProfileByEmail(
  profiles: ProfileRecord[] | null | undefined,
  normalizedEmail: string | null,
) {
  if (!profiles?.length || !normalizedEmail) {
    return null;
  }

  return (
    profiles.find((profile) => normalizeEmail(profile.email) === normalizedEmail) ??
    profiles[0] ??
    null
  );
}

async function repairProfileForUser(user: User): Promise<ProfileRecord | null> {
  const admin = createAdminClient();
  const profileById = await readProfileById(admin, user.id);

  if (profileById) {
    return profileById;
  }

  const normalizedEmail = normalizeEmail(user.email);
  let profileByEmail: ProfileRecord | null = null;

  if (normalizedEmail) {
    const { data: emailMatches } = await admin
      .from("profiles")
      .select("id, email, name, role, track, created_at")
      .ilike("email", normalizedEmail)
      .returns<ProfileRecord[]>();

    profileByEmail = pickProfileByEmail(emailMatches, normalizedEmail);
  }

  const email = user.email?.trim() || profileByEmail?.email?.trim();

  if (!email) {
    return profileByEmail;
  }

  // Keep the signed-in auth user aligned with a readable profiles row.
  const { data: repairedProfile } = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email,
        name: profileByEmail?.name ?? null,
        role: profileByEmail?.role ?? "trainee",
        track: profileByEmail?.track ?? null,
      },
      { onConflict: "id" },
    )
    .select("id, email, name, role, track, created_at")
    .maybeSingle<ProfileRecord>();

  return (
    repairedProfile ?? {
      id: user.id,
      email,
      name: profileByEmail?.name ?? null,
      role: profileByEmail?.role ?? "trainee",
      track: profileByEmail?.track ?? null,
      created_at: profileByEmail?.created_at ?? null,
    }
  );
}

export async function resolveCurrentUserProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<ProfileRecord | null> {
  const profile = await readProfileById(supabase, user.id);

  if (profile) {
    return profile;
  }

  return repairProfileForUser(user);
}

export async function resolveCurrentUserRole(
  supabase: SupabaseClient,
  user: User,
) {
  const profile = await resolveCurrentUserProfile(supabase, user);
  return profile?.role ?? null;
}
