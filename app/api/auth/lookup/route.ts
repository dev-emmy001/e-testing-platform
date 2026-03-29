import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

type ProfileLookupRecord = {
  id: string;
  email: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function profileExistsByEmail(email: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("email", email)
    .limit(1)
    .returns<ProfileLookupRecord[]>();

  if (error) {
    throw error;
  }

  return Boolean(data?.length);
}

async function authUserExistsByEmail(email: string) {
  const admin = createAdminClient();

  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    if (
      data.users.some(
        (user) => normalizeEmail(user.email ?? "") === normalizeEmail(email),
      )
    ) {
      return true;
    }

    if (!data.users.length || data.nextPage == null) {
      return false;
    }
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: unknown };
    const rawEmail =
      typeof payload.email === "string" ? normalizeEmail(payload.email) : "";

    if (!isValidEmail(rawEmail)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const isExistingUser =
      (await profileExistsByEmail(rawEmail)) ||
      (await authUserExistsByEmail(rawEmail));

    return NextResponse.json({
      isExistingUser,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "We could not continue with that email.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
