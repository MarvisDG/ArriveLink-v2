import { NextResponse } from "next/server";
import { deleteOperator } from "@/lib/mock-db";
import { jsonError, requireAdmin } from "@/lib/api-helpers";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    deleteOperator(parseInt(id, 10));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Delete failed");
  }
}
