export function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (value) {
    return value;
  }

  throw new Error("Missing Supabase environment variable: NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabasePublishableKey() {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (value) {
    return value;
  }

  throw new Error(
    "Missing Supabase environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export function getSupabaseServiceRoleKey() {
  const value =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (value) {
    return value;
  }

  throw new Error(
    "Missing Supabase environment variable: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY",
  );
}
