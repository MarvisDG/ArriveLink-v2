import { NextResponse } from "next/server";
import { updateCompanyFlags } from "@/lib/mock-db";
import { jsonError, requireAdmin } from "@/lib/api-helpers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const company = updateCompanyFlags(parseInt(id, 10), body);
    return NextResponse.json(company);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Update failed");
  }
}
