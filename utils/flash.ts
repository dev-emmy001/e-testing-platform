import { cookies } from "next/headers";

export type FlashState = {
  error?: string;
  message?: string;
};

const FLASH_COOKIE_NAME = "__flash";
const FLASH_COOKIE_MAX_AGE_SECONDS = 60;

function normalizeFlashState(state: FlashState) {
  const error = state.error?.trim();
  const message = state.message?.trim();

  if (!error && !message) {
    return null;
  }

  return {
    error,
    message,
  };
}

function parseFlashCookieValue(value: string): FlashState {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as FlashState;
    const normalized = normalizeFlashState(parsed);

    return normalized ?? {};
  } catch {
    return {};
  }
}

export async function readFlash(): Promise<FlashState> {
  const cookieStore = await cookies();
  const value = cookieStore.get(FLASH_COOKIE_NAME)?.value;

  if (!value) {
    return {};
  }

  return parseFlashCookieValue(value);
}

export async function setFlash(state: FlashState): Promise<void> {
  const cookieStore = await cookies();
  const normalized = normalizeFlashState(state);

  if (!normalized) {
    cookieStore.delete(FLASH_COOKIE_NAME);
    return;
  }

  cookieStore.set({
    name: FLASH_COOKIE_NAME,
    value: Buffer.from(JSON.stringify(normalized)).toString("base64url"),
    httpOnly: true,
    maxAge: FLASH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearFlash(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(FLASH_COOKIE_NAME);
}
