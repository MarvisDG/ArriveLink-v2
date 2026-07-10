import { NextResponse } from "next/server";
import { verifyUnlock } from "@/lib/mock-db";
import { jsonError } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(verifyUnlock(body));
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Verification failed");
  }
}
