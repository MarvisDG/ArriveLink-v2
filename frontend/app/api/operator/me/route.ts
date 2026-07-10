import { NextResponse } from "next/server";
import { getOperatorProfile } from "@/lib/mock-db";
import { requireOperator } from "@/lib/api-helpers";

export function GET(request: Request) {
  const { error, operator } = requireOperator(request);
  if (error) return error;
  const profile = getOperatorProfile(operator!.id);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(profile);
}
