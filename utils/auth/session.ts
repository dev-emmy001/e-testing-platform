import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type ProfileRecord = {
  id: string;
  email: string;
  role: string;
  created_at: string | null;
};

type UserContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User | null;
  profile: ProfileRecord | null;
};

type AuthenticatedUserContext = UserContext & {
  user: User;
};

type AdminUserContext = AuthenticatedUserContext & {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, created_at")
    .eq("id", user.id)
    .maybeSingle<ProfileRecord>();

  return {
    supabase,
    user,
    profile: profile ?? null,
  };
}

export async function requireUserContext(nextPath = "/"): Promise<AuthenticatedUserContext> {
  const context = await getCurrentUserContext();

  if (!context.user) {
    redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  }

  return context as AuthenticatedUserContext;
}

export async function requireAdminContext(nextPath = "/admin"): Promise<AdminUserContext> {
  const context = await requireUserContext(nextPath);

  if (!context.profile || context.profile.role !== "admin") {
    redirect("/");
  }

  return context as AdminUserContext;
}
