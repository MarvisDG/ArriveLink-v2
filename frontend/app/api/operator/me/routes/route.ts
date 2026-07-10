import { NextResponse } from "next/server";
import { addOperatorRoute, getOperatorRoutes } from "@/lib/mock-db";
import { jsonError, requireOperator } from "@/lib/api-helpers";

export function GET(request: Request) {
  const { error, operator } = requireOperator(request);
  if (error) return error;
  return NextResponse.json(getOperatorRoutes(operator!.company_id));
}

export async function POST(request: Request) {
  const { error, operator } = requireOperator(request);
  if (error) return error;

  try {
    const body = await request.json();
    const route = addOperatorRoute(operator!.company_id, body);
    return NextResponse.json(route);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Failed to add route");
  }
}
