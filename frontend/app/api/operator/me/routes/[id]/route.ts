import { NextResponse } from "next/server";
import { deleteOperatorRoute, updateOperatorRoute } from "@/lib/mock-db";
import { jsonError, requireOperator } from "@/lib/api-helpers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, operator } = requireOperator(request);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const route = updateOperatorRoute(parseInt(id, 10), operator!.company_id, body);
    return NextResponse.json(route);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Failed to update route");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, operator } = requireOperator(request);
  if (error) return error;

  try {
    const { id } = await params;
    deleteOperatorRoute(parseInt(id, 10), operator!.company_id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Failed to delete route");
  }
}
