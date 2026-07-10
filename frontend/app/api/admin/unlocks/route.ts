import { NextResponse } from "next/server";
import { getAdminUnlocks } from "@/lib/mock-db";
import { requireAdmin } from "@/lib/api-helpers";

export function GET(request: Request) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  return NextResponse.json(getAdminUnlocks());
}
