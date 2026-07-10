import { NextResponse } from "next/server";
import { getCompany } from "@/lib/mock-db";
import { jsonError } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const company = getCompany(parseInt(id, 10));
  if (!company) return jsonError("Company not found", 404);
  return NextResponse.json(company);
}
