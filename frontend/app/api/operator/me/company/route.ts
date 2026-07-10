import { NextResponse } from "next/server";
import { updateOperatorCompany } from "@/lib/mock-db";
import { jsonError, requireOperator } from "@/lib/api-helpers";

export async function PUT(request: Request) {
  const { error, operator } = requireOperator(request);
  if (error) return error;

  try {
    const body = await request.json();
    const company = updateOperatorCompany(operator!.company_id, body);
    return NextResponse.json(company);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Update failed");
  }
}
