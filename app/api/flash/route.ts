import { NextResponse } from "next/server";
import { clearFlash } from "@/utils/flash";

export async function POST() {
  await clearFlash();

  return new NextResponse(null, { status: 204 });
}
