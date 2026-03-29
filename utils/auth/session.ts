import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getOnboardingPath } from "@/utils/auth/redirect";
import {
  resolveCurrentUserProfile,
  type ProfileRecord,
} from "@/utils/auth/profile";
import { isProfileComplete } from "@/utils/profile";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;
type AdminSupabaseClient = ReturnType<typeof createAdminClient>;

type UserContext = {
  supabase: ServerSupabaseClient;
  user: User | null;
  profile: ProfileRecord | null;
};

type AuthenticatedUserContext = UserContext & {
  user: User;
};

type AdminUserContext = {
  supabase: AdminSupabaseClient;
  user: User;
  profile: ProfileRecord;
};

export async function getCurrentUserContext(): Promise<UserContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      profile: null,
    };
  }

  const profile = await resolveCurrentUserProfile(supabase, user);

  return {
    supabase,
    user,
    profile,
  };
}

export async function requireUserContext(
  nextPath = "/",
  options?: {
    allowIncompleteProfile?: boolean;
  },
): Promise<AuthenticatedUserContext> {
  const context = await getCurrentUserContext();

  if (!context.user) {
    redirect(`/?next=${encodeURIComponent(nextPath)}`);
  }

  if (!options?.allowIncompleteProfile && !isProfileComplete(context.profile)) {
    redirect(getOnboardingPath(nextPath));
  }

  return context as AuthenticatedUserContext;
}

export async function requireAdminContext(
  nextPath = "/admin",
): Promise<AdminUserContext> {
  const context = await requireUserContext(nextPath);

  if (!context.profile || context.profile.role !== "admin") {
    redirect("/");
  }

  return {
    supabase: createAdminClient(),
    user: context.user,
    profile: context.profile,
  };
}
