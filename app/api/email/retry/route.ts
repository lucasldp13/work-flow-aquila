import { NextResponse } from "next/server";
import { requireProfile, requireRole, handleApiError } from "@/lib/api/helpers";
import { retryFailedEmails } from "@/lib/email/notify";

export async function POST() {
  try {
    const { profile } = await requireProfile();
    requireRole(profile, ["admin"]);

    const resultados = await retryFailedEmails();
    return NextResponse.json({ resultados });
  } catch (error) {
    return handleApiError(error);
  }
}
